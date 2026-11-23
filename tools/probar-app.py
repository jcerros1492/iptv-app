from playwright.sync_api import sync_playwright
import sys
OUT='/home/claude/iptv-app/capturas/'
errores=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    pg.on('pageerror',lambda e: errores.append(str(e)))
    pg.on('console',lambda m: errores.append('console: '+m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(600)
    pg.screenshot(path=OUT+'01-entrar.png')
    pg.click('#demo-j'); pg.wait_for_timeout(700)
    pg.screenshot(path=OUT+'02-inicio.png', full_page=True)
    assert 'AlexisSegura' in pg.content(), 'inicio sin clientes'
    pg.click('a[href="#/alertas"]'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'03-alertas.png')
    pg.goto('http://localhost:8765/index.html#/clientes'); pg.wait_for_timeout(500)
    pg.fill('#q','fernando'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'04-clientes-buscar.png')
    assert 'fval85' in pg.inner_text('#lista')
    pg.fill('#q',''); pg.wait_for_timeout(200); pg.click('[data-filtro="Exclientes"]'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'05-exclientes.png')
    pg.goto('http://localhost:8765/index.html#/cliente/Milasolano06'); pg.wait_for_timeout(500)
    pg.click('#pw-ver'); pg.wait_for_timeout(500)
    assert pg.inner_text('#pw').startswith('demo'), 'no mostró contraseña'
    pg.screenshot(path=OUT+'06-ficha.png', full_page=True)
    pg.goto('http://localhost:8765/index.html#/mensaje/Milasolano06'); pg.wait_for_timeout(500); pg.screenshot(path=OUT+'07-mensaje.png')
    pg.goto('http://localhost:8765/index.html#/cobro/Milasolano06'); pg.wait_for_timeout(500)
    pg.click('[data-mes="3"]'); pg.wait_for_timeout(300)
    t=pg.inner_text('#app'); assert '04/04/2027' in t, 'fecha nueva mal'
    pg.fill('#monto','18000'); pg.press('#monto','Tab'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'08-cobro.png', full_page=True)
    pg.click('#guardar'); pg.wait_for_timeout(900)
    assert 'Cobro guardado' in pg.content(), 'no llegó al comprobante'
    pg.screenshot(path=OUT+'09-comprobante.png', full_page=True)
    # comprobante PNG
    with pg.expect_download() as dl:
        pg.click('#comp-guardar')
    dl.value.save_as(OUT+'10-comprobante-foto.png')
    # duplicado
    pg.goto('http://localhost:8765/index.html#/cobro/Milasolano06'); pg.wait_for_timeout(400)
    msgs=[]
    pg.once('dialog', lambda d: (msgs.append(d.message), d.dismiss()))
    pg.click('#guardar'); pg.wait_for_timeout(800)
    assert msgs and 'Jonathan ya registró' in msgs[0], 'sin aviso de duplicado: '+str(msgs)
    pg.goto('http://localhost:8765/index.html#/nuevo'); pg.wait_for_timeout(400)
    pg.fill('#n-usuario','ClientePrueba'); pg.fill('#n-tel','8811-2233'); pg.fill('#n-pw','xyz789'); pg.click('[data-ndisp="3"]')
    pg.screenshot(path=OUT+'11-nuevo.png')
    pg.click('#n-guardar'); pg.wait_for_timeout(900)
    assert 'ClientePrueba' in pg.content(), 'no abrió cobro del nuevo'
    pg.goto('http://localhost:8765/index.html#/finanzas'); pg.wait_for_timeout(500); pg.screenshot(path=OUT+'12-finanzas.png', full_page=True)
    t=pg.inner_text('#app'); assert '₡194.762,92' in t, 'sobre no subió: '+t[:300]
    pg.goto('http://localhost:8765/index.html#/ajustes'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'13-ajustes.png')
    pg.goto('http://localhost:8765/index.html#/inicio'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'14-inicio-despues.png', full_page=True)
    # computadora
    pc=b.new_page(viewport={'width':1280,'height':860}); pc.goto('http://localhost:8765/index.html'); pc.wait_for_timeout(500)
    pc.click('#demo-f'); pc.wait_for_timeout(600); pc.screenshot(path=OUT+'15-computadora.png')
    b.close()
print('ERRORES:' , errores if errores else 'ninguno')
