"""Convierte IPTV-para-cargar.xlsx al formato de la base de datos de la app.
Genera:
  datos/IPTV-Base-de-datos.xlsx  -> se importa a Google Sheets (lleva contraseñas: NO subir a GitHub)
  datos/db.json                  -> solo para pruebas locales (NO subir a GitHub)
  docs/demo-data.js               -> datos de ejemplo SIN contraseñas ni teléfonos reales, para el modo demo
"""
import openpyxl, json, datetime, sys, os, random
from openpyxl.styles import Font, PatternFill, Alignment
SRC = sys.argv[1]; BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
wb = openpyxl.load_workbook(SRC, data_only=True)
def rows(name):
    ws = wb[name]; hdr = [c.value for c in ws[1]]
    out = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not any(v is not None for v in r): continue
        out.append(dict(zip(hdr, r)))
    return out
def d(v):
    if isinstance(v, datetime.datetime): return v.strftime('%Y-%m-%d')
    return v or ''
nombres = {'fval85': 'Fernando', 'JCerros14': 'Jonathan'}
clientes = []
for c in rows('Clientes'):
    est = c['Estado']; est = 'Activo' if est in ('Activo', 'Vencido') else est
    clientes.append({'Usuario': c['Usuario'], 'Nombre': nombres.get(c['Usuario'], ''), 'ID panel': c['ID del panel'] or '',
        'Teléfono': c['Teléfono'] or '', 'Dispositivos': c['Dispositivos'] or 1, 'Revendedor': c['Revendedor'],
        'Vence': d(c['Vence (panel)']), 'Estado': est, 'Contraseña': c['Contraseña'] or '', 'Respuesta': '', 'Fecha respuesta': '',
        'Nota': '', 'Creado': ''})
cobros = []
for i, c in enumerate(rows('Cobros'), 1):
    cobros.append({'ID': f'H{i:04d}', 'Fecha': d(c['Fecha']), 'Usuario': c['Usuario'], 'Tipo': c['Tipo'],
        'Dispositivos': c['Dispositivos'] or '', 'Meses': c['Meses'] or '', 'Regalía': '', 'Créditos': c['Créditos'] or 0,
        'Monto': c['Monto ₡'], 'Estado': c['Estado'], 'Forma de pago': c['Forma de pago'] or '', 'Cobró': c['Cobró'] or '',
        'Tipo de cambio': '', 'Esperado': '', 'Vence nuevo': '', 'En sobre': 'Sí', 'Comprobante': '', 'Nota': c['Nota'] or ''})
movs = []
for i, m in enumerate(rows('Movimientos'), 1):
    movs.append({'ID': f'M{i:04d}', 'Fecha': d(m['Fecha']), 'Tipo': m['Tipo'], 'Descripción': m['Descripción (Excel original)'],
        'Monto': m['Monto ₡ (+ entra / − sale)'], 'Créditos': m['Créditos comprados'] or 0, 'Afecta sobre': m['¿Afecta el sobre?'],
        'Registró': '', 'Nota': m['Nota'] or ''})
config = [
 ('precio_1', 12, 'Precio por mes en dólares, 1 dispositivo'), ('precio_2', 13, '2 dispositivos'), ('precio_3', 15, '3 dispositivos'), ('precio_5', 20, '5 dispositivos'),
 ('regalia_3', 1, 'Meses gratis al pagar 3'), ('regalia_6', 2, 'Meses gratis al pagar 6'), ('regalia_12', 3, 'Meses gratis al pagar 12'),
 ('costo_credito', 3.5, 'Costo por crédito en dólares (paquete de 200)'), ('tolerancia', 1000, 'Si pagan de menos hasta este monto, no hay alerta'),
 ('redondeo', 50, 'Los precios en colones se redondean a este monto'), ('dias_excliente', 30, 'Días vencido para pasar a Exclientes'),
 ('tipo_cambio_respaldo', 455, 'Se usa solo si no se pudo leer el del BCR'),
 ('telefono_jonathan', '8669-1599', ''), ('telefono_fernando', '6049-4516', ''),
 ('correo_jonathan', 'jonacerros@gmail.com', 'Único correo con acceso, además del de Fernando'), ('correo_fernando', 'fval85@gmail.com', ''),
 ('ultimo_comprobante', 0, 'Número del último comprobante (lo actualiza la app)'),
 ('adobe_proximo', '2027-01-18', 'Próximo pago de Adobe (AAAA-MM-DD)'), ('adobe_monto', 9155.42, 'Último monto de Adobe'), ('adobe_cada_meses', 2, ''),
]
controles = [{'Fecha': '2026-11-21', 'Sobre real': 176762.92, 'Créditos panel': 287, 'Registró': 'Jonathan'}]
tipocambio = [{'Fecha': '2026-11-21', 'Venta': 455, 'Fuente': 'Ejemplo (reemplazar)'}]
db = {'clientes': clientes, 'cobros': cobros, 'movimientos': movs,
      'config': [{'Clave': k, 'Valor': v, 'Nota': n} for k, v, n in config], 'controles': controles, 'tipocambio': tipocambio, 'accesos': []}
json.dump(db, open(f'{BASE}/datos/db.json', 'w'), ensure_ascii=False, indent=1)

# Excel para importar a Google Sheets
HEAD = {'Clientes': ['Usuario','Nombre','ID panel','Teléfono','Dispositivos','Revendedor','Vence','Estado','Contraseña','Respuesta','Fecha respuesta','Nota','Creado'],
 'Cobros': ['ID','Fecha','Usuario','Tipo','Dispositivos','Meses','Regalía','Créditos','Monto','Estado','Forma de pago','Cobró','Tipo de cambio','Esperado','Vence nuevo','En sobre','Comprobante','Nota'],
 'Movimientos': ['ID','Fecha','Tipo','Descripción','Monto','Créditos','Afecta sobre','Registró','Nota'],
 'Config': ['Clave','Valor','Nota'], 'Controles': ['Fecha','Sobre real','Créditos panel','Registró'],
 'TipoCambio': ['Fecha','Venta','Fuente'], 'Accesos': ['Fecha','Usuario','Acción','Detalle'], 'Notificaciones': ['Fecha','Para','Texto','Resultado']}
out = openpyxl.Workbook(); out.remove(out.active)
F = lambda **k: Font(name='Arial', **k)
data = {'Clientes': clientes, 'Cobros': cobros, 'Movimientos': movs, 'Config': db['config'], 'Controles': controles, 'TipoCambio': tipocambio, 'Accesos': [], 'Notificaciones': []}
for name, hdr in HEAD.items():
    ws = out.create_sheet(name)
    for j, h in enumerate(hdr, 1):
        c = ws.cell(1, j, h); c.font = F(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1C1917')
        ws.column_dimensions[openpyxl.utils.get_column_letter(j)].width = max(11, len(h) + 4)
    for i, r in enumerate(data[name], 2):
        for j, h in enumerate(hdr, 1):
            v = r.get(h, '')
            if h in ('Fecha', 'Vence', 'Vence nuevo', 'Fecha respuesta', 'Creado') and v:
                v = datetime.datetime.strptime(v, '%Y-%m-%d'); ws.cell(i, j, v).number_format = 'DD/MM/YYYY'
            else: ws.cell(i, j, v if v != '' else None)
            ws.cell(i, j).font = F()
    ws.freeze_panes = 'A2'
# Resumen legible para personas (fórmulas)
ws = out.create_sheet('Resumen', 0)
filas = [('RESUMEN (se calcula solo · no editar)', None),
 ('Sobre según registros', '=SUMIFS(Cobros!I:I,Cobros!J:J,"Pagado")+SUMIFS(Movimientos!E:E,Movimientos!G:G,"<>No")'),
 ('Créditos comprados', '=SUM(Movimientos!F:F)'), ('Créditos usados', '=SUM(Cobros!H:H)'), ('Créditos según registros', '=B3-B4'),
 ('Pendiente por cobrar', '=SUMIFS(Cobros!I:I,Cobros!J:J,"Pendiente")'), ('Incobrable', '=SUMIFS(Cobros!I:I,Cobros!J:J,"Incobrable")'),
 ('Clientes activos', '=COUNTIF(Clientes!H:H,"Activo")')]
for i, (a, b) in enumerate(filas, 1):
    ws.cell(i, 1, a).font = F(bold=(i == 1)); 
    if b: ws.cell(i, 2, b).font = F(); ws.cell(i, 2).number_format = '#,##0.00'
ws.column_dimensions['A'].width = 34; ws.column_dimensions['B'].width = 18
out.save(f'{BASE}/datos/IPTV-Base-de-datos.xlsx')

# Datos de demostración: sin contraseñas reales ni teléfonos reales
random.seed(7)
demo = json.loads(json.dumps(db))
for c in demo['clientes']:
    c['Contraseña'] = 'demo' + ''.join(random.choice('abcdefghjkmnpqrstuvwxyz23456789') for _ in range(6))
    if c['Teléfono']: c['Teléfono'] = '8' + str(random.randint(100, 999)) + '-' + str(random.randint(1000, 9999))
demo['accesos'] = []
open(f'{BASE}/docs/demo-data.js', 'w').write('/* Datos de demostración: SIN contraseñas ni teléfonos reales. */\nvar DEMO_DB = ' + json.dumps(demo, ensure_ascii=False) + ';\n')
print(len(clientes), len(cobros), len(movs))
