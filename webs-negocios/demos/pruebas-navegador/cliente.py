# La zona del cliente (cliente.html): entra con su teléfono y un código, y ve todo lo suyo y nada de otro.
# Uso: python3 cliente.py [puerto] [--copia]
#   sin --copia: la demo (avisos de muestra, el código de la demo), en un móvil
#   con --copia: una copia de un negocio de verdad servida desde su carpeta. Sin servidor, la zona todavía no está abierta;
#                con servidor, pide el teléfono y el código (entrar de verdad se prueba en servidor.py, contra uno local)
import os, sys
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, json
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # ningún navegador de las pruebas sale a internet: ver buzon_falso.py
ARG = [a for a in sys.argv[1:] if not a.startswith('--')]
PUERTO = ARG[0] if ARG else '8765'; COPIA = '--copia' in sys.argv
B = f'http://127.0.0.1:{PUERTO}/'

async def main():
    ok = 0; mal = []
    def es(c, t):
        nonlocal ok
        if c: ok += 1
        else: mal.append(t); print('  MAL', t)
    async with async_playwright() as p:
        b = await getattr(p, NAV).launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Madrid', has_touch=True, is_mobile=NAV != 'firefox'); await pon_hora(ctx)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        if COPIA:
            await pg.goto(B + 'cliente.html'); await pg.wait_for_selector('main h1')
            t = await pg.locator('main').inner_text(); N = await pg.evaluate('Oficio.N'); SRV = await pg.evaluate('Oficio.SRV')
            es(N['nombre'] in t and N['nombre'] in await pg.title(), 'copia: con el nombre del negocio')
            if SRV:   # con servidor la zona está abierta; aquí el servidor no contesta (buzon_falso): la de verdad se prueba en servidor.py
                es(await pg.locator('#fE').count() == 1 and 'todavía no está abierta' not in t and await pg.locator('.muestra').count() == 0 and '2468' not in t, 'copia con servidor: la zona pide el teléfono y el código, sin la muestra ni el código de la demo')
                await pg.goto(B + 'cliente.html#/entra/600000143/2468-1357'); await pg.wait_for_timeout(400)
                es(await pg.locator('#salir').count() == 0 and '2468' not in pg.url, 'copia: el enlace con el código de la demo no entra y el código no se queda en la barra')
                await pg.fill('#z_tel', '600000143'); await pg.fill('#z_cod', 'abcd-efgh'); await pg.click('#fE [type=submit]')
                await pg.wait_for_function("!!document.querySelector('.fallo')", timeout=5000)
                es('No hay conexión' in await pg.locator('#fE').inner_text() and await pg.evaluate("localStorage.getItem('oficio:'+Oficio.N.id+':cliente')") is None and 'juez' in await pg.evaluate('window.__buzonFalso'), 'copia: sin servidor que conteste lo dice y no entra (en las pruebas no se sale a internet)')
            else:
                es('todavía no está abierta' in t and await pg.locator('#fE').count() == 0, 'copia sin servidor: la zona del cliente dice que todavía no está abierta y no pide nada')
                await pg.goto(B + 'cliente.html#/entra/600000143/2468-1357'); await pg.wait_for_timeout(300)
                es(await pg.locator('#fE').count() == 0 and 'Hola' not in await pg.locator('main').inner_text() and '2468' not in pg.url, 'copia: el enlace de la demo no abre nada y el código no se queda en la barra')
            es(not errs, f'copia: sin errores {errs[:2]}')
        else:
            await pg.goto(B + 'cliente.html'); await pg.wait_for_selector('#fE')
            S = await pg.evaluate('Oficio.estado()'); COD = await pg.evaluate('Oficio.K.CLIENTE_DEMO')
            tel9 = lambda s: ''.join(ch for ch in str(s) if ch.isdigit())[-9:]
            hecho = next(a for a in S['avisos'] if a['e'] == 'hecho' and a.get('tot') and a['cli'].get('tel'))
            TEL = tel9(hecho['cli']['tel'])
            es(await pg.locator('#z_tel').count() == 1 and await pg.locator('#z_cod').count() == 1, 'entrar: pide el teléfono y el código')
            es(await pg.locator('[data-entra]').count() >= 3 and COD in await pg.locator('.muestra').inner_text(), 'la demo enseña el código de muestra y deja entrar con un toque')
            # códigos y teléfonos que no valen
            await pg.fill('#z_tel', TEL); await pg.fill('#z_cod', '0000-0000'); await pg.click('#fE [type=submit]'); await pg.wait_for_timeout(150)
            es(await pg.locator('.campo.mal #z_cod').count() == 1 and 'Ese código no es' in await pg.locator('#fE').inner_text(), 'un código que no es no deja entrar y lo dice en su campo')
            await pg.fill('#z_tel', '123'); await pg.fill('#z_cod', COD); await pg.click('#fE [type=submit]'); await pg.wait_for_timeout(150)
            es(await pg.locator('.campo.mal #z_tel').count() == 1, 'un teléfono mal escrito, tampoco')
            await pg.fill('#z_tel', '699 99 99 99'); await pg.click('#fE [type=submit]'); await pg.wait_for_timeout(150)
            es('ningún aviso' in await pg.locator('#fE').inner_text() and await pg.locator('#fE').count() == 1, 'un teléfono sin avisos: lo dice y no entra')
            # entra con el código sin guion y el teléfono con espacios
            tb = TEL[:3] + ' ' + TEL[3:5] + ' ' + TEL[5:7] + ' ' + TEL[7:]
            await pg.fill('#z_tel', tb); await pg.fill('#z_cod', COD.replace('-', '')); await pg.click('#fE [type=submit]'); await pg.wait_for_selector('#salir')
            P = await pg.evaluate(f"Oficio.K.perfilCliente(Oficio.estado(),Oficio.cfg,'{TEL}')")
            t = await pg.locator('main').inner_text()
            es(t.startswith('Hola, ' + P['cli']['nombre'].split(' ')[0]), f"dentro: le saluda por su nombre ({P['cli']['nombre']})")
            es(all(a['id'] in t for a in P['avisos']), 've todos sus avisos (' + ', '.join(a['id'] for a in P['avisos']) + ')')
            otros = [a for a in S['avisos'] if tel9(a['cli'].get('tel', '')) != TEL]
            es(otros and not any(a['id'] in t for a in otros), f'y ninguno de otro cliente ({len(otros)} avisos de otros)')
            nombres = {a['cli']['nombre'] + ' ' + a['cli'].get('apellidos', '') for a in otros if a['cli'].get('nombre')}
            es(not any(n.strip() in t for n in nombres), 'ni el nombre de ningún otro cliente')
            for h in ('Ahora', 'Tus trabajos', 'Tus facturas', 'Tus datos'): es(h in t, f'tiene «{h}»')
            es(P['cli']['dir'] in t and await pg.evaluate(f"Oficio.K.telBonito('{TEL}')") in t, 'sus datos: la dirección y el teléfono')
            # los papeles de un trabajo terminado
            await pg.click(f"a.tj[href='#/aviso/{hecho['id']}']"); await pg.wait_for_selector('article.doc')
            d = await pg.locator('article.doc').inner_text(); eur = await pg.evaluate(f"Oficio.K.eur({hecho['tot']['total']})")
            es(await pg.locator('.vdocs a').count() >= 2 and 'Parte de trabajo' in d and eur in d, f"un trabajo terminado: el parte con su total ({eur})")
            await pg.click(".vdocs a[href$='/presupuesto']"); await pg.wait_for_timeout(150)
            es('Presupuesto' in await pg.locator('article.doc').inner_text() and await pg.locator('article.doc .fir svg').count() >= 1, 'y el presupuesto con su firma')
            if hecho.get('gar'):
                await pg.click(".vdocs a[href$='/garantia']"); await pg.wait_for_timeout(150)
                es('Garantía' in await pg.locator('article.doc').inner_text(), 'y la garantía')
            es(await pg.locator('#imprime').count() == 1, 'se puede imprimir o guardar en PDF')
            # un aviso de otro, a mano en la barra: no
            await pg.goto(B + 'cliente.html#/aviso/' + otros[0]['id']); await pg.wait_for_timeout(200)
            t2 = await pg.locator('main').inner_text()
            es('No está en tu zona' in t2 and otros[0]['cli'].get('dir', '¿?') not in t2, 'el aviso de otro cliente, escrito a mano en la dirección: no se ve')
            # pedir otra cita con sus datos puestos, una sola vez
            await pg.goto(B + 'cliente.html#/'); await pg.wait_for_selector('#otra'); await pg.click('#otra'); await pg.wait_for_selector('#c_nombre')
            v = {k: await pg.input_value('#c_' + k) for k in ('nombre', 'apellidos', 'tel', 'dir', 'cp')}
            es(v['nombre'] == P['cli']['nombre'] and v['apellidos'] == P['cli']['apellidos'] and tel9(v['tel']) == TEL and v['dir'] == P['cli']['dir'] and v['cp'] == P['cli']['cp'], 'pedir otra cita: sus datos ya puestos')
            await pg.reload(); await pg.wait_for_selector('#c_nombre')
            es(await pg.input_value('#c_nombre') == '', 'y solo esa vez: al volver a entrar, el formulario sale vacío')
            # salir
            await pg.goto(B + 'cliente.html'); await pg.wait_for_selector('#salir'); await pg.click('#salir'); await pg.wait_for_selector('#fE')
            es(await pg.evaluate("localStorage.getItem('oficio:'+Oficio.N.id+':cliente')") is None, 'salir: vuelve a pedir el código y no queda nada guardado')
            # con un toque, como otro cliente de muestra
            otro_tel = await pg.locator('[data-entra]').nth(1).get_attribute('data-entra'); await pg.locator('[data-entra]').nth(1).click(); await pg.wait_for_selector('#salir')
            P2 = await pg.evaluate(f"Oficio.K.perfilCliente(Oficio.estado(),Oficio.cfg,'{otro_tel}')")
            t3 = await pg.locator('main').inner_text()
            es(P2 and P2['tel'] != TEL and all(a['id'] in t3 for a in P2['avisos']), 'con un toque entra como otro cliente de muestra y ve lo suyo')
            await pg.click('#salir'); await pg.wait_for_selector('#fE')
            # desde la oficina: «Su zona» en el aviso, con el mensaje, el enlace y el código; el enlace entra solo
            o = await ctx.new_page(); o.on('pageerror', lambda e: errs.append(str(e)))
            await o.goto(B + 'app.html#/aviso/' + hecho['id']); await o.wait_for_selector('[data-a=zona]'); await o.click('[data-a=zona]'); await o.wait_for_selector('#zAbre')
            txt = await o.locator('dialog[open] .wa').inner_text(); url = await o.get_attribute('#zAbre', 'href')
            es(f'cliente.html#/entra/{TEL}/{COD}' in url and COD in txt and 'cliente.html#/entra/' in txt, 'oficina: «Su zona» prepara el mensaje con su enlace y su código')
            await o.close()
            await pg.goto(url); await pg.wait_for_selector('#salir')
            es(pg.url.endswith('#/') and COD not in pg.url and 'Hola' in await pg.locator('main').inner_text(), 'el enlace del mensaje entra solo y el código no se queda en la barra')
            # la web lleva a la zona
            w = await ctx.new_page(); await w.goto(B + 'index.html'); await w.wait_for_timeout(400)
            es(await w.locator('a[href="cliente.html"]').count() >= 1, 'la web tiene «Tu zona»')
            await w.close()
            es(not errs, f'sin errores {errs[:2]}')
        await b.close()
    print(('BIEN' if not mal else 'MAL') + f': {ok} comprobaciones pasan' + (f', {len(mal)} fallan' if mal else ''))
    sys.exit(1 if mal else 0)

asyncio.run(main())
