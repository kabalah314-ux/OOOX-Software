# La misma app con los datos de OTRO negocio: recorre el camino entero (cliente, oficina y técnico)
# leyendo todo del archivo de datos, y comprueba que no queda en pantalla ni rastro del negocio de muestra.
# No lleva ningún nombre, precio ni teléfono escrito: vale para cualquier copia.
# Uso: python3 negocio.py <datos-del-negocio.js> [puerto]     (NAVEGADOR=chromium|firefox|webkit)
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, re, json
from datetime import datetime
from playwright.async_api import async_playwright

DATOS = open(sys.argv[1], encoding='utf-8').read()
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []; textos = []; sinfoto = set()
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt)

async def firma(pg, sel):
    await pg.locator(sel).scroll_into_view_if_needed()
    bb = await pg.locator(sel).bounding_box(); x, y, w, h = bb['x'], bb['y'], bb['width'], bb['height']
    await pg.mouse.move(x + 20, y + h * .6); await pg.mouse.down()
    for i in range(1, 16): await pg.mouse.move(x + 20 + i * (w - 40) / 16, y + h * (.65 if i % 2 else .3), steps=2)
    await pg.mouse.up(); await pg.wait_for_timeout(150)

async def pagina(ctx, nombre, propio):
    pg = await ctx.new_page()
    # las fotos de las averías son de cada negocio: si faltan, la página las esconde y aquí se apuntan aparte, no como error
    pg.on('response', lambda r: sinfoto.add(r.url.split('/')[-1]) if r.status == 404 and '/assets/img/av-' in r.url else None)
    pg.on('console', lambda m: errores.append(f'{nombre}: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.on('response', lambda r: errores.append(f'{nombre}: 404 {r.url}') if r.status >= 400 and '/assets/img/av-' not in r.url else None)
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    if not propio: await pg.route('**/js/oficio-datos.js', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=DATOS))
    return pg

async def guarda(pg, donde):
    t = (await pg.locator('body').inner_text()) + ' ¦ ' + (await pg.title())
    for d in await pg.locator('dialog[open]').all(): t += ' ¦ ' + await d.inner_text()
    textos.append((donde, t)); return t

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        # el negocio de muestra, tal cual lo sirve el sitio: de aquí salen las palabras que NO pueden aparecer en la copia
        c0 = await br.new_context(); p0 = await c0.new_page(); await p0.goto(B + 'cita.html'); M = await p0.evaluate('OFICIO_NEGOCIO'); await c0.close()
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=(NAV != 'firefox'), has_touch=True, locale='es-ES', timezone_id='Europe/Madrid')
        await ctx.clock.install(time=datetime(2026, 11, 17, 10, 30))      # un martes a media mañana: tarifa normal en cualquier horario razonable
        k = await pagina(ctx, 'cliente', False)
        await k.goto(B + 'cita.html'); await k.wait_for_selector('#f')
        N = await k.evaluate('OFICIO_NEGOCIO'); mismo = N['id'] == M['id']; demo = await k.evaluate('Oficio.DEMO')
        K = 'OficioNucleo'; clave = 'oficio:' + N['id']
        print(f"Negocio: {N['nombre']} ({N['id']}), {'con' if demo else 'sin'} avisos de muestra · motor {NAV}")

        # ---------- 1. el cliente pide cita ----------
        t = await guarda(k, 'cita')
        es(N['marca'][0] in (await k.locator('#marca').inner_text()) and N['tel'] in (await k.locator('#llama').inner_text()), 'cita: el rótulo y el teléfono son los del negocio')
        es(N['nombre'] in await k.title(), 'cita: el título de la pestaña lleva el nombre del negocio')
        es(await k.locator('input[name=av]').count() == len(N['averias']), 'cita: salen todas las averías del negocio')
        frs = await k.locator('[data-fr]').all_inner_texts()
        es(len(frs) == len(N['franjas']) and all(re.match(r'^de \d{1,2}(:\d{2})? a \d{1,2}(:\d{2})?', x.strip()) for x in frs), f'cita: las franjas se leen bien {frs[:4]}')
        await k.locator('input[name=av]').first.check(force=True)
        await k.locator('[data-dia]').nth(1).click(); await k.locator('[data-fr]:not([disabled])').first.click()
        cp = list(N['zonas']['cp'].keys())[0]; fuera = '99999'
        await k.fill('#c_nombre', 'Clara Prueba'); await k.fill('#c_tel', '611 22 33 44'); await k.fill('#c_dir', 'C/ de la Prueba 12, 3.º'); await k.fill('#c_cp', fuera); await k.wait_for_timeout(200)
        t = await guarda(k, 'cita fuera de zona')
        es(N['ciudad'] in t, 'cita: fuera de zona, el aviso nombra la ciudad del negocio')
        await k.fill('#c_cp', cp); await k.click('button[type=submit]'); await k.wait_for_selector('.doc'); await k.wait_for_timeout(200)
        t = await guarda(k, 'resguardo'); m = re.search(re.escape(N['serie']) + r'-\d{4}', t); idc = m.group(0) if m else ''
        es(bool(idc), f"cita: el aviso lleva la serie del negocio ({idc or 'no sale'})")
        A = await k.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}')")
        es(A and A['origen'] == 'cita' and A['cli']['dis'] == N['zonas']['cp'][cp] and A['cita'], 'cita: entra con su zona, su franja y el canal apuntado')

        # ---------- 2. la oficina ----------
        c = await pagina(ctx, 'oficina', False); await c.set_viewport_size({'width': 1280, 'height': 860})
        await c.goto(B + 'app.html'); await c.wait_for_selector(f'a.fila[href="#/aviso/{idc}"]')
        t = await guarda(c, 'bandeja')
        es(N['marca'][0] in await c.locator('#marca').inner_text() and N['nombre'] in await c.title(), 'oficina: rótulo y título del negocio')
        es(all(x['n'] in t for x in N['tecnicos']), 'oficina: sale todo el equipo del negocio')
        await c.click(f'a.fila[href="#/aviso/{idc}"]'); await c.wait_for_selector('.tec[data-tec]')
        es(await c.locator('.tec[data-tec]').count() == len(N['tecnicos']), 'oficina: se puede asignar a cualquiera del equipo')
        tec = N['tecnicos'][0]['id']
        await c.click(f'.tec[data-tec={tec}]'); await c.wait_for_timeout(300); await guarda(c, 'aviso asignado')
        # un aviso que entra por WhatsApp y se apunta a mano
        await c.goto(B + 'app.html#/nuevo'); await c.wait_for_selector('#fNuevo')
        es(await c.locator('[data-b-av][aria-pressed=true]').count() == 1, 'nuevo aviso: ya viene elegida una avería del negocio')
        await c.click('[data-b-or=whatsapp]'); await c.fill('#n_tel', '622 33 44 55'); await c.fill('#n_nombre', 'Wences Canal'); await c.fill('#n_dir', 'Av. de la Prueba 3, bajo'); await c.fill('#n_cp', cp)
        await guarda(c, 'nuevo aviso'); await c.click('#fNuevo button[type=submit]'); await c.wait_for_timeout(400)
        S = await c.evaluate(f"JSON.parse(localStorage.getItem('{clave}'))"); W = next((a for a in S['avisos'] if a['cli']['nombre'] == 'Wences Canal'), None)
        es(W and W['origen'] == 'whatsapp' and W['urg'], 'nuevo aviso: queda apuntado que entró por WhatsApp')
        await c.goto(B + 'app.html'); await c.wait_for_selector('.fila'); t = await guarda(c, 'bandeja con dos')
        es('por WhatsApp' in t, 'oficina: la bandeja dice por dónde entró')
        await c.goto(B + 'app.html#/agenda'); await c.wait_for_timeout(400); t = await guarda(c, 'agenda')
        es(not re.search(r'\d\.\d+ a |a \d+\.\d', t) and N['tecnicos'][0]['n'] in t, 'agenda: las franjas se leen bien y sale quién va')
        for ancho in (320, 390):
            await c.set_viewport_size({'width': ancho, 'height': 800}); await c.goto(B + 'app.html#/nuevo'); await c.wait_for_selector('#fNuevo')
            es(await c.evaluate('document.documentElement.scrollWidth') <= ancho + 1, f'nuevo aviso a {ancho} px: nada se sale')
        await c.set_viewport_size({'width': 1280, 'height': 860})

        # ---------- 3. el técnico: los tres toques, con los precios del negocio ----------
        tl = await pagina(ctx, 'tecnico', False)
        await tl.goto(B + f'app.html?papel=tecnico&tec={tec}#/aviso/{idc}'); await tl.wait_for_selector('[data-a=voy]')
        await tl.click('[data-a=voy]'); await tl.wait_for_selector('[data-a=empezar]'); await guarda(tl, 'de camino')
        await tl.click('[data-a=empezar]'); await tl.wait_for_selector('#pF'); await tl.wait_for_timeout(250)
        t = await guarda(tl, 'presupuesto')
        av = next(a for a in N['averias'] if a['id'] == A['av'])
        esperado = await tl.evaluate(f"(()=>{{const K={K},c=Oficio.cfg;return K.eur(K.precio(c,{json.dumps(av['ini'])},{{}}).total)}})()")
        es(esperado in await tl.locator('#pT').inner_text(), f'presupuesto: el total sale del catálogo del negocio ({esperado})')
        es(all(N['catalogo'][l['k']]['t'] in t for l in av['ini']), 'presupuesto: las líneas llevan los nombres del catálogo')
        es('Tarifa normal' in t, 'presupuesto: con cita, tarifa normal')
        await firma(tl, '#pF'); await tl.click('#pOk'); await tl.wait_for_timeout(400)
        # ampliar con «más tiempo»: sube justo un paso del concepto por horas del negocio
        horas = await tl.evaluate('Oficio.cfg.horas')
        if horas and any(l['k'] == horas for l in av['ini']):
            antes = (await tl.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}').tot.total"))
            await tl.click('[data-a=ampliar]'); await tl.wait_for_selector('#pC'); await tl.click(f'#pC [data-add={horas}]'); await tl.wait_for_timeout(150)
            await firma(tl, '#pF'); await tl.click('#pOk'); await tl.wait_for_timeout(400)
            paso = await tl.evaluate(f"(()=>{{const c=Oficio.cfg,it=c.cat[c.horas];return Math.round(it.p10*it.paso)}})()")
            ahora = (await tl.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}').tot.total"))
            es(ahora - antes == paso, f'ampliar: «más tiempo» suma un paso de mano de obra ({antes} → {ahora}, paso {paso})')
        await tl.click('[data-a=terminar]'); await tl.wait_for_selector('#tM'); await tl.click('#tM [data-modo=efectivo]'); await guarda(tl, 'cierre'); await tl.click('#tOk'); await tl.wait_for_timeout(500)
        F = await tl.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}')")
        es(F['e'] == 'hecho' and F['pago']['cobrado'] and F['gar'], 'los tres toques cierran el aviso, con cobro y garantía')
        for doc in ('presupuesto', 'parte', 'garantia'):
            await tl.goto(B + f'app.html?papel=tecnico&tec={tec}#/papel/{idc}/{doc}'); await tl.wait_for_selector('.doc'); t = await guarda(tl, doc)
            es(N['razon'] in t and N['nif'] in t and N['marca'][0] in t, f'{doc}: lleva la razón social, el NIF y el rótulo del negocio')
            if doc != 'garantia': es(N['ciudad'] in t and 'Clara Prueba' in t, f'{doc}: el cliente, con la ciudad del negocio')

        # ---------- 4. una urgencia: el recargo que se lee es el del negocio ----------
        await tl.clock.set_fixed_time(datetime(2026, 11, 15, 11, 0))      # domingo
        u = await tl.evaluate(f"Oficio.hacer({{tipo:'pedir',av:'{N['averias'][0]['id']}',origen:'llamada',cli:{{nombre:'Urge Domingo',tel:'633445566',dir:'C/ de la Prisa 1',cp:'{cp}'}}}},{{rol:'centralita'}}).id")
        tu = await tl.evaluate(f"(()=>{{const S=Oficio.estado(),A=S.avisos.find(a=>a.id==='{u}');return Object.keys(Oficio.cfg.tec).find(x=>!OficioNucleo.puedeIr(S,Oficio.cfg,A,x,Date.now()))}})()")
        es(bool(tu), 'urgencia en domingo: hay alguien a quien se le puede asignar')
        no = [x['id'] for x in N['tecnicos'] if x['id'] != tu and not x.get('guardia')] if any(x.get('guardia') for x in N['tecnicos']) else []
        if no: es(await tl.evaluate(f"Oficio.hacer({{tipo:'asignar',id:'{u}',tec:'{no[0]}'}},{{rol:'centralita'}}).err") == 'horario', 'urgencia en domingo: a quien no hace guardias no se le puede asignar')
        await tl.evaluate(f"Oficio.hacer({{tipo:'asignar',id:'{u}',tec:'{tu}'}},{{rol:'centralita'}})")
        tec = tu
        await tl.goto(B + f'app.html?papel=tecnico&tec={tec}#/aviso/{u}'); await tl.wait_for_selector('[data-a=voy]'); await tl.click('[data-a=voy]'); await tl.wait_for_selector('[data-a=empezar]')
        await tl.click('[data-a=empezar]'); await tl.wait_for_selector('#pF'); t = await guarda(tl, 'presupuesto urgente')
        pct = round(N['tarifa']['recargo'] * 100)
        es(f'un {pct} % más' in t and (pct == 40 or '40 %' not in t.replace('del 40 % del trabajo', '')), f'urgencia: se lee el recargo del negocio ({pct} %)')

        # ---------- 5. ni rastro del negocio de muestra ----------
        if not mismo:
            prohibidas = [M['nombre'], M['razon'], M['nif'], M['tel'], M['dir']] + [x for x in M['marca'] if len(x) > 3] + [x['n'] + ' ' + x['ap'] for x in M['tecnicos']] + ([M['ciudad']] if M['ciudad'] != N['ciudad'] else [])
            if not demo: prohibidas += ['demo', 'de ejemplo', 'inventad']
            hallazgos = sorted({f'«{w}» en {donde}' for donde, t in textos for w in prohibidas if w.lower() in t.lower()})
            es(not hallazgos, f'ni rastro del negocio de muestra en {len(textos)} pantallas: {hallazgos[:6]}')
        es(not errores, f'sin errores de consola {errores[:3]}')
        await br.close()
    if sinfoto: print(f'  aviso: faltan {len(sinfoto)} fotos de averías de este negocio ({", ".join(sorted(sinfoto))}); la página las esconde')
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + f" · {len(textos)} pantallas leídas")
    sys.exit(1 if fallos else 0)

asyncio.run(main())
