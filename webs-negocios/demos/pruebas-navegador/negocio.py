# La misma app con los datos de OTRO negocio: recorre el camino entero (cliente, oficina y técnico)
# leyendo todo del archivo de datos, y comprueba que no queda en pantalla ni rastro del negocio de muestra.
# No lleva ningún nombre, precio ni teléfono escrito: vale para cualquier copia.
# Uso: python3 negocio.py <datos-del-negocio.js> [puerto]     (NAVEGADOR=chromium|firefox|webkit)
from cita_pasos import sigue_nuevo, hoja_hasta   # «Nuevo aviso» y las hojas van paso a paso (20-11-2026)
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, re, json
from datetime import datetime
from zoneinfo import ZoneInfo
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # el buzón de mejoras no sale a internet en las pruebas: ver buzon_falso.py

DATOS = open(sys.argv[1], encoding='utf-8').read()
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []; textos = []; sinfoto = set()
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt)

async def firma(pg, sel):
    # al centro de la pantalla: en WebKit, si el cuadro queda pegado abajo, la barra fija de la hoja se queda con el trazo (22-11-2026)
    await pg.locator(sel).evaluate("e=>e.scrollIntoView({block:'center',inline:'nearest'})"); await pg.wait_for_timeout(120)
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
    # Esta batería recorre la app sin servidor. Si los datos del negocio lo traen, aquí se le quita (sin tocar el archivo):
    # así nunca se llama al servidor de verdad. El modo servidor tiene su batería, servidor.py, contra uno local.
    if not propio or 'servidor' in DATOS: await pg.route('**/js/oficio-datos.js', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=DATOS + '\n;delete window.OFICIO_NEGOCIO.servidor;\n'))
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
        await pon_hora(ctx)      # un martes a media mañana: tarifa normal en cualquier horario razonable
        k = await pagina(ctx, 'cliente', False)
        await k.goto(B + 'cita.html'); await k.wait_for_selector('#f')
        N = await k.evaluate('OFICIO_NEGOCIO'); mismo = N['id'] == M['id']; demo = await k.evaluate('Oficio.DEMO')
        K = 'OficioNucleo'; clave = 'oficio:' + N['id']
        print(f"Negocio: {N['nombre']} ({N['id']}), {'con' if demo else 'sin'} avisos de muestra · motor {NAV}")

        # ---------- 1. el cliente pide cita ----------
        t = await guarda(k, 'cita')
        es(N['marca'][0] in (await k.locator('#marca').inner_text()) and N['tel'] in (await k.locator('#llama').inner_text()), 'cita: el rótulo y el teléfono son los del negocio')
        es(N['nombre'] in await k.title(), 'cita: el título de la pestaña lleva el nombre del negocio')
        es((await k.locator('#prb').count() == 1) == (N.get('prueba') is True), 'cita: el aviso de «copia de prueba» sale arriba solo si el negocio está marcado como prueba')
        es(await k.locator('input[name=av]').count() == len(N['averias']), 'cita: salen todas las averías del negocio')
        await k.locator('input[name=av]').first.check(force=True); await k.click('#sigue'); await k.wait_for_selector('#f[data-paso=det]')
        await k.click('#sigue'); await k.wait_for_selector('#f[data-paso=fr]')   # la cita va paso a paso: el calendario es el paso 3
        frs = await k.locator('[data-fr]').all_inner_texts()
        es(len(frs) == len(N['franjas']) and all(re.match(r'^de \d{1,2}(:\d{2})? a \d{1,2}(:\d{2})?', x.strip()) for x in frs), f'cita: las franjas se leen bien {frs[:4]}')
        await k.locator('[data-dia]').nth(0).click(); await k.locator('[data-fr]:not([disabled])').first.click()   # el primer día con cita (hoy ya no se ofrece)
        await k.click('#sigue'); await k.wait_for_selector('#f[data-paso=tu]')
        cp = list(N['zonas']['cp'].keys())[0]; fuera = '99999'
        await k.fill('#c_nomap', 'Clara Prueba'); await k.fill('#c_tel', '611 22 33 44'); await k.fill('#c_dir', 'C/ de la Prueba 12, 3.º'); await k.fill('#c_cp', fuera); await k.wait_for_timeout(200)
        t = await guarda(k, 'cita fuera de zona')
        es(N['ciudad'] in t, 'cita: fuera de zona, el aviso nombra la ciudad del negocio')
        await k.fill('#c_cp', cp); await k.click('button[type=submit]'); await k.wait_for_selector('#rConfirma'); await k.click('#rConfirma'); await k.wait_for_selector('.doc'); await k.wait_for_timeout(200)
        t = await guarda(k, 'resguardo'); m = re.search(re.escape(N['serie']) + r'-\d{4}', t); idc = m.group(0) if m else ''
        es(bool(idc), f"cita: el aviso lleva la serie del negocio ({idc or 'no sale'})")
        A = await k.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}')")
        es(A and A['origen'] == 'cita' and A['cli']['dis'] == N['zonas']['cp'][cp] and A['cita'], 'cita: entra con su zona, su franja y el canal apuntado')

        # ---------- 2. la oficina ----------
        c = await pagina(ctx, 'oficina', False); await c.set_viewport_size({'width': 1280, 'height': 860})
        await c.goto(B + 'app.html'); await c.wait_for_selector(f'a.fila[href="#/aviso/{idc}"]')
        es((await c.locator('#prb').count() == 1) == (N.get('prueba') is True) and await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'oficina: lo mismo con el aviso de «copia de prueba», y no descoloca la pantalla')
        t = await guarda(c, 'bandeja')
        es(N['marca'][0] in await c.locator('#marca').inner_text() and N['nombre'] in await c.title(), 'oficina: rótulo y título del negocio')
        es(all(x['n'] in t for x in N['tecnicos']), 'oficina: sale todo el equipo del negocio')
        await c.click(f'a.fila[href="#/aviso/{idc}"]'); await c.wait_for_selector('.tec[data-tec]')
        es(await c.locator('.tec[data-tec]').count() == len(N['tecnicos']), 'oficina: se puede asignar a cualquiera del equipo')
        # el primero del equipo que puede ir; en una demo con el día a medias puede estar en otro trabajo: se le deja libre
        tec = await c.evaluate("""(id=>{const S=Oficio.estado(),K=Oficio.K,A=S.avisos.find(a=>a.id===id),oc=new Set(S.avisos.filter(a=>['camino','curso'].includes(a.e)).map(a=>a.tec));
          const L=Oficio.N.tecnicos.map(t=>t.id).filter(t=>K.puedeIr(S,Oficio.cfg,A,t,Date.now())==='');return L.find(t=>!oc.has(t))||L[0]||Oficio.N.tecnicos[0].id})('%s')""" % idc)
        await c.evaluate("""(t=>{const q={rol:'tecnico',id:t};Oficio.estado().avisos.filter(a=>a.tec===t&&['camino','curso'].includes(a.e)).forEach(a=>Oficio.hacer(a.e==='camino'?{tipo:'ausente',id:a.id}:{tipo:'terminar',id:a.id,modo:'tarjeta',firma:'M14 78C30 70 44 34 50 14 54 44'},q))})('%s')""" % tec)
        await c.click(f'.tec[data-tec={tec}]'); await c.wait_for_timeout(300); await guarda(c, 'aviso asignado')
        # un aviso que entra por WhatsApp y se apunta a mano
        await c.goto(B + 'app.html#/nuevo'); await c.wait_for_selector('#fNuevo')
        es(await c.locator('[data-b-av][role=radio]').count() == len(N['averias']) and await c.locator('[data-b-av][aria-checked=true]').count() == 0, 'nuevo aviso: salen las averías del negocio y ninguna viene elegida')
        # paso a paso (20-11-2026); cada paso se guarda para buscar en él restos del negocio de muestra
        await guarda(c, 'nuevo aviso: qué le pasa'); await c.click('[data-b-av]'); await sigue_nuevo(c, 'cu')
        await c.click('[data-b-cu="cita"]'); await guarda(c, 'nuevo aviso: cuándo'); await c.click('[data-b-cu="urg"]'); await sigue_nuevo(c, 'qui')
        await c.fill('#n_tel', '622 33 44 55'); await c.fill('#n_nomap', 'Wences Canal'); await guarda(c, 'nuevo aviso: quién'); await sigue_nuevo(c, 'don')
        await c.fill('#n_dir', 'Av. de la Prueba 3, bajo'); await c.fill('#n_cp', cp); await guarda(c, 'nuevo aviso: dónde'); await sigue_nuevo(c, 'fin')
        await c.click('[data-b-or=whatsapp]'); await guarda(c, 'nuevo aviso: revisar'); await c.click('#fNuevo button[type=submit]'); await c.wait_for_timeout(400)
        S = await c.evaluate(f"JSON.parse(localStorage.getItem('{clave}'))"); W = next((a for a in S['avisos'] if a['cli']['nombre'] == 'Wences' and a['cli']['apellidos'] == 'Canal'), None)
        es(W and W['origen'] == 'whatsapp' and W['urg'], 'nuevo aviso: queda apuntado que entró por WhatsApp')
        await c.goto(B + 'app.html'); await c.wait_for_selector('.fila'); t = await guarda(c, 'bandeja con dos')
        es('por WhatsApp' in t, 'oficina: la bandeja dice por dónde entró')
        await c.goto(B + 'app.html#/agenda'); await c.wait_for_timeout(400); t = await guarda(c, 'agenda')
        es(not re.search(r'\d\.\d+ a |a \d+\.\d', t) and N['tecnicos'][0]['n'] in t, 'agenda: las franjas se leen bien y sale quién va')
        for ancho in (320, 390):
            await c.set_viewport_size({'width': ancho, 'height': 800}); await c.goto(B + 'app.html#/nuevo'); await c.wait_for_selector('#fNuevo')
            es(await c.evaluate('document.documentElement.scrollWidth') <= ancho + 1, f'nuevo aviso a {ancho} px: nada se sale')
        # una marca larga (el ensayo del alta lo encontró el 16-11-2026 con «Lampistes Gràcia»): a 320 px tampoco se sale nada
        cl = await br.new_context(viewport={'width': 320, 'height': 800}, locale='es-ES', timezone_id='Europe/Madrid'); await pon_hora(cl); pl = await cl.new_page()
        await pl.route('**/js/oficio-datos.js', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=DATOS + "\n;window.OFICIO_NEGOCIO.marca=['Fontanería','Martínez Hermanos'];delete window.OFICIO_NEGOCIO.servidor;\n"))
        await pl.goto(B + 'app.html#/nuevo'); await pl.wait_for_selector('#fNuevo')
        es(await pl.evaluate('document.documentElement.scrollWidth') <= 321 and 'Martínez' in await pl.inner_text('#marca'), 'una marca larga tampoco se sale a 320 px: la marca encoge y la sesión se queda en su círculo')
        await cl.close()
        await c.set_viewport_size({'width': 1280, 'height': 860})

        # ---------- 3. el técnico: los tres toques, con los precios del negocio ----------
        tl = await pagina(ctx, 'tecnico', False)
        await tl.goto(B + f'app.html?papel=tecnico&tec={tec}#/aviso/{idc}'); await tl.wait_for_selector('.accion button')
        antes = await tl.evaluate("(()=>{const b=document.querySelector('.accion button');return{t:b.textContent,d:b.disabled,voy:!!document.querySelector('[data-a=voy]')}})()")
        es(antes['d'] and 'Disponible' in antes['t'] and not antes['voy'], f'técnico: con la cita de otro día, «Voy» sale apagado y dice cuándo se enciende ({antes["t"]})')
        # a la hora de abrir (media hora antes de su franja, hora de Madrid) se enciende
        d = await tl.evaluate(f"(()=>{{const A=Oficio.estado().avisos.find(a=>a.id==='{idc}');return OficioNucleo.voyDesde(Oficio.cfg,A)}})()")
        m = d['min'] + 1; h = datetime.fromisoformat(d['dia']).replace(hour=m // 60, minute=m % 60, tzinfo=ZoneInfo('Europe/Madrid'))
        # (la demo se rehace sola si su estado tiene más de 8 horas: al adelantar el reloj, se marca como recién abierta)
        await pon_hora(ctx, h.isoformat()); await tl.evaluate(f"(()=>{{const x=JSON.parse(localStorage.getItem('{clave}'));x.t0=Date.now();localStorage.setItem('{clave}',JSON.stringify(x))}})()")
        await tl.reload(); await tl.wait_for_selector('[data-a=voy]')
        es(not await tl.locator('.accion button[disabled]').count(), f'técnico: a las {m // 60}:{m % 60:02d} del día de la cita, «Voy» ya se puede pulsar')
        await tl.click('[data-a=voy]'); await tl.wait_for_selector('[data-a=empezar]'); await guarda(tl, 'de camino')
        await tl.click('[data-a=empezar]'); await tl.wait_for_selector('dialog[open] #pL'); await tl.wait_for_timeout(250)
        t = await guarda(tl, 'presupuesto')   # paso a paso (20-11-2026): lo que se hace; luego el precio y la firma
        av = next(a for a in N['averias'] if a['id'] == A['av'])
        esperado = await tl.evaluate(f"(()=>{{const K={K},c=Oficio.cfg;return K.eur(K.precio(c,{json.dumps(av['ini'])},{{}}).total)}})()")
        es(esperado in await tl.locator('#pT').inner_text(), f'presupuesto: el total sale del catálogo del negocio ({esperado})')
        es(all(N['catalogo'][l['k']]['t'] in t for l in av['ini']), 'presupuesto: las líneas llevan los nombres del catálogo')
        es('Tarifa normal' in t, 'presupuesto: con cita, tarifa normal')
        await hoja_hasta(tl, '#pT'); await guarda(tl, 'presupuesto: el precio')
        await hoja_hasta(tl, '#pF'); await tl.wait_for_timeout(200); await guarda(tl, 'presupuesto: la firma')
        await firma(tl, '#pF')
        es(await tl.locator('#pOk').is_disabled() and '14 días' in await tl.locator('#pDes').inner_text(), 'presupuesto con cita: el cliente ve sus 14 días y, sin marcar la casilla, no se empieza')
        await tl.click('#pPide'); await tl.click('#pOk'); await tl.wait_for_timeout(400)
        # ampliar con «más tiempo»: sube justo un paso del concepto por horas del negocio
        horas = await tl.evaluate('Oficio.cfg.horas')
        if horas and any(l['k'] == horas for l in av['ini']):
            antes = (await tl.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}').tot.total"))
            await tl.click('[data-a=ampliar]'); await tl.wait_for_selector('#pC'); await tl.click(f'#pC [data-add={horas}]'); await tl.wait_for_timeout(150)
            await hoja_hasta(tl, '#pF'); await tl.wait_for_timeout(200); await firma(tl, '#pF'); await tl.locator('#pPide').check()   # marcada, esté como esté: pide que lo hagan ya
            if await tl.locator('#pOk').is_disabled():   # si aún no se puede firmar, que el registro diga por qué
                print('  aviso: «Firmado: añadir» sigue cerrado tras firmar:', await tl.evaluate("(()=>{const f=document.querySelector('#pF'),b=f.getBoundingClientRect(),e=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return JSON.stringify({pPide:(document.querySelectorAll('#pPide').length)+' · '+[...document.querySelectorAll('#pPide')].map(x=>x.checked).join(','),lienzo:[Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)],encima:e?e.tagName+'#'+e.id+'.'+e.className:null,ventana:[innerWidth,innerHeight]})})()"), flush=True)
            await tl.click('#pOk'); await tl.wait_for_timeout(400)
            paso = await tl.evaluate(f"(()=>{{const c=Oficio.cfg,it=c.cat[c.horas];return Math.round(it.p10*it.paso)}})()")
            ahora = (await tl.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}').tot.total"))
            es(ahora - antes == paso, f'ampliar: «más tiempo» suma un paso de mano de obra ({antes} → {ahora}, paso {paso})')
        await tl.click('[data-a=terminar]'); await tl.wait_for_selector('#tM'); await tl.click('#tM [data-modo=efectivo]'); await guarda(tl, 'cierre'); await hoja_hasta(tl, '#tOk'); await guarda(tl, 'cierre: la firma'); await tl.click('#tOk'); await tl.wait_for_timeout(500)
        F = await tl.evaluate(f"JSON.parse(localStorage.getItem('{clave}')).avisos.find(a=>a.id==='{idc}')")
        es(F['e'] == 'hecho' and F['pago']['cobrado'] and F['gar'], 'los tres toques cierran el aviso, con cobro y garantía')
        for doc in ('presupuesto', 'parte', 'garantia'):
            await tl.goto(B + f'app.html?papel=tecnico&tec={tec}#/papel/{idc}/{doc}'); await tl.wait_for_selector('.doc'); t = await guarda(tl, doc)
            es(N['razon'] in t and N['nif'] in t and N['marca'][0] in t, f'{doc}: lleva la razón social, el NIF y el rótulo del negocio')
            if doc != 'garantia': es(N['ciudad'] in t and 'Clara Prueba' in t, f'{doc}: el cliente, con la ciudad del negocio')

        # ---------- 4. una urgencia: el recargo que se lee es el del negocio ----------
        await pon_hora(ctx, '2026-11-15T11:00:00+01:00')      # domingo
        u = await tl.evaluate(f"Oficio.hacer({{tipo:'pedir',av:'{N['averias'][0]['id']}',origen:'llamada',cli:{{nombre:'Urge Domingo',apellidos:'Prueba',tel:'633445566',dir:'C/ de la Prisa 1',cp:'{cp}'}}}},{{rol:'centralita'}}).id")
        tu = await tl.evaluate(f"(()=>{{const S=Oficio.estado(),A=S.avisos.find(a=>a.id==='{u}');return Object.keys(Oficio.cfg.tec).find(x=>!OficioNucleo.puedeIr(S,Oficio.cfg,A,x,Date.now()))}})()")
        es(bool(tu), 'urgencia en domingo: hay alguien a quien se le puede asignar')
        no = [x['id'] for x in N['tecnicos'] if x['id'] != tu and not x.get('guardia')] if any(x.get('guardia') for x in N['tecnicos']) else []
        if no: es(await tl.evaluate(f"Oficio.hacer({{tipo:'asignar',id:'{u}',tec:'{no[0]}'}},{{rol:'centralita'}}).err") == 'horario', 'urgencia en domingo: a quien no hace guardias no se le puede asignar')
        # la pantalla dice lo mismo que la regla: en el botón de quien no puede ir pone por qué, y al tocarlo no se asigna
        await c.goto(B + f'app.html#/aviso/{u}'); await c.reload(); await c.wait_for_selector('.tec[data-tec]')
        vista = await c.evaluate(f"(()=>{{const S=Oficio.estado(),A=S.avisos.find(a=>a.id==='{u}');return [...document.querySelectorAll('.tec[data-tec]')].map(b=>({{id:b.dataset.tec,no:b.classList.contains('no'),txt:b.querySelector('small').textContent,regla:OficioNucleo.puedeIr(S,Oficio.cfg,A,b.dataset.tec,Date.now())}}))}})()")
        es(len(vista) == len(N['tecnicos']) and all(v['no'] == bool(v['regla']) for v in vista), f'urgencia en domingo: la pantalla marca a quien no puede ir, igual que la regla {[(v["id"], v["regla"]) for v in vista]}')
        es(all('Libre ahora' not in v['txt'] for v in vista if v['regla']), f'urgencia en domingo: en el botón de quien no puede ir pone por qué {[v["txt"] for v in vista if v["regla"]]}')
        if no:
            await c.click(f'.tec[data-tec={no[0]}]'); await c.wait_for_timeout(300)
            dicho = await c.locator('#toast').inner_text(); sigue = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{u}').tec||''")
            es('no trabaja' in dicho and not sigue, f'urgencia en domingo: al tocar a quien no puede ir, la app lo explica y no asigna («{dicho}», técnico «{sigue}»)')
        await tl.evaluate(f"Oficio.hacer({{tipo:'asignar',id:'{u}',tec:'{tu}'}},{{rol:'centralita'}})")
        tec = tu
        await tl.goto(B + f'app.html?papel=tecnico&tec={tec}#/aviso/{u}'); await tl.wait_for_selector('[data-a=voy]'); await tl.click('[data-a=voy]'); await tl.wait_for_selector('[data-a=empezar]')
        await tl.click('[data-a=empezar]'); await tl.wait_for_selector('dialog[open] #pL'); t = await guarda(tl, 'presupuesto urgente')
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
