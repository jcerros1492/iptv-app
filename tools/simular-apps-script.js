// Simula los servicios de Google para probar Codigo.gs, Tareas.gs e Instalar.gs sin internet.
const fs = require('fs'), crypto = require('crypto'), vm = require('vm');
const db = JSON.parse(fs.readFileSync(__dirname + '/../datos/db.json'));
const toSigned = b => Array.from(b).map(x => x > 127 ? x - 256 : x);
const toBuf = a => Buffer.from(a.map(x => x & 255));
// Hoja simulada a partir de db.json
const HEAD = {Clientes:['Usuario','Nombre','ID panel','Teléfono','Dispositivos','Revendedor','Vence','Estado','Contraseña','Respuesta','Fecha respuesta','Nota','Creado'],
 Cobros:['ID','Fecha','Usuario','Tipo','Dispositivos','Meses','Regalía','Créditos','Monto','Estado','Forma de pago','Cobró','Tipo de cambio','Esperado','Vence nuevo','En sobre','Comprobante','Nota'],
 Movimientos:['ID','Fecha','Tipo','Descripción','Monto','Créditos','Afecta sobre','Registró','Nota'], Config:['Clave','Valor','Nota'],
 Controles:['Fecha','Sobre real','Créditos panel','Registró'], TipoCambio:['Fecha','Venta','Fuente'], Accesos:['Fecha','Usuario','Acción','Detalle'], Notificaciones:['Fecha','Para','Texto','Resultado']};
const src = {Clientes:db.clientes,Cobros:db.cobros,Movimientos:db.movimientos,Config:db.config,Controles:db.controles,TipoCambio:db.tipocambio,Accesos:[],Notificaciones:[]};
const fechaCols = new Set(['Fecha','Vence','Vence nuevo','Fecha respuesta','Creado']);
const sheets = {};
for (const n in HEAD) sheets[n] = [HEAD[n]].concat(src[n].map(r => HEAD[n].map(h => (fechaCols.has(h) && r[h]) ? new Date(r[h] + 'T12:00:00') : (r[h] === undefined ? '' : r[h]))));
function Sheet(n){ const d = sheets[n]; return {
  getDataRange:()=>({getValues:()=>d.map(r=>r.slice())}), getLastColumn:()=>d[0].length,
  getRange:(r,c,nr,nc)=>({getValues:()=>[d[r-1].slice(c-1,c-1+(nc||1))], setValue:v=>{d[r-1][c-1]=v;}}),
  appendRow:row=>d.push(row)};}
let props = {CLIENT_ID:'cid'};
const fakeHtml = '<tr><td>Bancos públicos</td><td>Banco de Costa Rica </td><td>446,00</td><td>460,00</td><td>14,00</td></tr>';
const ctx = {
  console, JSON, Math, Date, String, Number, Array, Object, Error, isNaN, parseFloat, encodeURIComponent,
  Logger:{log:x=>console.log('  [Logger] '+x)},
  SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n]?Sheet(n):null,getId:()=>'x'}),flush:()=>{}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v;}})},
  CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{}})},
  LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
  ScriptApp:{getProjectTriggers:()=>[],deleteTrigger:()=>{},WeekDay:{SUNDAY:7},newTrigger:()=>{const t={timeBased:()=>t,atHour:()=>t,nearMinute:()=>t,everyDays:()=>t,inTimezone:()=>t,onWeekDay:()=>t,create:()=>t};return t;}},
  ContentService:{createTextOutput:s=>({s,setMimeType(){return this;}}),MimeType:{JSON:1}},
  UrlFetchApp:{fetch:(url)=>{
    if(url.includes('tokeninfo')){const em=decodeURIComponent(url.split('=')[1]);return{getResponseCode:()=>200,getContentText:()=>JSON.stringify({aud:'cid',email:em,email_verified:'true',exp:Math.floor(Date.now()/1000)+3600})};}
    if(url.includes('bccr'))return{getResponseCode:()=>200,getContentText:()=>fakeHtml};
    return{getResponseCode:()=>200,getContentText:()=>'{}'};}},
  Utilities:{
    formatDate:(d,tz,f)=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,weekday:'short'}).formatToParts(d).reduce((o,x)=>(o[x.type]=x.value,o),{});
      if(f==='yyyy-MM-dd')return`${p.year}-${p.month}-${p.day}`; if(f==='HH:mm')return`${p.hour}:${p.minute}`; if(f==='u')return({Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7})[p.weekday]; return '';},
    computeDigest:(alg,s)=>toSigned(crypto.createHash('sha256').update(String(s)).digest()),
    computeHmacSha256Signature:(v,k)=>toSigned(crypto.createHmac('sha256',toBuf(k)).update(toBuf(v)).digest()),
    newBlob:x=>({getBytes:()=>toSigned(Buffer.from(String(x),'utf8')),getDataAsString:()=>toBuf(x).toString('utf8')}),
    base64Encode:a=>toBuf(a).toString('base64'), base64Decode:s=>toSigned(Buffer.from(s,'base64')),
    base64EncodeWebSafe:a=>(typeof a==='string'?Buffer.from(a,'utf8'):toBuf(a)).toString('base64url'), base64DecodeWebSafe:s=>toSigned(Buffer.from(s.replace(/=+$/,''),'base64url')), getUuid:()=>crypto.randomUUID(),
    DigestAlgorithm:{SHA_256:1}}
};
vm.createContext(ctx);
for (const f of ['Logica','Codigo','Tareas','Instalar']) vm.runInContext(fs.readFileSync(__dirname+'/../apps-script/'+f+'.gs','utf8'), ctx, {filename:f+'.gs'});
let fallas=0; const chk=(n,c)=>{console.log((c?'✔ ':'✘ ')+n); if(!c)fallas++;};
console.log('instalar():'); const m = ctx.instalar(); chk('instalar corre', /Listo/.test(m));
const colPw = HEAD.Clientes.indexOf('Contraseña');
chk('Contraseñas cifradas en la hoja', sheets.Clientes.slice(1).every(r=>!r[colPw]||String(r[colPw]).startsWith('enc:')));
chk('Tipo de cambio BCR leído = 460', sheets.TipoCambio[sheets.TipoCambio.length-1][1]===460);
const post = (accion,datos,email)=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({accion,datos,token:email||'jonacerros@gmail.com'})}}).s);
let r = post('estado',{}); chk('estado ok', r.ok && r.datos.resumen.creditos===287 && r.datos.socio==='Jonathan');
chk('estado usa TC 460', r.datos.tipoCambio===460);
chk('sin contraseñas en la respuesta', !JSON.stringify(r).includes('enc:'));
r = post('estado',{},'otro@gmail.com'); chk('correo ajeno rechazado', !r.ok && /no tiene acceso/.test(r.error));
r = post('verContrasena',{usuario:'Milasolano06'}); chk('ver contraseña descifra', r.ok && r.datos.contrasena===db.clientes.find(c=>c.Usuario==='Milasolano06')['Contraseña']);
r = post('guardarCobro',{usuario:'Milasolano06',dispositivos:2,meses:3,monto:18000,forma:'SINPE'}); chk('guardar cobro', r.ok && r.datos.comprobante.numero===1);
const fila = sheets.Clientes.find(x=>x[0]==='Milasolano06'); chk('fecha nueva guardada como fecha', fila[6] instanceof Date);
r = post('estado',{}); chk('cliente con nueva fecha', r.datos.clientes.find(c=>c.usuario==='Milasolano06').vence==='2027-04-04');
r = post('guardarCobro',{usuario:'Milasolano06',dispositivos:2,meses:1},'fval85@gmail.com'); chk('aviso duplicado al otro socio', r.ok && r.datos.duplicado && /Jonathan/.test(r.datos.mensaje));
r = post('guardarCliente',{usuario:'NuevoCliente01',telefono:'8888-1111',dispositivos:2,contrasena:'abc123'}); chk('nuevo cliente', r.ok && r.datos.ok);
chk('nuevo cliente con contraseña cifrada', String(sheets.Clientes[sheets.Clientes.length-1][colPw]).startsWith('enc:'));
r = post('verContrasena',{usuario:'NuevoCliente01'}); chk('contraseña del nuevo se descifra', r.datos.contrasena==='abc123');
r = post('respuesta',{usuario:'YChaconV',respuesta:'No renueva'}); r = post('estado',{}); chk('No renueva → Excliente', r.datos.clientes.find(c=>c.usuario==='YChaconV').estado==='Excliente');
r = post('tipoCambioManual',{venta:458}); r = post('estado',{}); chk('tipo de cambio manual', r.datos.tipoCambio===458);
ctx.tareaManana(); r = post('estado',{}); chk('tarea mañana: AlexisSegura a excliente', r.datos.clientes.find(c=>c.usuario==='AlexisSegura').estado==='Excliente');
chk('notificación registrada', sheets.Notificaciones.length>=1);
r = post('respuesta',{usuario:'Milasolano06',respuesta:'Va a renovar'}); var e2 = post('estado',{});
chk('guardar devuelve estado nuevo', !!r.estado && JSON.stringify(r.estado.clientes)===JSON.stringify(e2.datos.clientes) && r.estado.resumen.sobre===e2.datos.resumen.sobre);
// Sesión larga
r = post('entrar',{}, 'fval85@gmail.com'); chk('entrar con Google entrega sesión larga', r.ok && /^s1\./.test(r.sesion.token) && r.sesion.exp - Date.now()/1000 > 170*86400);
var tok = r.sesion.token;
r = post('estado',{}, tok); chk('sesión larga funciona', r.ok && r.datos.socio==='Fernando');
var malo = tok.slice(0,-3) + (tok.slice(-3)==='AAA'?'BBB':'AAA');
r = post('estado',{}, malo); chk('sesión alterada rechazada', !r.ok);
var hoyCR = ctx.hoy_(); sheets.Config.push(['cerrar_sesiones_antes', hoyCR, '']);
r = post('estado',{}, tok); chk('cerrar_sesiones_antes saca a todos', !r.ok && /vencida/.test(r.error));
sheets.Config.pop();
// Pago de deuda
var e0 = post('estado',{}).datos; var debeF = e0.clientes.find(c=>c.usuario==='fval85').debe, sobre0 = e0.resumen.sobre;
r = post('pagarDeuda',{usuario:'fval85', monto: debeF, forma:'SINPE', enSobre:true});
var e1 = post('estado',{}).datos;
chk('deuda pagada completa', r.ok && e1.clientes.find(c=>c.usuario==='fval85').debe===0 && Math.abs(e1.resumen.sobre - sobre0 - debeF) < 0.01 && !e1.alertas.some(a=>a.usuario==='fval85'));
var debeJ = e1.clientes.find(c=>c.usuario==='JCerros14').debe;
var idsJ = e1.cobros ? e1.cobros.filter(c=>c.Usuario==='JCerros14'&&c.Estado==='Pendiente').map(c=>c.ID) : [];
var r0 = post('pagarDeuda',{usuario:'JCerros14', ids: idsJ.slice(0,2), monto: 13920, forma:'SINPE', enSobre:true});
var eS = post('estado',{}).datos;
chk('pagar 2 de 3 meses', r0.ok && Math.abs(eS.clientes.find(c=>c.usuario==='JCerros14').debe - (debeJ-13920))<0.01 && Math.abs(r0.datos.queda-(debeJ-13920))<0.01);
debeJ = debeJ - 13920;
r = post('pagarDeuda',{usuario:'JCerros14', monto: 3000, forma:'Efectivo', enSobre:true});
var e2 = post('estado',{}).datos;
chk('abono deja saldo', r.ok && Math.abs(e2.clientes.find(c=>c.usuario==='JCerros14').debe - (debeJ-3000)) < 0.01 && Math.abs(r.datos.queda - (debeJ-3000))<0.01);
chk('pago de deuda devuelve estado nuevo', !!r.estado);
// Sin respuesta calla la alerta
r = post('respuesta',{usuario:'AlexisSegura',respuesta:'Sin respuesta'});
chk('Sin respuesta quita la alerta', r.ok && !r.estado.alertas.some(a=>a.usuario==='AlexisSegura'));
r = post('reactivar',{usuario:'YChaconV'}); chk('reactivar excliente', r.ok && r.estado.clientes.find(c=>c.usuario==='YChaconV').estado!=='Excliente');
r = post('verContrasenas',{}); chk('listado de contraseñas', r.ok && Object.keys(r.datos.contrasenas).length >= 5 && !/^enc:/.test(Object.values(r.datos.contrasenas)[0]));
console.log(fallas? fallas+' con error':'Todo bien');
process.exit(fallas?1:0);
