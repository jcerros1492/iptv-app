const L = require('../docs/logic.js');
const db = require('../datos/db.json');
const config = L.leerConfig(db.config);
const hoy = '2026-11-21';
let ok = 0, fail = 0;
function eq(nombre, real, esperado) {
  const bien = typeof esperado === 'number' ? Math.abs(real - esperado) < 0.01 : real === esperado;
  console.log((bien ? '✔' : '✘') + ' ' + nombre + ': ' + real + (bien ? '' : '  (esperado ' + esperado + ')'));
  bien ? ok++ : fail++;
}
const r = L.resumen(db, config, 455);
eq('Sobre', r.sobre, 176762.92);
eq('Créditos', r.creditos, 287);
eq('Pendiente', r.pendiente, 27735);
eq('Incobrable', r.incobrable, 59000);
eq('Última compra de créditos', r.ultimaCompra, '2026-05-05');
eq('Créditos usados desde la compra', r.usadosDesdeCompra, 55);
eq('Reserva (55 × $3,5 × ₡455)', r.reserva, 87587.5);
eq('Disponible para repartir', r.disponible, 89175.42);
eq('Diferencia sobre vs banco', r.control.difSobre, 0);
eq('Diferencia créditos vs panel', r.control.difCreditos, 0);
// Cobro: Milasolano06, 2 disp, 3 meses, no vencido (vence 04/12)
let c = L.calcularCobro(config, { dispositivos: 2, meses: 3, tipoCambio: 455, hoy, venceActual: '2026-12-04' });
eq('Cobro 3 meses 2 disp: monto', c.esperado, 17750);
eq('Cobro 3 meses: regalía', c.regalia, 1);
eq('Cobro 3 meses: créditos', c.creditos, 3);
eq('Cobro 3 meses: nueva fecha (04/12 + 4 meses)', c.venceNuevo, '2027-04-04');
// Vencido: cuenta desde hoy
c = L.calcularCobro(config, { dispositivos: 2, meses: 1, tipoCambio: 455, hoy, venceActual: '2026-09-10' });
eq('Vencido 1 mes: nueva fecha desde hoy', c.venceNuevo, '2026-12-21');
eq('1 mes 2 disp: monto', c.esperado, 5900);
c = L.calcularCobro(config, { dispositivos: 5, meses: 6, tipoCambio: 455, hoy, venceActual: '2026-12-01' });
eq('5 disp 6 meses: créditos', c.creditos, 12);
eq('5 disp 6 meses: monto ($120)', c.esperado, 54600);
eq('31 ene + 1 mes', L.sumarMeses('2027-01-31', 1), '2027-02-28');
// Tolerancia
eq('Pagó ₡500 de menos: redondeo', L.evaluarPago(config, 17750, 17250).tipo, 'redondeo');
eq('Pagó ₡2.000 de menos: pendiente', L.evaluarPago(config, 17750, 15750).tipo, 'pendiente');
eq('Pagó de más: extra', L.evaluarPago(config, 17750, 18000).tipo, 'extra');
// Clientes
const lista = L.ordenarPorVencimiento(L.prepararClientes(db, hoy).filter(x => x.estado !== 'Excliente' && x.estado !== 'Revendedor'));
eq('Primero en Inicio (vencido)', lista[0].usuario, 'AlexisSegura');
eq('Activos + por vencer + vencido', lista.length, 9);
eq('JCerros14 debe', lista.find(x => x.usuario === 'JCerros14').debe, 20880);
eq('Buscar "fernando"', L.buscarClientes(L.prepararClientes(db, hoy), 'fernando')[0].usuario, 'fval85');
eq('Buscar "miLa"', L.buscarClientes(L.prepararClientes(db, hoy), 'miLa')[0].usuario, 'Milasolano06');
// Exclientes a los 30 días: AlexisSegura venció 10/09
const ex = L.accionExclientes(db, config, hoy);
eq('Pasa a excliente', ex.cambios.length === 1 && ex.cambios[0].valor, 'AlexisSegura');
// Acción guardar cobro en memoria
const db2 = JSON.parse(JSON.stringify(db));
let res = L.accionGuardarCobro(db2, config, { usuario: 'Milasolano06', dispositivos: 2, meses: 3, monto: 17750, forma: 'SINPE' }, hoy, 'jonacerros@gmail.com', 455);
L.aplicarCambiosEnMemoria(db2, res.cambios);
eq('Comprobante N.º 1', res.resultado.comprobante.numero, 1);
eq('Recibió', res.resultado.comprobante.recibio, 'Jonathan');
eq('Cliente actualizado', db2.clientes.find(x => x.Usuario === 'Milasolano06').Vence, '2027-04-04');
eq('Sobre sube ₡17.750', L.resumen(db2, L.leerConfig(db2.config), 455).sobre, 176762.92 + 17750);
eq('Créditos bajan 3', L.resumen(db2, L.leerConfig(db2.config), 455).creditos, 284);
res = L.accionGuardarCobro(db2, L.leerConfig(db2.config), { usuario: 'Milasolano06', dispositivos: 2, meses: 3 }, hoy, 'fval85@gmail.com', 455);
eq('Aviso de posible duplicado', res.resultado.duplicado, true);
res = L.accionGuardarCobro(db2, L.leerConfig(db2.config), { usuario: 'JCamacho', dispositivos: 3, meses: 1, monto: 4000 }, hoy, 'fval85@gmail.com', 455);
eq('Pagó de menos: crea pendiente', res.cambios.filter(x => x.tabla === 'Cobros').length, 2);
const msg = L.mensajeCobro(config, L.prepararClientes(db, hoy).find(x => x.usuario === 'Milasolano06'), 455, hoy);
eq('Mensaje WhatsApp menciona ₡5.900', msg.includes('₡5.900'), true);
eq('Teléfono WhatsApp', L.telefonoWhatsApp('8518-5034'), '50685185034');
const est = L.armarEstado(db, config, hoy, 'fval85@gmail.com', 455);
eq('Estado sin contraseñas', JSON.stringify(est).includes('Contraseña'), false);
eq('Socio', est.socio, 'Fernando');
console.log('\n' + ok + ' bien, ' + fail + ' con error');
console.log('Alertas:', est.alertas.map(a => a.titulo).join(' | '));
process.exit(fail ? 1 : 0);
