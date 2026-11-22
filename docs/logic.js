/*
 * Lógica del negocio de la App IPTV.
 * Este mismo archivo se usa en dos lugares:
 *   - En Google Apps Script (copiado como Logica.gs).
 *   - En la app web (modo demo y cálculos en pantalla).
 * No usa nada propio de Google ni del navegador: solo cálculos.
 * Las fechas se manejan siempre como texto 'AAAA-MM-DD'.
 */

var LOGICA_VERSION = '1.0';

/* ---------------- Fechas ---------------- */

function fechaAObjeto_(f) {
  var p = String(f).slice(0, 10).split('-');
  return { a: +p[0], m: +p[1], d: +p[2] };
}

function objetoAFecha_(o) {
  return o.a + '-' + (o.m < 10 ? '0' : '') + o.m + '-' + (o.d < 10 ? '0' : '') + o.d;
}

function diasDelMes_(a, m) {
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** Suma meses respetando el día (31 ene + 1 mes = 28/29 feb). */
function sumarMeses(fecha, meses) {
  var o = fechaAObjeto_(fecha);
  var total = o.m - 1 + meses;
  var a = o.a + Math.floor(total / 12);
  var m = (total % 12 + 12) % 12 + 1;
  var d = Math.min(o.d, diasDelMes_(a, m));
  return objetoAFecha_({ a: a, m: m, d: d });
}

function sumarDias(fecha, dias) {
  var o = fechaAObjeto_(fecha);
  var t = Date.UTC(o.a, o.m - 1, o.d) + dias * 86400000;
  var x = new Date(t);
  return objetoAFecha_({ a: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() });
}

/** Días desde 'desde' hasta 'hasta' (positivo si 'hasta' es después). */
function diasEntre(desde, hasta) {
  var a = fechaAObjeto_(desde), b = fechaAObjeto_(hasta);
  return Math.round((Date.UTC(b.a, b.m - 1, b.d) - Date.UTC(a.a, a.m - 1, a.d)) / 86400000);
}

function fechaCorta(fecha) {
  if (!fecha) return '';
  var o = fechaAObjeto_(fecha);
  return (o.d < 10 ? '0' : '') + o.d + '/' + (o.m < 10 ? '0' : '') + o.m + '/' + o.a;
}

/* ---------------- Dinero ---------------- */

function redondear(colones, paso) {
  paso = paso || 50;
  return Math.round(colones / paso) * paso;
}

function colones(n) {
  var neg = n < 0;
  var s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + '₡' + s;
}

function numero(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || v === '') return 0;
  var n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/* ---------------- Configuración ---------------- */

var CONFIG_POR_DEFECTO = {
  precio_1: 12, precio_2: 13, precio_3: 15, precio_5: 20,
  costo_credito: 3.5,
  tolerancia: 1000,
  redondeo: 50,
  dias_excliente: 30,
  dias_reaviso: 3,
  tipo_cambio_respaldo: 455,
  regalia_3: 1, regalia_6: 2, regalia_12: 3,
  telefono_jonathan: '8669-1599',
  telefono_fernando: '6049-4516',
  correo_jonathan: 'jonacerros@gmail.com',
  correo_fernando: 'fval85@gmail.com',
  ultimo_comprobante: 0,
  adobe_proximo: '2027-01-18',
  adobe_monto: 9155.42,
  adobe_cada_meses: 2
};

function leerConfig(filas) {
  var c = {};
  for (var k in CONFIG_POR_DEFECTO) c[k] = CONFIG_POR_DEFECTO[k];
  (filas || []).forEach(function (f) {
    if (!f.Clave) return;
    var v = f.Valor;
    c[f.Clave] = (typeof CONFIG_POR_DEFECTO[f.Clave] === 'number') ? numero(v) : v;
  });
  return c;
}

function precioUSD(config, dispositivos) {
  return numero(config['precio_' + dispositivos]);
}

function creditosPorMes(dispositivos) {
  return Number(dispositivos) === 5 ? 2 : 1;
}

function regaliaDe(config, meses) {
  return numero(config['regalia_' + meses]) || 0;
}

/* ---------------- Clientes ---------------- */

/** Nombre del socio según su correo. */
function nombreSocio(config, correo) {
  correo = String(correo || '').toLowerCase();
  if (correo === String(config.correo_jonathan).toLowerCase()) return 'Jonathan';
  if (correo === String(config.correo_fernando).toLowerCase()) return 'Fernando';
  return correo;
}

/**
 * Estado que se muestra en la app:
 * Revendedor | Excliente | Vencido | Por vencer | Activo
 */
function estadoVisible(cliente, hoy) {
  if (cliente.Estado === 'Revendedor') return 'Revendedor';
  if (cliente.Estado === 'Excliente') return 'Excliente';
  if (!cliente.Vence) return 'Activo';
  var dias = diasEntre(hoy, cliente.Vence);
  if (dias < 0) return 'Vencido';
  if (dias <= 30) return 'Por vencer';
  return 'Activo';
}

/** Lista de clientes con datos calculados (sin contraseñas). */
function prepararClientes(db, hoy) {
  var deudas = {}, pagado = {}, ultimo = {};
  db.cobros.forEach(function (c) {
    var u = c.Usuario;
    if (c.Estado === 'Pendiente') deudas[u] = (deudas[u] || 0) + numero(c.Monto);
    if (c.Estado === 'Pagado') {
      pagado[u] = (pagado[u] || 0) + numero(c.Monto);
      if (c.Tipo !== 'Venta a revendedor' && (!ultimo[u] || c.Fecha > ultimo[u])) ultimo[u] = c.Fecha;
    }
  });
  return db.clientes.map(function (c) {
    var est = estadoVisible(c, hoy);
    return {
      usuario: c.Usuario,
      nombre: c.Nombre || '',
      idPanel: c['ID panel'] || '',
      telefono: c['Teléfono'] || '',
      dispositivos: Number(c.Dispositivos) || 1,
      revendedor: c.Revendedor || '',
      vence: c.Vence || '',
      estado: est,
      dias: c.Vence ? diasEntre(hoy, c.Vence) : null,
      debe: deudas[c.Usuario] || 0,
      totalPagado: pagado[c.Usuario] || 0,
      ultimoPago: ultimo[c.Usuario] || '',
      tieneContrasena: !!c['Contraseña'],
      respuesta: c.Respuesta || '',
      fechaRespuesta: c['Fecha respuesta'] || '',
      nota: c.Nota || ''
    };
  });
}

/** Orden del Inicio: vencidos primero (el más antiguo arriba), luego por fecha. */
function ordenarPorVencimiento(lista) {
  return lista.slice().sort(function (a, b) {
    var va = a.vence || '9999-12-31', vb = b.vence || '9999-12-31';
    return va < vb ? -1 : va > vb ? 1 : a.usuario.localeCompare(b.usuario);
  });
}

/** Buscar por nombre, usuario o teléfono (sin importar mayúsculas ni tildes). */
function normalizar_(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function buscarClientes(lista, texto) {
  var q = normalizar_(texto).trim();
  if (!q) return lista;
  var qd = q.replace(/\D/g, '');
  return lista.filter(function (c) {
    return normalizar_(c.usuario).indexOf(q) >= 0 ||
      normalizar_(c.nombre).indexOf(q) >= 0 ||
      (qd.length >= 3 && String(c.telefono).replace(/\D/g, '').indexOf(qd) >= 0);
  });
}

/* ---------------- Cobros ---------------- */

/**
 * Calcula un cobro antes de guardarlo.
 * Si el cliente todavía no ha vencido, los meses se suman a su fecha actual.
 * Si ya venció, se cuentan desde hoy.
 */
function calcularCobro(config, p) {
  var disp = Number(p.dispositivos), meses = Number(p.meses);
  var tc = numero(p.tipoCambio) || numero(config.tipo_cambio_respaldo);
  var reg = regaliaDe(config, meses);
  var usd = precioUSD(config, disp) * meses;
  var esperado = redondear(usd * tc, numero(config.redondeo) || 50);
  var base = (p.venceActual && p.venceActual >= p.hoy) ? p.venceActual : p.hoy;
  return {
    dispositivos: disp,
    meses: meses,
    regalia: reg,
    mesesPanel: meses + reg,
    creditos: meses * creditosPorMes(disp),
    usd: usd,
    tipoCambio: tc,
    esperado: esperado,
    precioMes: redondear(precioUSD(config, disp) * tc, numero(config.redondeo) || 50),
    venceAntes: p.venceActual || '',
    venceNuevo: sumarMeses(base, meses + reg),
    yaVencido: !(p.venceActual && p.venceActual >= p.hoy)
  };
}

/** Diferencia entre lo pagado y lo esperado, según el margen de tolerancia. */
function evaluarPago(config, esperado, pagado) {
  var dif = pagado - esperado;
  var tol = numero(config.tolerancia);
  if (dif > 0) return { tipo: 'extra', diferencia: dif, nota: '+' + colones(dif) + ' extra' };
  if (dif === 0) return { tipo: 'exacto', diferencia: 0, nota: '' };
  if (-dif <= tol) return { tipo: 'redondeo', diferencia: dif, nota: 'Redondeo ' + colones(dif) };
  return { tipo: 'pendiente', diferencia: dif, nota: 'Quedó debiendo ' + colones(-dif) };
}

/* ---------------- Resumen del negocio ---------------- */

function resumen(db, config, tipoCambio) {
  var sobre = 0, comprados = 0, usados = 0, pendiente = 0, incobrable = 0, sinDepositar = 0;
  var ultimaCompra = '';
  db.cobros.forEach(function (c) {
    var m = numero(c.Monto);
    if (c.Estado === 'Pagado') {
      sobre += m;
      if (c['En sobre'] === 'No') sinDepositar += m;
    }
    if (c.Estado === 'Pendiente') pendiente += m;
    if (c.Estado === 'Incobrable') incobrable += m;
    usados += numero(c['Créditos']);
  });
  db.movimientos.forEach(function (m) {
    if (m['Afecta sobre'] !== 'No') sobre += numero(m.Monto);
    var cr = numero(m['Créditos']);
    comprados += cr;
    if (cr > 0 && m.Fecha > ultimaCompra) ultimaCompra = m.Fecha;
  });
  var usadosDesde = 0;
  db.cobros.forEach(function (c) {
    if (ultimaCompra && c.Fecha >= ultimaCompra) usadosDesde += numero(c['Créditos']);
  });
  var tc = numero(tipoCambio) || numero(config.tipo_cambio_respaldo);
  var reservaUSD = usadosDesde * numero(config.costo_credito);
  var reserva = Math.round(reservaUSD * tc * 100) / 100;
  var control = (db.controles || []).slice().sort(function (a, b) { return a.Fecha < b.Fecha ? 1 : -1; })[0] || null;
  sobre = Math.round(sobre * 100) / 100;
  return {
    sobre: sobre,
    sobreEnBanco: sobre - sinDepositar,
    sinDepositar: sinDepositar,
    creditosComprados: comprados,
    creditosUsados: usados,
    creditos: comprados - usados,
    pendiente: pendiente,
    incobrable: incobrable,
    ultimaCompra: ultimaCompra,
    usadosDesdeCompra: usadosDesde,
    reservaUSD: reservaUSD,
    reserva: reserva,
    disponible: Math.round((sobre - reserva) * 100) / 100,
    tipoCambio: tc,
    control: control ? {
      fecha: control.Fecha,
      sobreReal: numero(control['Sobre real']),
      creditosPanel: numero(control['Créditos panel']),
      difSobre: Math.round((numero(control['Sobre real']) - (sobre - sinDepositar)) * 100) / 100,
      difCreditos: numero(control['Créditos panel']) - (comprados - usados)
    } : null
  };
}

/* ---------------- Alertas ---------------- */

function alertas(db, config, hoy, lista) {
  var out = [];
  lista = lista || prepararClientes(db, hoy);
  lista.forEach(function (c) {
    if (c.estado === 'Excliente' || c.estado === 'Revendedor') return;
    // Si ya se anotó una respuesta, la alerta se calla unos días y luego vuelve a aparecer
    var esperar = numero(config.dias_reaviso) || 3;
    var callado = c.respuesta && c.respuesta !== 'No renueva' && c.fechaRespuesta && diasEntre(c.fechaRespuesta, hoy) < esperar;
    if (callado) {
      // no se muestra todavía
    } else if (c.estado === 'Vencido') {
      out.push({ tipo: 'Vencido', nivel: 'rojo', usuario: c.usuario,
        titulo: c.usuario + ' · vencido desde ' + fechaCorta(c.vence),
        detalle: c.respuesta === 'Sin respuesta' ? 'Sigue sin responder. Toque para volver a escribirle' :
          c.respuesta === 'Va a renovar' ? 'Dijo que iba a renovar. Toque para recordarle' : '¿Renueva? Toque para enviarle el mensaje' });
    } else if (c.dias !== null && c.dias <= 3) {
      out.push({ tipo: 'Por vencer', nivel: 'naranja', usuario: c.usuario,
        titulo: c.usuario + (c.dias === 0 ? ' vence hoy' : ' vence en ' + c.dias + (c.dias === 1 ? ' día' : ' días')),
        detalle: 'Mensaje de cobro listo para enviar' });
    }
    if (c.debe > 0) {
      out.push({ tipo: 'Cobro', nivel: 'rojo', usuario: c.usuario,
        titulo: c.usuario + ' debe ' + colones(c.debe), detalle: 'Cobros pendientes' });
    }
  });
  var r = resumen(db, config);
  if (r.sinDepositar > 0) {
    out.push({ tipo: 'Depósito', nivel: 'naranja', titulo: colones(r.sinDepositar) + ' sin depositar en el sobre',
      detalle: 'Cobros marcados como "no está en el sobre"' });
  }
  if (r.control && r.control.difCreditos !== 0) {
    out.push({ tipo: 'Créditos', nivel: 'naranja',
      titulo: Math.abs(r.control.difCreditos) + ' créditos de diferencia con el panel',
      detalle: 'Panel ' + r.control.creditosPanel + ' · app ' + r.creditos });
  }
  if (config.adobe_proximo) {
    var d = diasEntre(hoy, config.adobe_proximo);
    if (d <= 3) out.push({ tipo: 'Gasto fijo', nivel: 'azul', titulo: 'Pago de Adobe ' + (d < 0 ? 'atrasado' : d === 0 ? 'hoy' : 'en ' + d + ' días'),
      detalle: 'Aprox. ' + colones(numero(config.adobe_monto)) });
  }
  var orden = { rojo: 0, naranja: 1, azul: 2 };
  return out.sort(function (a, b) { return orden[a.nivel] - orden[b.nivel]; });
}

/* ---------------- Mensajes de WhatsApp ---------------- */

function telefonoWhatsApp(tel) {
  var d = String(tel || '').replace(/\D/g, '');
  if (d.length === 8) d = '506' + d;
  return d;
}

function mensajeCobro(config, cliente, tipoCambio, hoy) {
  var calc1 = calcularCobro(config, { dispositivos: cliente.dispositivos, meses: 1, tipoCambio: tipoCambio, hoy: hoy, venceActual: cliente.vence });
  var calc3 = calcularCobro(config, { dispositivos: cliente.dispositivos, meses: 3, tipoCambio: tipoCambio, hoy: hoy, venceActual: cliente.vence });
  var disp = cliente.dispositivos + (cliente.dispositivos === 1 ? ' dispositivo' : ' dispositivos');
  var cuando;
  if (cliente.dias === null) cuando = 'está por renovarse';
  else if (cliente.dias < 0) cuando = 'venció el ' + fechaCorta(cliente.vence);
  else if (cliente.dias === 0) cuando = 'vence hoy';
  else cuando = 'vence el ' + fechaCorta(cliente.vence);
  return 'Hola, buenos días. Le recordamos que su servicio de TV ' + cuando + '.\n' +
    '¿Desea renovarlo? El mes con ' + disp + ' es ' + colones(calc1.esperado) + '.\n' +
    'Si paga 3 meses (' + colones(calc3.esperado) + ') le regalamos 1 mes más.\n' +
    'Puede pagar por SINPE Móvil al ' + config.telefono_jonathan + ' o al ' + config.telefono_fernando + '.\n' +
    '¡Muchas gracias!';
}

function mensajeAcceso(usuario, contrasena) {
  return 'Hola, estos son sus datos de acceso:\nUsuario: ' + usuario + '\nContraseña: ' + contrasena;
}

/* ---------------- Acciones (compartidas por el servidor y el modo demo) ---------------- */
/*
 * Cada acción recibe la base de datos en memoria y devuelve:
 *   { resultado: ..., cambios: [ {tabla, op: 'agregar'|'actualizar', clave, valor, fila} ] }
 * El servidor guarda los cambios en Google Sheets; el modo demo los aplica en memoria.
 */

function nuevoId_(prefijo, hoy, lista) {
  return prefijo + '-' + hoy.replace(/-/g, '') + '-' + (lista.length + 1);
}

function accionGuardarCobro(db, config, p, hoy, correo, tipoCambio) {
  var cli = null;
  db.clientes.forEach(function (c) { if (c.Usuario === p.usuario) cli = c; });
  if (!cli) throw new Error('No existe el cliente ' + p.usuario);
  var socio = nombreSocio(config, correo);
  var calc = calcularCobro(config, {
    dispositivos: p.dispositivos || cli.Dispositivos, meses: p.meses,
    tipoCambio: p.tipoCambio || tipoCambio, hoy: hoy, venceActual: cli.Vence
  });
  var pagado = (p.monto === undefined || p.monto === null || p.monto === '') ? calc.esperado : numero(p.monto);
  var estado = p.estado || 'Pagado';
  var cambios = [];
  var numComp = numero(config.ultimo_comprobante) + 1;
  var notas = [];
  var ev = evaluarPago(config, calc.esperado, pagado);
  if (estado === 'Pagado' && ev.nota) notas.push(ev.nota);
  if (Number(calc.dispositivos) !== Number(cli.Dispositivos)) notas.push('Cambió de ' + cli.Dispositivos + ' a ' + calc.dispositivos + ' dispositivos');
  if (p.nota) notas.push(p.nota);

  // Otro cobro del mismo cliente hoy: puede ser el mismo pago registrado por el otro socio
  var previo = db.cobros.filter(function (c) {
    return c.Usuario === p.usuario && c.Fecha === hoy && c.Estado === 'Pagado' && numero(c.Meses) > 0;
  })[0];
  if (previo && !p.confirmarDuplicado) {
    return { resultado: { duplicado: true, mensaje: (previo['Cobró'] || 'Alguien') + ' ya registró hoy un cobro de ' + p.usuario +
      ' por ' + colones(numero(previo.Monto)) + '. ¿Es otro pago o es el mismo?' }, cambios: [] };
  }

  var fila = {
    ID: nuevoId_('C', hoy, db.cobros), Fecha: hoy, Usuario: p.usuario, Tipo: 'Cobro a cliente',
    Dispositivos: calc.dispositivos, Meses: calc.meses, 'Regalía': calc.regalia, 'Créditos': p.enPanel === false ? 0 : calc.creditos,
    Monto: estado === 'Pagado' ? pagado : calc.esperado, Estado: estado,
    'Forma de pago': p.forma || 'SINPE', 'Cobró': socio, 'Tipo de cambio': calc.tipoCambio,
    Esperado: calc.esperado, 'Vence nuevo': calc.venceNuevo,
    'En sobre': (estado === 'Pagado' && p.enSobre === false) ? 'No' : 'Sí',
    Comprobante: estado === 'Pagado' ? numComp : '', Nota: notas.join(' · ')
  };
  cambios.push({ tabla: 'Cobros', op: 'agregar', fila: fila });
  if (estado === 'Pagado' && ev.tipo === 'pendiente') {
    cambios.push({ tabla: 'Cobros', op: 'agregar', fila: {
      ID: nuevoId_('C', hoy, db.cobros) + 'b', Fecha: hoy, Usuario: p.usuario, Tipo: 'Cobro a cliente',
      Dispositivos: calc.dispositivos, Meses: 0, 'Regalía': 0, 'Créditos': 0, Monto: -ev.diferencia, Estado: 'Pendiente',
      'Forma de pago': '', 'Cobró': socio, 'Tipo de cambio': calc.tipoCambio, Esperado: '', 'Vence nuevo': '',
      'En sobre': 'Sí', Comprobante: '', Nota: 'Diferencia del cobro ' + fila.ID } });
  }
  cambios.push({ tabla: 'Clientes', op: 'actualizar', clave: 'Usuario', valor: p.usuario, fila: {
    Vence: calc.venceNuevo, Dispositivos: calc.dispositivos, Estado: cli.Estado === 'Revendedor' ? 'Revendedor' : 'Activo',
    Respuesta: '', 'Fecha respuesta': '' } });
  if (estado === 'Pagado') cambios.push({ tabla: 'Config', op: 'actualizar', clave: 'Clave', valor: 'ultimo_comprobante', fila: { Valor: numComp } });
  cambios.push({ tabla: 'Accesos', op: 'agregar', fila: { Fecha: hoy, Usuario: socio, 'Acción': 'Cobro', Detalle: p.usuario + ' ' + colones(fila.Monto) + ' ' + estado } });

  return {
    resultado: {
      ok: true,
      comprobante: estado === 'Pagado' ? {
        numero: numComp, fecha: hoy, usuario: p.usuario, dispositivos: calc.dispositivos,
        meses: calc.meses, regalia: calc.regalia, vence: calc.venceNuevo, monto: pagado,
        forma: fila['Forma de pago'], recibio: socio, telefono: cli['Teléfono'] || '',
        telefonos: { jonathan: config.telefono_jonathan, fernando: config.telefono_fernando }
      } : null,
      evaluacion: ev
    },
    cambios: cambios
  };
}

function accionGuardarCliente(db, config, p, hoy, correo) {
  var usuario = String(p.usuario || '').trim();
  if (!usuario) throw new Error('Falta el usuario');
  var socio = nombreSocio(config, correo);
  var existente = null;
  db.clientes.forEach(function (c) { if (normalizar_(c.Usuario) === normalizar_(usuario)) existente = c; });
  var datos = {
    Nombre: p.nombre || '', 'ID panel': p.idPanel || '', 'Teléfono': p.telefono || '',
    Dispositivos: Number(p.dispositivos) || 1, Nota: p.como ? 'Nos conoció: ' + p.como : ''
  };
  var cambios = [];
  if (existente) {
    if (existente.Estado !== 'Excliente' && !p.editar) {
      return { resultado: { existe: true, mensaje: usuario + ' ya está registrado.' }, cambios: [] };
    }
    datos.Estado = existente.Estado === 'Revendedor' ? 'Revendedor' : 'Activo';
    cambios.push({ tabla: 'Clientes', op: 'actualizar', clave: 'Usuario', valor: existente.Usuario, fila: datos, contrasena: p.contrasena || null });
  } else {
    datos.Usuario = usuario; datos.Revendedor = 'FValenciano (directo)'; datos.Vence = ''; datos.Estado = 'Activo';
    datos.Creado = hoy; datos['Contraseña'] = '';
    cambios.push({ tabla: 'Clientes', op: 'agregar', fila: datos, contrasena: p.contrasena || null });
  }
  cambios.push({ tabla: 'Accesos', op: 'agregar', fila: { Fecha: hoy, Usuario: socio, 'Acción': existente ? 'Reactivó cliente' : 'Nuevo cliente', Detalle: usuario } });
  return { resultado: { ok: true, usuario: existente ? existente.Usuario : usuario, reactivado: !!existente }, cambios: cambios };
}

/**
 * Pago de una deuda (cobros Pendientes). Entra la plata al sobre como un cobro "Pago de deuda"
 * (sin meses ni créditos, porque ya se contaron cuando se renovó) y las deudas que cubre
 * quedan "Saldado". Si paga menos, la deuda más vieja queda con el saldo que falta.
 */
function accionPagarDeuda(db, config, p, hoy, correo) {
  var socio = nombreSocio(config, correo);
  var monto = numero(p.monto);
  if (!(monto > 0)) throw new Error('Escriba el monto que pagó.');
  var deudas = db.cobros.filter(function (c) {
    return c.Usuario === p.usuario && c.Estado === 'Pendiente' && (!p.ids || !p.ids.length || p.ids.indexOf(c.ID) >= 0);
  }).sort(function (a, b) { return a.Fecha < b.Fecha ? -1 : 1; });
  if (!deudas.length) throw new Error(p.ids && p.ids.length ? 'Escoja qué va a pagar.' : p.usuario + ' no tiene deudas pendientes.');
  var totalTodo = db.cobros.filter(function (c) { return c.Usuario === p.usuario && c.Estado === 'Pendiente'; })
    .reduce(function (t, d) { return t + numero(d.Monto); }, 0);
  var cambios = [], resto = monto, tolerancia = numero(config.tolerancia);
  var total = deudas.reduce(function (t, d) { return t + numero(d.Monto); }, 0);
  if (monto >= total - tolerancia) resto = total;            // dentro del margen: se salda todo
  deudas.forEach(function (d) {
    var m = numero(d.Monto);
    if (resto <= 0) return;
    if (resto >= m) {
      cambios.push({ tabla: 'Cobros', op: 'actualizar', clave: 'ID', valor: d.ID, fila: { Estado: 'Saldado', Nota: [d.Nota, 'Pagado el ' + fechaCorta(hoy)].filter(Boolean).join(' · ') } });
      resto -= m;
    } else {
      cambios.push({ tabla: 'Cobros', op: 'actualizar', clave: 'ID', valor: d.ID, fila: { Monto: Math.round((m - resto) * 100) / 100, Nota: [d.Nota, 'Abono ' + colones(resto) + ' el ' + fechaCorta(hoy)].filter(Boolean).join(' · ') } });
      resto = 0;
    }
  });
  var numComp = numero(config.ultimo_comprobante) + 1;
  var fila = {
    ID: nuevoId_('C', hoy, db.cobros) + 'd', Fecha: hoy, Usuario: p.usuario, Tipo: 'Pago de deuda',
    Dispositivos: '', Meses: 0, 'Regalía': 0, 'Créditos': 0, Monto: monto, Estado: 'Pagado',
    'Forma de pago': p.forma || 'SINPE', 'Cobró': socio, 'Tipo de cambio': '', Esperado: total, 'Vence nuevo': '',
    'En sobre': p.enSobre === false ? 'No' : 'Sí', Comprobante: '',
    Nota: (deudas.length === 1 ? 'Deuda del ' + fechaCorta(deudas[0].Fecha) : 'Deudas del ' + deudas.map(function (d) { return fechaCorta(d.Fecha); }).join(', ')) +
      (monto >= total - tolerancia ? '' : ' · abono, faltan ' + colones(total - monto))
  };
  cambios.unshift({ tabla: 'Cobros', op: 'agregar', fila: fila });
  cambios.push({ tabla: 'Accesos', op: 'agregar', fila: { Fecha: hoy, Usuario: socio, 'Acción': 'Pago de deuda', Detalle: p.usuario + ' ' + colones(monto) } });
  var pagadoDeuda = monto >= total - tolerancia ? total : monto;
  return { resultado: { ok: true, queda: Math.max(0, Math.round((totalTodo - pagadoDeuda) * 100) / 100) }, cambios: cambios };
}

function accionRespuesta(db, config, p, hoy, correo) {
  var fila = { Respuesta: p.respuesta, 'Fecha respuesta': hoy };
  if (p.respuesta === 'No renueva') fila.Estado = 'Excliente';
  return { resultado: { ok: true }, cambios: [
    { tabla: 'Clientes', op: 'actualizar', clave: 'Usuario', valor: p.usuario, fila: fila },
    { tabla: 'Accesos', op: 'agregar', fila: { Fecha: hoy, Usuario: nombreSocio(config, correo), 'Acción': 'Respuesta', Detalle: p.usuario + ': ' + p.respuesta } }
  ] };
}

/** Deshacer "No renueva": el cliente vuelve a Activo (si se pasó a excliente por error). */
function accionReactivar(db, config, p, hoy, correo) {
  var cli = db.clientes.filter(function (c) { return c.Usuario === p.usuario; })[0];
  if (!cli) throw new Error('No existe el cliente ' + p.usuario);
  return { resultado: { ok: true }, cambios: [
    { tabla: 'Clientes', op: 'actualizar', clave: 'Usuario', valor: p.usuario, fila: { Estado: 'Activo', Respuesta: '', 'Fecha respuesta': '' } },
    { tabla: 'Accesos', op: 'agregar', fila: { Fecha: hoy, Usuario: nombreSocio(config, correo), 'Acción': 'Reactivar', Detalle: p.usuario + ' volvió a Activo' } }
  ] };
}

function accionGuardarControl(db, config, p, hoy, correo) {
  return { resultado: { ok: true }, cambios: [
    { tabla: 'Controles', op: 'agregar', fila: { Fecha: hoy, 'Sobre real': numero(p.sobreReal), 'Créditos panel': numero(p.creditosPanel), 'Registró': nombreSocio(config, correo) } }
  ] };
}

/** Tarea diaria: pasa a Excliente a quien lleva más de N días vencido. */
function accionExclientes(db, config, hoy) {
  var cambios = [];
  var limite = numero(config.dias_excliente) || 30;
  db.clientes.forEach(function (c) {
    if (c.Estado !== 'Activo' || !c.Vence) return;
    if (diasEntre(c.Vence, hoy) > limite) {
      cambios.push({ tabla: 'Clientes', op: 'actualizar', clave: 'Usuario', valor: c.Usuario, fila: { Estado: 'Excliente' } });
    }
  });
  return { resultado: { movidos: cambios.length }, cambios: cambios };
}

/** Estado completo para la app (sin contraseñas). */
function armarEstado(db, config, hoy, correo, tipoCambio) {
  var lista = prepararClientes(db, hoy);
  var cobros = db.cobros.slice().sort(function (a, b) { return a.Fecha < b.Fecha ? 1 : -1; });
  var movs = db.movimientos.slice().sort(function (a, b) { return a.Fecha < b.Fecha ? 1 : -1; });
  return {
    hoy: hoy,
    socio: nombreSocio(config, correo),
    config: {
      precios: { 1: config.precio_1, 2: config.precio_2, 3: config.precio_3, 5: config.precio_5 },
      tolerancia: config.tolerancia, redondeo: config.redondeo, costo_credito: config.costo_credito,
      regalias: { 3: config.regalia_3, 6: config.regalia_6, 12: config.regalia_12 },
      telefono_jonathan: config.telefono_jonathan, telefono_fernando: config.telefono_fernando,
      adobe_proximo: config.adobe_proximo, adobe_monto: config.adobe_monto, tipo_cambio_respaldo: config.tipo_cambio_respaldo,
      dias_reaviso: config.dias_reaviso
    },
    tipoCambio: numero(tipoCambio) || numero(config.tipo_cambio_respaldo),
    clientes: lista,
    resumen: resumen(db, config, tipoCambio),
    alertas: alertas(db, config, hoy, lista),
    cobros: cobros.slice(0, 400).map(function (c) {
      var o = {}; for (var k in c) if (k.charAt(0) !== '_') o[k] = c[k]; return o;
    }),
    movimientos: movs.slice(0, 80).map(function (m) {
      var o = {}; for (var k in m) if (k.charAt(0) !== '_') o[k] = m[k]; return o;
    })
  };
}

/** Aplica cambios a la base de datos en memoria (modo demo y pruebas). */
function aplicarCambiosEnMemoria(db, cambios) {
  var mapa = { Clientes: 'clientes', Cobros: 'cobros', Movimientos: 'movimientos', Config: 'config', Controles: 'controles', Accesos: 'accesos' };
  cambios.forEach(function (c) {
    var t = mapa[c.tabla]; if (!db[t]) db[t] = [];
    if (c.op === 'agregar') {
      var f = {}; for (var k in c.fila) f[k] = c.fila[k];
      if (c.contrasena) f['Contraseña'] = c.contrasena;
      if (c.tabla === 'Cobros') f._recienCreado = true;
      db[t].push(f);
    } else {
      var encontrado = false;
      db[t].forEach(function (fila) {
        if (fila[c.clave] === c.valor) {
          encontrado = true;
          for (var k in c.fila) fila[k] = c.fila[k];
          if (c.contrasena) fila['Contraseña'] = c.contrasena;
        }
      });
      if (!encontrado && c.tabla === 'Config') db[t].push({ Clave: c.valor, Valor: c.fila.Valor });
    }
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    sumarMeses: sumarMeses, sumarDias: sumarDias, diasEntre: diasEntre, fechaCorta: fechaCorta,
    redondear: redondear, colones: colones, numero: numero, leerConfig: leerConfig, CONFIG_POR_DEFECTO: CONFIG_POR_DEFECTO,
    calcularCobro: calcularCobro, evaluarPago: evaluarPago, resumen: resumen, alertas: alertas,
    prepararClientes: prepararClientes, ordenarPorVencimiento: ordenarPorVencimiento, buscarClientes: buscarClientes,
    estadoVisible: estadoVisible, mensajeCobro: mensajeCobro, mensajeAcceso: mensajeAcceso, telefonoWhatsApp: telefonoWhatsApp,
    accionGuardarCobro: accionGuardarCobro, accionGuardarCliente: accionGuardarCliente, accionRespuesta: accionRespuesta,
    accionGuardarControl: accionGuardarControl, accionExclientes: accionExclientes, armarEstado: armarEstado,
    aplicarCambiosEnMemoria: aplicarCambiosEnMemoria, nombreSocio: nombreSocio
  };
}
