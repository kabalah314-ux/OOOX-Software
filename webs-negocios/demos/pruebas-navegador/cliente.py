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

async def entra(pg, B, tel, cod):
    await pg.goto(B + 'cliente.html#/'); await pg.wait_for_selector('main h1')
    if await pg.locator('#salir').count(): await pg.click('#salir'); await pg.wait_for_selector('#fE')
    await pg.goto(B + f'cliente.html#/entra/{tel}/{cod}'); await pg.wait_for_selector('#salir')

async def zona_nueva(pg, B, es, COD):
    '''Lo de la zona del cliente del 19-11-2026: cambiar y cancelar la cita, «Ha vuelto a fallar», las revisiones y los pagos'''
    S = await pg.evaluate('Oficio.estado()'); tel9 = lambda s: ''.join(ch for ch in str(s) if ch.isdigit())[-9:]
    puede = lambda a: pg.evaluate("a=>Oficio.K.cambiaCli(Oficio.cfg,a,Date.now())", a)
    # una cita con más de 24 horas por delante: se cambia aquí mismo
    cand = [a for a in S['avisos'] if a.get('cita') and a['e'] in ('nuevo', 'asignado')]
    libre = [a for a in cand if await puede(a)]
    es(libre, 'la muestra tiene una cita que el cliente aún puede cambiar')
    if not libre: return
    A = libre[-1]; TEL = tel9(A['cli']['tel']); await entra(pg, B, TEL, COD)
    es(await pg.locator(f'[data-cambia="{A["id"]}"]').count() == 1 and await pg.locator(f'[data-cancela="{A["id"]}"]').count() == 1 and '24 horas' in await pg.locator('.tja').first.inner_text(), f'{A["id"]}: «Cambiar la cita» y «Cancelar la cita», hasta 24 horas antes')
    await pg.click(f'[data-cambia="{A["id"]}"]'); await pg.wait_for_selector('#fC')
    es(pg.url.endswith('cita.html#/cambiar/' + A['id']) and 'Cambia tu cita' in await pg.locator('main h1').inner_text(), 'cambiar: el mismo calendario de pedir cita, en su propia pantalla')
    tit = await pg.locator('main .lead').inner_text(); larga = await pg.evaluate(f"OficioIdioma.fechaLarga('{A['cita']['dia']}')")
    es(larga in tit, f'dice cuándo la tiene ahora ({larga})')
    if await pg.locator(f'[data-dia="{A["cita"]["dia"]}"]').count(): await pg.click(f'[data-dia="{A["cita"]["dia"]}"]')
    if await pg.locator(f'[data-dia="{A["cita"]["dia"]}"][aria-checked=true]').count():
        es(await pg.locator(f'.hora[data-fr="{A["cita"]["fr"]}"][disabled]').count() == 1 and 'tu cita ahora' in await pg.locator(f'.hora[data-fr="{A["cita"]["fr"]}"]').inner_text(), 'su franja de ahora sale marcada y no se puede elegir')
    await pg.click('#fC [type=submit]'); await pg.wait_for_selector('#fC .fallo')
    es('Elige un día y una franja' in await pg.locator('#fC .fallo').inner_text(), 'sin franja elegida, lo dice y no cambia nada')
    dia = await pg.locator('.dia[data-dia]').nth(1).get_attribute('data-dia'); await pg.click(f'.dia[data-dia="{dia}"]')
    fr = await pg.locator('.hora[data-fr]:not([disabled])').first.get_attribute('data-fr'); await pg.click(f'.hora[data-fr="{fr}"]')
    await pg.click('#fC [type=submit]'); await pg.wait_for_url('**/cita.html#/aviso/' + A['id'] + '*'); await pg.wait_for_selector('#tit')
    A2 = await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{A['id']}')")
    es(A2['cita']['dia'] == dia and A2['cita']['fr'] == fr and A2['h'][-1]['q'] == 'Cliente' and 'Cita cambiada' in await pg.locator('#toast').inner_text(), f'cambiada al {dia}, {fr}: queda apuntado que la cambió él y se ve su aviso')
    es('Hazlo en' in await pg.locator('main').inner_text() and await pg.locator('main a[href="cliente.html"]').count() >= 1, 'en su aviso, que se cambia o se cancela en su zona hasta 24 horas antes')
    es(await pg.evaluate("localStorage.getItem('oficio:'+Oficio.N.id+':cambia')") is None, 'y no queda nada del cambio guardado')
    # cancelar: se pregunta antes
    await pg.goto(B + 'cliente.html#/'); await pg.wait_for_selector(f'[data-cancela="{A["id"]}"]'); await pg.click(f'[data-cancela="{A["id"]}"]'); await pg.wait_for_selector('dialog[open] #cSi')
    d = await pg.locator('dialog[open]').inner_text()
    es('¿Cancelar la cita?' in d and 'No te cuesta nada' in d, 'cancelar: pregunta antes y dice que no cuesta nada')
    await pg.click('dialog[open] [data-x].btn'); await pg.wait_for_timeout(150)
    es((await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{A['id']}').e")) != 'cancelado', '«No, la mantengo» no cancela nada')
    await pg.click(f'[data-cancela="{A["id"]}"]'); await pg.wait_for_selector('dialog[open] #cSi'); await pg.click('dialog[open] #cSi'); await pg.wait_for_selector('dialog[open]', state='detached')
    A3 = await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{A['id']}')")
    es(A3['e'] == 'cancelado' and 'Cita cancelada' in await pg.locator('#toast').inner_text() and await pg.locator(f'[data-cancela="{A["id"]}"]').count() == 0, 'cancelada: lo dice y desaparece de Inicio')
    # una cita a menos de 24 horas: se cambia llamando (con lo que cuesta cancelar tarde, si el negocio lo cobra)
    corta = [a for a in cand if a['id'] != A['id'] and not await puede(a)]
    if corta:
        C = corta[0]; await entra(pg, B, tel9(C['cli']['tel']), COD)
        txt = await pg.locator('main').inner_text()
        cobra = await pg.evaluate('!!Oficio.N.cancelaTarde')   # lo que cuesta cancelar tarde, si el negocio lo cobra
        es(await pg.locator(f'[data-cambia="{C["id"]}"]').count() == 0 and 'Faltan menos de 24 horas' in txt and ('te cobramos' in txt) == cobra, f'{C["id"]}: a menos de 24 horas, llamando' + (', y lo que cuesta cancelarla ahora' if cobra else ' (este negocio no cobra por cancelar tarde)'))
    # «Ha vuelto a fallar»: con un trabajo en garantía, pide cita sobre él
    hoy = await pg.evaluate('Oficio.K.madrid().date')
    G = next((a for a in S['avisos'] if a['e'] == 'hecho' and a.get('gar') and a['gar']['hasta'] >= hoy and not a.get('sinTrabajo') and a['av'] != 'revision' and not any(x.get('vuelve') == a['id'] for x in S['avisos'])), None)
    ya = next((x for x in S['avisos'] if x.get('vuelve')), None)
    if ya:
        await entra(pg, B, tel9(ya['cli']['tel']), COD); await pg.goto(B + 'cliente.html#/trabajos'); await pg.wait_for_timeout(150)
        es('Ya nos has avisado de que ha vuelto a fallar' in await pg.locator('main').inner_text() and await pg.locator(f'a[href*="garantia={ya["vuelve"]}"]').count() == 0, f'{ya["vuelve"]}: si ya lo ha pedido, lo dice y no lo deja pedir otra vez')
    es(G, 'la muestra tiene un trabajo en garantía sin pedir')
    if G:
        await entra(pg, B, tel9(G['cli']['tel']), COD); await pg.goto(B + 'cliente.html#/trabajos'); await pg.wait_for_selector(f'a[href*="garantia={G["id"]}"]')
        await pg.click(f'a[href*="garantia={G["id"]}"]'); await pg.wait_for_selector('#garN')
        es(G['id'] in await pg.locator('#garN').inner_text() and await pg.input_value('#c_tel') != '' and 'elegido' in await pg.locator('.elegida').inner_text(), 'en pedir cita: sobre qué trabajo es, el servicio elegido y sus datos puestos')
        await pg.locator('.hora[data-fr]:not([disabled])').first.click(); await pg.click('#f [type=submit]'); await pg.wait_for_selector('#rConfirma')
        es('Ha vuelto a fallar el trabajo ' + G['id'] in await pg.locator('main').inner_text(), 'el resumen dice que ha vuelto a fallar ese trabajo')
        await pg.click('#rConfirma'); await pg.wait_for_url('**#/aviso/*'); nid = pg.url.split('#/aviso/')[1].split('/')[0]
        N2 = await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{nid}')")
        es(N2['vuelve'] == G['id'] and N2['gar0'] == G['id'] and not N2.get('enGar'), f'{nid}: llega a la oficina diciendo que ha vuelto a fallar {G["id"]}; la garantía la decide ella')
        o = await pg.context.new_page(); await o.goto(B + 'app.html#/aviso/' + nid); await o.wait_for_selector('#garB')
        es('El cliente dice que ha vuelto a fallar' in await o.locator('#garB').inner_text() and await o.locator('#garB [data-a=esGar]').count() == 1, 'la oficina lo ve en el aviso, con «Es garantía»'); await o.close()
    # las revisiones: sin contrato, la revisión suelta o el plan; con «Lo quiero», la cita con el plan
    J = next((a for a in S['avisos'] if a['av'] != 'revision' and a['e'] == 'hecho' and any(l.get('k') == 'revinst' for l in (a.get('tot') or {}).get('lineas', []))), None)
    if J:
        await entra(pg, B, tel9(J['cli']['tel']), COD); r = await pg.locator('#rev').inner_text()
        es('Tu última revisión fue el' in r and await pg.locator('#rev a[href*="servicio=revision"]').count() == 2 and await pg.locator('#rev a[href*="plan="]').count() == 1, 'revisiones: cuándo fue la última, la revisión suelta y el plan')
        PR = await pg.evaluate("(()=>{const K=Oficio.K,cfg=Oficio.cfg,r=K.rango(cfg,K.REV,false),P=Object.values(cfg.planes)[0];return {suelta:K.eur(r.a).replace(',00',''),plan:K.eur(P.precio).replace(',00',''),id:P.id,n:P.n.toLowerCase(),rev:cfg.cat[P.rev].t}})()")
        es(('Desde ' + PR['suelta']) in r and (PR['plan'] + ' al año') in r, f"con sus precios ({PR['suelta']} y {PR['plan']} al año)")
        await pg.click('#rev a[href*="plan="]'); await pg.wait_for_selector('#c_nomap')
        m = await pg.locator('main').inner_text()
        es((PR['plan'] + ' al año') in m and 'Te escribimos para darlo de alta' in m and PR['rev'] in m, 'en pedir cita: la revisión con el plan, su precio y que le escribimos para darlo de alta')
        await pg.locator('.hora[data-fr]:not([disabled])').first.click(); await pg.click('#f [type=submit]'); await pg.wait_for_selector('#rConfirma'); await pg.click('#rConfirma'); await pg.wait_for_url('**#/aviso/*')
        nid = pg.url.split('#/aviso/')[1].split('/')[0]; N3 = await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{nid}')")
        es(N3['av'] == 'revision' and N3.get('quiere') == PR['id'] and N3.get('cita'), f'{nid}: una revisión con cita, que quiere el plan')
        es((PR['plan'] + ' al año') in await pg.locator('main').inner_text(), 'y su aviso lo dice')
        o = await pg.context.new_page(); await o.goto(B + 'app.html#/aviso/' + nid); await o.wait_for_selector('#conQ')
        es(('quiere el ' + PR['n']) in await o.locator('#conQ').inner_text() and await o.locator('#conQ [data-a=conAlta]').count() == 1, 'la oficina ve que quiere el plan, con «Dar de alta el contrato»'); await o.close()
        await pg.goto(B + 'cliente.html#/'); await pg.wait_for_selector('#rev')
        es('Tu revisión está pedida' in await pg.locator('#rev').inner_text() and await pg.locator('#rev a[href*="plan="]').count() == 0, 'en su zona: la revisión pedida, sin ofrecerla otra vez')
    # los pagos: lo que tiene por pagar, cómo pagarlo y el número abajo
    D = next((a for a in S['avisos'] if a['e'] == 'hecho' and a.get('tot') and a['tot']['total'] > 0 and not (a.get('pago') or {}).get('cobrado')), None)
    es(D, 'la muestra tiene un trabajo por cobrar')
    if D:
        await entra(pg, B, tel9(D['cli']['tel']), COD)
        es(await pg.locator('#tabs a[href="#/pagos"] .n').inner_text() == '1' and 'Por pagar' in await pg.locator('main').inner_text(), 'con algo por pagar: el número en «Pagos» y el aviso en Inicio')
        await pg.goto(B + 'cliente.html#/pagos'); await pg.wait_for_timeout(150); m = await pg.locator('main').inner_text()
        iban = await pg.evaluate('(Oficio.N.pago||{}).iban||""'); eur = await pg.evaluate(f"Oficio.K.eur({D['tot']['total']})")
        es(D['id'] in m and eur in m and (not iban or iban in m) and 'concepto' in m, f'Pagos: {D["id"]}, {eur} y cómo pagarlo')

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
        DEMO = False
        if COPIA:   # una copia que trae su propia muestra (la demo «en uso») es una demo: se prueba como la demo
            await pg.goto(B + 'cliente.html'); await pg.wait_for_selector('main h1'); DEMO = await pg.evaluate('Oficio.DEMO')
        if COPIA and not DEMO:
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
            # las cuatro partes (19-11-2026): Inicio, Trabajos, Pagos y Cuenta, cada una con lo suyo
            es(await pg.locator('#tabs a').count() == 4 and await pg.locator('#tabs a[aria-current=page]').get_attribute('href') == '#/' and not await pg.locator('#tabs').is_hidden(), 'dentro: las cuatro partes, en Inicio')
            partes = {}
            for k in ('', 'trabajos', 'pagos', 'cuenta'):
                await pg.goto(B + 'cliente.html#/' + k); await pg.wait_for_timeout(120); partes[k] = await pg.locator('main').inner_text()
                es(await pg.locator('#tabs a[aria-current=page]').get_attribute('href') == '#/' + k, f'«{k or "inicio"}» marcada abajo')
            t = '\n'.join(partes.values())
            es(all(a['id'] in t for a in P['avisos']), 've todos sus avisos (' + ', '.join(a['id'] for a in P['avisos']) + ')')
            es(all(a['id'] in partes[''] for a in P['avisos'] if a['e'] not in ('hecho', 'cancelado')) and all(a['id'] in partes['trabajos'] for a in P['avisos'] if a['e'] == 'hecho'), 'lo que está en marcha en Inicio; lo terminado, en Trabajos')
            otros = [a for a in S['avisos'] if tel9(a['cli'].get('tel', '')) != TEL]
            es(otros and not any(a['id'] in t for a in otros), f'y ninguno de otro cliente ({len(otros)} avisos de otros)')
            nombres = {a['cli']['nombre'] + ' ' + a['cli'].get('apellidos', '') for a in otros if a['cli'].get('nombre')}
            es(not any(n.strip() in t for n in nombres), 'ni el nombre de ningún otro cliente')
            for k, h in (('', 'Ahora'), ('trabajos', 'Tus trabajos'), ('pagos', 'Tus facturas'), ('cuenta', 'Tus datos')): es(h in partes[k], f'tiene «{h}»')
            es(P['cli']['dir'] in partes['cuenta'] and await pg.evaluate(f"Oficio.K.telBonito('{TEL}')") in partes['cuenta'] and await pg.locator('#salir').count() == 1, 'Cuenta: la dirección, el teléfono y salir')
            es('Pedir otra cita' not in t and 'Pedir cita' in partes[''], 'pone «Pedir cita», no «Pedir otra cita»')
            # los papeles de un trabajo terminado
            await pg.goto(B + 'cliente.html#/trabajos'); await pg.click(f"a.tj[href='#/aviso/{hecho['id']}']"); await pg.wait_for_selector('article.doc')
            es(await pg.locator('#tabs a[aria-current=page]').get_attribute('href') == '#/trabajos', 'los papeles, dentro de Trabajos')
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
            await pg.goto(B + 'cliente.html#/'); await pg.wait_for_selector('#otra'); await pg.click('#otra'); await pg.wait_for_selector('#c_nomap')
            v = {k: await pg.input_value('#c_' + k) for k in ('nomap', 'tel', 'dir', 'cp')}
            es(v['nomap'] == (P['cli']['nombre'] + ' ' + P['cli']['apellidos']).strip() and tel9(v['tel']) == TEL and v['dir'] == P['cli']['dir'] and v['cp'] == P['cli']['cp'], 'pedir otra cita: sus datos ya puestos')
            await pg.reload(); await pg.wait_for_selector('#c_nomap')
            es(await pg.input_value('#c_nomap') == '', 'y solo esa vez: al volver a entrar, el formulario sale vacío')
            # salir
            await pg.goto(B + 'cliente.html'); await pg.wait_for_selector('#salir'); await pg.click('#salir'); await pg.wait_for_selector('#fE')
            es(await pg.evaluate("localStorage.getItem('oficio:'+Oficio.N.id+':cliente')") is None, 'salir: vuelve a pedir el código y no queda nada guardado')
            # con un toque, como otro cliente de muestra
            otro_tel = await pg.locator('[data-entra]').nth(1).get_attribute('data-entra'); await pg.locator('[data-entra]').nth(1).click(); await pg.wait_for_selector('#salir')
            P2 = await pg.evaluate(f"Oficio.K.perfilCliente(Oficio.estado(),Oficio.cfg,'{otro_tel}')")
            t3 = ''
            for k in ('', 'trabajos'): await pg.goto(B + 'cliente.html#/' + k); await pg.wait_for_timeout(120); t3 += await pg.locator('main').inner_text()
            es(P2 and P2['tel'] != TEL and all(a['id'] in t3 for a in P2['avisos']), 'con un toque entra como otro cliente de muestra y ve lo suyo')
            await pg.goto(B + 'cliente.html#/'); await pg.click('#salir'); await pg.wait_for_selector('#fE')
            await zona_nueva(pg, B, es, COD)
            await pg.goto(B + 'cliente.html#/')
            if await pg.locator('#salir').count(): await pg.click('#salir'); await pg.wait_for_selector('#fE')
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
            if not COPIA: es(await w.locator('a[href^="cliente.html"]').count() >= 1, 'la web tiene «Tu zona»')   # una copia no lleva la web del negocio, solo la portada de pedir cita
            await w.close()
            es(not errs, f'sin errores {errs[:2]}')
        await b.close()
    print(('BIEN' if not mal else 'MAL') + f': {ok} comprobaciones pasan' + (f', {len(mal)} fallan' if mal else ''))
    sys.exit(1 if mal else 0)

asyncio.run(main())
