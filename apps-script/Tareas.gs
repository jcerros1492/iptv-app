/**
 * Tareas automáticas (se programan solas al correr instalar()):
 *   09:00  leer el tipo de cambio de venta del BCR
 *   09:15  alertas de cobro + pasar a exclientes (30 días) + aviso de Adobe
 *   13:00  volver a leer el tipo de cambio (por si el BCR lo ajustó en la mañana)
 *   Domingo 22:00  respaldo de la hoja en Google Drive
 * Estas tareas también mantienen la hoja con actividad todos los días.
 */

var URL_TC_BCCR = 'https://gee.bccr.fi.cr/indicadoreseconomicos/Cuadros/frmConsultaTCVentanilla.aspx';
var URL_TC_HACIENDA = 'https://api.hacienda.go.cr/indicadores/tc/dolar';
var AJUSTE_TC_INICIAL = 8;   // se usa solo la primera vez; luego manda la hoja Config

var NAVEGADOR_ = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CR,es;q=0.9'
};

function leerVentanillaBCR_() {
  var r = UrlFetchApp.fetch(URL_TC_BCCR, { muteHttpExceptions: true, followRedirects: true, headers: NAVEGADOR_ });
  if (r.getResponseCode() !== 200) throw new Error('Respuesta ' + r.getResponseCode());
  var html = r.getContentText();
  var i = html.indexOf('Banco de Costa Rica');
  if (i < 0) throw new Error('No se encontró "Banco de Costa Rica" en la página');
  var tramo = html.slice(i, i + 1500).replace(/<[^>]+>/g, ' ');
  var numeros = tramo.match(/\d{3}[.,]\d{2}/g);
  if (!numeros || numeros.length < 2) throw new Error('No se encontraron los montos');
  var v = Number(numeros[1].replace(',', '.'));          // [0] = compra, [1] = venta
  if (!(v > 300 && v < 1000)) throw new Error('Monto fuera de rango: ' + v);
  return v;
}

function leerReferenciaHacienda_() {
  var r = UrlFetchApp.fetch(URL_TC_HACIENDA, { muteHttpExceptions: true, followRedirects: true, headers: NAVEGADOR_ });
  if (r.getResponseCode() !== 200) throw new Error('Respuesta ' + r.getResponseCode());
  var j = JSON.parse(r.getContentText());
  var d = j.dolar || j;
  var v = Number(d.venta && (d.venta.valor != null ? d.venta.valor : d.venta));
  if (!(v > 300 && v < 1000)) throw new Error('Monto fuera de rango: ' + v);
  return Math.round(v * 100) / 100;
}

/**
 * Diferencia que se suma al tipo de cambio de referencia del BCCR para acercarlo
 * a la venta del BCR. Se cambia en la hoja Config, clave "ajuste_tc_referencia".
 */
function ajusteReferencia_() {
  var fila = leerTabla_('Config').filter(function (f) { return f.Clave === 'ajuste_tc_referencia'; })[0];
  if (!fila) {
    agregarFila_('Config', { Clave: 'ajuste_tc_referencia', Valor: AJUSTE_TC_INICIAL,
      Nota: 'Colones que se suman al tipo de cambio de referencia del BCCR para igualar la venta del BCR' });
    return AJUSTE_TC_INICIAL;
  }
  var n = Number(String(fila.Valor).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** Para probar a mano desde el editor: muestra qué lee cada fuente. */
function probarTipoCambio() {
  try { Logger.log('BCR ventanilla: ' + leerVentanillaBCR_()); } catch (e) { Logger.log('BCR ventanilla falló: ' + e.message); }
  try { var ref = leerReferenciaHacienda_(), aj = ajusteReferencia_();
        Logger.log('BCCR referencia (Hacienda): ' + ref + ' + ajuste ' + aj + ' = ' + Math.round((ref + aj) * 100) / 100); } catch (e) { Logger.log('Hacienda falló: ' + e.message); }
}


/* ============ Tipo de cambio del BCR ============ */

/**
 * Lee el tipo de cambio de venta del Banco de Costa Rica desde la lista pública
 * de tipos de cambio de ventanilla del Banco Central (no requiere registro).
 * Si no lo logra, deja el último que se guardó y avisa.
 */
function leerTipoCambioBCR() {
  var hoy = hoy_();
  var venta = null, fuente = '', errores = [];

  // Si hoy ya alguien lo puso a mano en la app, se respeta y no se toca.
  var manualHoy = leerTabla_('TipoCambio').some(function (f) {
    return f.Fecha === hoy && String(f.Fuente).indexOf('Manual') === 0;
  });
  if (manualHoy) return null;

  // 1) Ventanilla del BCR en la página del BCCR (hasta 3 intentos)
  for (var intento = 1; intento <= 3 && !venta; intento++) {
    try {
      venta = leerVentanillaBCR_();
      fuente = 'BCR';
    } catch (e) {
      errores.push('BCR intento ' + intento + ': ' + (e.message || e));
      if (intento < 3) Utilities.sleep(4000);
    }
  }
  // 2) Respaldo: tipo de cambio de referencia del BCCR publicado por Hacienda
  if (!venta) {
    try {
      var ref = leerReferenciaHacienda_();
      var ajuste = ajusteReferencia_();
      venta = Math.round((ref + ajuste) * 100) / 100;
      fuente = 'BCCR ref. ' + ref + (ajuste >= 0 ? ' + ' : ' - ') + Math.abs(ajuste);
    } catch (e) {
      errores.push('Hacienda: ' + (e.message || e));
    }
  }
  var error = errores.join(' | ');

  var filas = leerTabla_('TipoCambio');
  var deHoy = filas.filter(function (f) { return f.Fecha === hoy && String(f.Fuente).indexOf('Manual') < 0; });
  if (venta) {
    if (deHoy.length) {
      actualizarFila_('TipoCambio', 'Fecha', hoy, { Venta: venta, Fuente: fuente + ' ' + Utilities.formatDate(new Date(), ZONA, 'HH:mm') });
    } else {
      agregarFila_('TipoCambio', { Fecha: hoy, Venta: venta, Fuente: fuente + ' ' + Utilities.formatDate(new Date(), ZONA, 'HH:mm') });
    }
  } else {
    registrarNotificacion_('Sistema', 'No se pudo leer el tipo de cambio del BCR: ' + error, 'error');
    var dia = Number(Utilities.formatDate(new Date(), ZONA, 'u')); // 1 = lunes ... 7 = domingo
    if (dia <= 5) notificar_('Tipo de cambio', 'Hoy no se pudo leer el tipo de cambio del BCR. Se usa el último guardado; pueden corregirlo en la app.', '#/inicio');
  }
  return venta;
}

/* ============ Tarea de la mañana ============ */

function tareaManana() {
  var hoy = hoy_();
  // 1. Pasar a exclientes a quien lleva más de 30 días vencido
  var candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    var db = cargarDb_();
    var config = leerConfig(db.config);
    var ex = accionExclientes(db, config, hoy);
    guardarCambios_(ex.cambios);
  } finally {
    candado.releaseLock();
  }

  // 2. Avisos de vencimiento: 3 días antes, el día que vence y 1 día después
  db = cargarDb_();
  config = leerConfig(db.config);
  var lista = prepararClientes(db, hoy);
  var avisos = [];
  lista.forEach(function (c) {
    if (c.estado === 'Excliente' || c.estado === 'Revendedor' || c.dias === null) return;
    if (c.dias === 3) avisos.push(c.usuario + ' vence en 3 días (' + fechaCorta(c.vence) + ')');
    else if (c.dias === 0) avisos.push(c.usuario + ' vence hoy');
    else if (c.dias === -1) avisos.push(c.usuario + ' venció ayer y no ha renovado');
    else if (c.dias < -1 && c.respuesta === 'Sin respuesta') avisos.push(c.usuario + ' no ha respondido (vencido)');
  });
  if (avisos.length === 1) {
    notificar_('Cobro', avisos[0] + '. Toque para enviarle el mensaje.', '#/alertas');
  } else if (avisos.length > 1) {
    notificar_(avisos.length + ' cobros para hoy', avisos.join(' · '), '#/alertas');
  }

  // 3. Aviso del pago de Adobe
  if (config.adobe_proximo && diasEntre(hoy, config.adobe_proximo) === 0) {
    notificar_('Gasto fijo', 'Hoy toca el pago de Adobe (aprox. ' + colones(numero(config.adobe_monto)) + '). Confírmenlo en la app.', '#/finanzas');
  }
}

/* ============ Respaldo semanal ============ */

function respaldoSemanal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var carpetaId = prop_('CARPETA_RESPALDO');
  var carpeta;
  try { carpeta = DriveApp.getFolderById(carpetaId); } catch (e) { carpeta = null; }
  if (!carpeta) {
    carpeta = DriveApp.createFolder('IPTV · Respaldos');
    PropertiesService.getScriptProperties().setProperty('CARPETA_RESPALDO', carpeta.getId());
    var config = leerConfig(leerTabla_('Config'));
    try { carpeta.addEditor(config.correo_fernando); } catch (e) { }
  }
  var nombre = 'Respaldo IPTV ' + Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd');
  DriveApp.getFileById(ss.getId()).makeCopy(nombre, carpeta);
  // Se guardan los últimos 12 respaldos
  var archivos = [], it = carpeta.getFiles();
  while (it.hasNext()) archivos.push(it.next());
  archivos.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  archivos.slice(12).forEach(function (f) { f.setTrashed(true); });
}

/* ============ Notificaciones al celular (OneSignal) ============ */

function notificar_(titulo, texto, ruta) {
  var appId = prop_('ONESIGNAL_APP_ID'), key = prop_('ONESIGNAL_API_KEY');
  var config = leerConfig(leerTabla_('Config'));
  var para = [String(config.correo_jonathan).toLowerCase(), String(config.correo_fernando).toLowerCase()];
  if (!appId || !key) {
    registrarNotificacion_(para.join(', '), titulo + ': ' + texto, 'sin configurar');
    return;
  }
  var cuerpo = {
    app_id: appId,
    target_channel: 'push',
    include_aliases: { external_id: para },
    headings: { en: titulo, es: titulo },
    contents: { en: texto, es: texto }
  };
  var url = prop_('APP_URL');
  if (url) cuerpo.url = url + (ruta || '');
  var r = UrlFetchApp.fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Key ' + key }, payload: JSON.stringify(cuerpo)
  });
  registrarNotificacion_(para.join(', '), titulo + ': ' + texto, r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
}

function registrarNotificacion_(para, texto, resultado) {
  try {
    var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notificaciones');
    if (h) h.appendRow([new Date(), para, texto, resultado]);
  } catch (e) { }
}

/** Para probar las notificaciones desde el editor de Apps Script. */
function probarNotificacion() {
  notificar_('Prueba', 'Si ve este mensaje, las notificaciones funcionan.', '#/inicio');
}
