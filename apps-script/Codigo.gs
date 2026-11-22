/**
 * App IPTV · Motor en Google Apps Script
 * ---------------------------------------
 * Recibe las peticiones de la app, revisa que sea Jonathan o Fernando,
 * lee y guarda en esta hoja de Google Sheets, y devuelve los datos.
 *
 * Archivos de este proyecto:
 *   Codigo.gs    -> este archivo: entrada de la app, permisos, lectura y escritura
 *   Logica.gs    -> los cálculos del negocio (el mismo archivo que usa la app web)
 *   Tareas.gs    -> tareas automáticas: tipo de cambio, alertas, exclientes, respaldo
 *   Instalar.gs  -> se corre UNA vez para dejar todo listo
 *
 * Datos privados (NUNCA en la hoja ni en GitHub) van en
 * Configuración del proyecto > Propiedades del script:
 *   CLIENT_ID          -> ID de cliente de Google (para el inicio de sesión)
 *   CLAVE_CIFRADO      -> se crea sola al correr instalar()
 *   ONESIGNAL_APP_ID   -> (opcional) notificaciones
 *   ONESIGNAL_API_KEY  -> (opcional) notificaciones
 *   APP_URL            -> dirección de la app en GitHub Pages
 */

var ZONA = 'America/Costa_Rica';
var ESTADO_NUEVO_ = null;
var SESION_NUEVA_ = null;
var COLUMNAS_FECHA = { 'Fecha': 1, 'Vence': 1, 'Vence nuevo': 1, 'Fecha respuesta': 1, 'Creado': 1 };
var TABLAS = {
  clientes: 'Clientes', cobros: 'Cobros', movimientos: 'Movimientos', config: 'Config',
  controles: 'Controles', tipocambio: 'TipoCambio', accesos: 'Accesos'
};

/* ============ Entrada de la app ============ */

function doGet() {
  return json_({ ok: true, app: 'IPTV', version: LOGICA_VERSION });
}

function doPost(e) {
  try {
    ESTADO_NUEVO_ = null; SESION_NUEVA_ = null;
    var req = JSON.parse(e.postData.contents);
    var correo = verificarUsuario_(req.token);
    var datos = ejecutar_(req.accion, req.datos || {}, correo);
    var resp = { ok: true, datos: datos };
    if (ESTADO_NUEVO_) resp.estado = ESTADO_NUEVO_;   // la app ya no tiene que pedir todo otra vez
    if (SESION_NUEVA_) resp.sesion = SESION_NUEVA_;
    return json_(resp);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function hoy_() {
  return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd');
}

function prop_(nombre) {
  return PropertiesService.getScriptProperties().getProperty(nombre);
}

/* ============ Permisos: solo Jonathan y Fernando ============ */

/*
 * Sesión larga: la primera vez se entra con Google; el motor entrega una "llave de sesión"
 * propia, firmada, que dura DIAS_SESION días y se renueva sola con el uso.
 * El celular igual queda protegido con Face ID / huella / PIN.
 * Para sacar a todos los celulares (por ejemplo si se pierde uno): en la hoja Config
 * ponga la clave "cerrar_sesiones_antes" con la fecha de hoy (AAAA-MM-DD).
 */
var DIAS_SESION = 180;

function firmaSesion_(texto) {
  var firma = Utilities.computeHmacSha256Signature(Utilities.newBlob('sesion|' + texto).getBytes(), claveBytes_());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '');
}

function crearSesion_(correo) {
  var ahora = Math.floor(Date.now() / 1000);
  var cuerpo = Utilities.base64EncodeWebSafe(JSON.stringify({ c: correo, i: ahora, e: ahora + DIAS_SESION * 86400 })).replace(/=+$/, '');
  return { token: 's1.' + cuerpo + '.' + firmaSesion_(cuerpo), exp: ahora + DIAS_SESION * 86400, emitida: ahora };
}

function verificarSesionPropia_(token) {
  var partes = token.split('.');
  if (partes.length !== 3 || firmaSesion_(partes[1]) !== partes[2]) throw new Error('Sesión vencida. Vuelva a entrar.');
  var d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[1] + '==='.slice((partes[1].length + 3) % 4))).getDataAsString());
  var ahora = Math.floor(Date.now() / 1000);
  if (!(d.e > ahora)) throw new Error('Sesión vencida. Vuelva a entrar.');
  var config = leerConfig(leerTabla_('Config'));
  var permitidos = [String(config.correo_jonathan).toLowerCase(), String(config.correo_fernando).toLowerCase()];
  if (permitidos.indexOf(d.c) < 0) throw new Error('Sesión vencida. Vuelva a entrar.');
  var corte = config.cerrar_sesiones_antes ? String(config.cerrar_sesiones_antes).slice(0, 10) : '';
  if (corte) {
    var emitida = Utilities.formatDate(new Date(d.i * 1000), ZONA, 'yyyy-MM-dd');
    if (emitida <= corte) throw new Error('Sesión vencida. Vuelva a entrar.');
  }
  // Renovar sola si ya tiene más de 7 días
  if (ahora - d.i > 7 * 86400) SESION_NUEVA_ = crearSesion_(d.c);
  return d.c;
}

function verificarUsuario_(token) {
  if (!token) throw new Error('Debe iniciar sesión.');
  if (token.indexOf('s1.') === 0) return verificarSesionPropia_(token);
  var cache = CacheService.getScriptCache();
  var llave = 'tk_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  var guardado = cache.get(llave);
  if (guardado) { SESION_NUEVA_ = crearSesion_(guardado); return guardado; }

  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Sesión vencida. Vuelva a entrar.');
  var info = JSON.parse(r.getContentText());
  var clientId = prop_('CLIENT_ID');
  if (!clientId || info.aud !== clientId) throw new Error('Inicio de sesión no válido para esta app.');
  if (String(info.email_verified) !== 'true') throw new Error('Correo no verificado.');

  var correo = String(info.email).toLowerCase();
  var config = leerConfig(leerTabla_('Config'));
  var permitidos = [String(config.correo_jonathan).toLowerCase(), String(config.correo_fernando).toLowerCase()];
  if (permitidos.indexOf(correo) < 0) {
    registrarAcceso_('Desconocido', 'Acceso rechazado', correo);
    throw new Error('Esta cuenta no tiene acceso a la app.');
  }
  var segundos = Math.max(60, Math.min(3000, Number(info.exp) - Math.floor(Date.now() / 1000) - 60));
  cache.put(llave, correo, segundos);
  SESION_NUEVA_ = crearSesion_(correo);   // cambiar la llave de Google por la sesión larga
  return correo;
}

/* ============ Acciones ============ */

var CORREO_ACTUAL_ = '';
function ejecutar_(accion, datos, correo) {
  var hoy = hoy_();
  CORREO_ACTUAL_ = correo;
  switch (accion) {
    case 'entrar':
      registrarAcceso_(nombreSocio(leerConfig(leerTabla_('Config')), correo), 'Entró', 'Nuevo inicio de sesión');
      return { ok: true };
    case 'estado': {
      var db = cargarDb_();
      var config = leerConfig(db.config);
      return armarEstado(db, config, hoy, correo, tipoCambioActual_(db, config));
    }
    case 'guardarCobro':
      return conCandado_(function (db, config) {
        return accionGuardarCobro(db, config, datos, hoy, correo, tipoCambioActual_(db, config));
      });
    case 'guardarCliente':
      return conCandado_(function (db, config) { return accionGuardarCliente(db, config, datos, hoy, correo); });
    case 'pagarDeuda':
      return conCandado_(function (db, config) { return accionPagarDeuda(db, config, datos, hoy, correo); });
    case 'reactivar':
      return conCandado_(function (db, config) { return accionReactivar(db, config, datos, hoy, correo); });
    case 'respuesta':
      return conCandado_(function (db, config) { return accionRespuesta(db, config, datos, hoy, correo); });
    case 'guardarControl':
      return conCandado_(function (db, config) { return accionGuardarControl(db, config, datos, hoy, correo); });
    case 'verContrasena':
      return verContrasena_(datos.usuario, correo);
    case 'tipoCambioManual': {
      var venta = numero(datos.venta);
      if (!(venta > 300 && venta < 1000)) throw new Error('Tipo de cambio no válido.');
      var config2 = leerConfig(leerTabla_('Config'));
      agregarFila_('TipoCambio', { Fecha: hoy, Venta: venta, Fuente: 'Manual (' + nombreSocio(config2, correo) + ')' });
      return { ok: true, venta: venta };
    }
    default:
      throw new Error('Acción desconocida: ' + accion);
  }
}

/**
 * El "candado": solo una persona guarda a la vez.
 * Si Jonathan y Fernando guardan al mismo tiempo, el segundo espera
 * una fracción de segundo y luego se guarda. No se pierde nada.
 */
function conCandado_(fn) {
  var candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    var db = cargarDb_();
    var config = leerConfig(db.config);
    var res = fn(db, config);
    guardarCambios_(res.cambios || []);
    SpreadsheetApp.flush();
    // Armar de una vez el estado actualizado (sin volver a leer la hoja)
    try {
      aplicarCambiosEnMemoria(db, res.cambios || []);
      var cfg = leerConfig(db.config);
      ESTADO_NUEVO_ = armarEstado(db, cfg, hoy_(), CORREO_ACTUAL_, tipoCambioActual_(db, cfg));
    } catch (e) { ESTADO_NUEVO_ = null; }
    return res.resultado;
  } finally {
    candado.releaseLock();
  }
}

function verContrasena_(usuario, correo) {
  var filas = leerTabla_('Clientes');
  var cli = null;
  filas.forEach(function (f) { if (f.Usuario === usuario) cli = f; });
  if (!cli) throw new Error('Cliente no encontrado.');
  var config = leerConfig(leerTabla_('Config'));
  registrarAcceso_(nombreSocio(config, correo), 'Vio contraseña', usuario);
  return { usuario: usuario, contrasena: descifrar_(cli['Contraseña']) };
}

function registrarAcceso_(quien, accion, detalle) {
  try { agregarFila_('Accesos', { Fecha: hoy_(), Usuario: quien, 'Acción': accion, Detalle: detalle }); } catch (e) { }
}

/* ============ Lectura y escritura en la hoja ============ */

function hoja_(nombre) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!h) throw new Error('Falta la pestaña "' + nombre + '" en la hoja.');
  return h;
}

function aTexto_(v, encabezado) {
  if (v instanceof Date) return Utilities.formatDate(v, ZONA, 'yyyy-MM-dd');
  if (COLUMNAS_FECHA[encabezado] && typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    var p = v.split('/'); return p[2] + '-' + p[1] + '-' + p[0];
  }
  return v;
}

function leerTabla_(nombre) {
  var valores = hoja_(nombre).getDataRange().getValues();
  if (valores.length < 1) return [];
  var enc = valores[0];
  var out = [];
  for (var i = 1; i < valores.length; i++) {
    var fila = valores[i], vacia = true, o = { _fila: i + 1 };
    for (var j = 0; j < enc.length; j++) {
      if (!enc[j]) continue;
      var v = aTexto_(fila[j], enc[j]);
      if (v !== '' && v !== null) vacia = false;
      o[enc[j]] = v;
    }
    if (!vacia) out.push(o);
  }
  return out;
}

function cargarDb_() {
  var db = {};
  for (var k in TABLAS) if (k !== 'accesos') db[k] = leerTabla_(TABLAS[k]);
  db.accesos = [];
  return db;
}

function aCelda_(v, encabezado) {
  if (COLUMNAS_FECHA[encabezado] && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    var p = v.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  return v === undefined || v === null ? '' : v;
}

function agregarFila_(nombre, obj) {
  var h = hoja_(nombre);
  var enc = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  var fila = enc.map(function (e) { return aCelda_(obj[e], e); });
  h.appendRow(fila);
}

function guardarCambios_(cambios) {
  cambios.forEach(function (c) {
    var fila = {};
    for (var k in c.fila) fila[k] = c.fila[k];
    if (c.contrasena) fila['Contraseña'] = cifrar_(c.contrasena);
    if (c.op === 'agregar') {
      agregarFila_(c.tabla, fila);
    } else if (c.op === 'actualizar') {
      actualizarFila_(c.tabla, c.clave, c.valor, fila);
    }
  });
}

function actualizarFila_(nombre, clave, valor, obj) {
  var h = hoja_(nombre);
  var datos = h.getDataRange().getValues();
  var enc = datos[0];
  var col = enc.indexOf(clave);
  for (var i = 1; i < datos.length; i++) {
    if (String(aTexto_(datos[i][col], clave)) === String(valor)) {
      for (var k in obj) {
        var j = enc.indexOf(k);
        if (j >= 0) h.getRange(i + 1, j + 1).setValue(aCelda_(obj[k], k));
      }
      return;
    }
  }
  if (nombre === 'Config') agregarFila_('Config', { Clave: valor, Valor: obj.Valor, Nota: '' });
}

/* ============ Tipo de cambio guardado ============ */

function tipoCambioActual_(db, config) {
  var filas = (db.tipocambio || []).slice().sort(function (a, b) { return a.Fecha < b.Fecha ? -1 : 1; });
  var ultimo = filas[filas.length - 1];
  return ultimo ? numero(ultimo.Venta) : numero(config.tipo_cambio_respaldo);
}

/* ============ Cifrado de contraseñas ============ */
/*
 * Las contraseñas se guardan en la hoja como "enc:...", que no se puede leer
 * sin la CLAVE_CIFRADO (guardada aparte, en las Propiedades del script).
 */

function claveBytes_() {
  var k = prop_('CLAVE_CIFRADO');
  if (!k) throw new Error('Falta CLAVE_CIFRADO: corra instalar() primero.');
  return Utilities.base64Decode(k);
}

function flujo_(clave, iv, largo) {
  var out = [];
  for (var bloque = 0; out.length < largo; bloque++) {
    var firma = Utilities.computeHmacSha256Signature(iv.concat([bloque]), clave);
    out = out.concat(firma);
  }
  return out.slice(0, largo);
}

function sello_(clave, datos) {
  var claveSello = Utilities.computeHmacSha256Signature(Utilities.newBlob('sello').getBytes(), clave);
  return Utilities.computeHmacSha256Signature(datos, claveSello).slice(0, 16);
}

function cifrar_(texto) {
  if (texto === null || texto === undefined || texto === '') return '';
  texto = String(texto);
  if (texto.indexOf('enc:') === 0) return texto;
  var clave = claveBytes_();
  var iv = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now()).slice(0, 16);
  var claro = Utilities.newBlob(texto).getBytes();
  var f = flujo_(clave, iv, claro.length);
  var cifrado = claro.map(function (b, i) { return b ^ f[i]; });
  var cuerpo = iv.concat(cifrado);
  return 'enc:' + Utilities.base64Encode(cuerpo.concat(sello_(clave, cuerpo)));
}

function descifrar_(texto) {
  if (!texto) return '';
  texto = String(texto);
  if (texto.indexOf('enc:') !== 0) return texto;
  var clave = claveBytes_();
  var todo = Utilities.base64Decode(texto.slice(4));
  var cuerpo = todo.slice(0, todo.length - 16), selloGuardado = todo.slice(todo.length - 16);
  var selloCalc = sello_(clave, cuerpo);
  for (var i = 0; i < 16; i++) if (selloCalc[i] !== selloGuardado[i]) throw new Error('La contraseña guardada está dañada.');
  var iv = cuerpo.slice(0, 16), cifrado = cuerpo.slice(16);
  var f = flujo_(clave, iv, cifrado.length);
  return Utilities.newBlob(cifrado.map(function (b, i) { return b ^ f[i]; })).getDataAsString();
}
