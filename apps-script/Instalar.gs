/**
 * Correr UNA sola vez, desde el editor de Apps Script:
 *   1. Seleccione la función "instalar" arriba y toque "Ejecutar".
 *   2. Google le pedirá permisos: acéptelos con la cuenta de Jonathan.
 *
 * Qué hace:
 *   - Revisa que existan todas las pestañas.
 *   - Crea la clave de cifrado (si no existe) y cifra las contraseñas de los clientes.
 *   - Programa las tareas automáticas.
 *   - Lee el tipo de cambio del BCR por primera vez.
 * Se puede volver a correr sin problema: no duplica nada.
 */
function instalar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['Clientes', 'Cobros', 'Movimientos', 'Config', 'Controles', 'TipoCambio', 'Accesos', 'Notificaciones'].forEach(function (n) {
    if (!ss.getSheetByName(n)) throw new Error('Falta la pestaña "' + n + '". Importe primero el archivo IPTV-Base-de-datos.xlsx.');
  });

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CLAVE_CIFRADO')) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now());
    props.setProperty('CLAVE_CIFRADO', Utilities.base64Encode(bytes));
  }

  var n = cifrarContrasenas();

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('leerTipoCambioBCR').timeBased().atHour(9).nearMinute(0).everyDays(1).inTimezone(ZONA).create();
  ScriptApp.newTrigger('tareaManana').timeBased().atHour(9).nearMinute(15).everyDays(1).inTimezone(ZONA).create();
  ScriptApp.newTrigger('leerTipoCambioBCR').timeBased().atHour(13).nearMinute(0).everyDays(1).inTimezone(ZONA).create();
  ScriptApp.newTrigger('respaldoSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(22).inTimezone(ZONA).create();

  var tc = leerTipoCambioBCR();

  var faltan = [];
  if (!props.getProperty('CLIENT_ID')) faltan.push('CLIENT_ID');
  if (!props.getProperty('APP_URL')) faltan.push('APP_URL');
  if (!props.getProperty('ONESIGNAL_APP_ID')) faltan.push('ONESIGNAL_APP_ID (opcional, notificaciones)');

  var msg = 'Listo. Contraseñas cifradas: ' + n + '. Tipo de cambio BCR: ' + (tc || 'no se pudo leer') + '.';
  if (faltan.length) msg += ' Falta agregar en Propiedades del script: ' + faltan.join(', ') + '.';
  Logger.log(msg);
  return msg;
}

/** Cifra todas las contraseñas que todavía están en texto normal. */
function cifrarContrasenas() {
  var h = hoja_('Clientes');
  var datos = h.getDataRange().getValues();
  var col = datos[0].indexOf('Contraseña');
  var n = 0;
  for (var i = 1; i < datos.length; i++) {
    var v = datos[i][col];
    if (v && String(v).indexOf('enc:') !== 0) {
      h.getRange(i + 1, col + 1).setValue(cifrar_(v));
      n++;
    }
  }
  return n;
}

/** Prueba rápida del cifrado (debe mostrar "ok"). */
function probarCifrado() {
  var t = 'Prueba-123 ñáé';
  var c = cifrar_(t);
  Logger.log(c);
  Logger.log(descifrar_(c) === t ? 'ok' : 'ERROR');
}
