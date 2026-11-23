# La auditoría UX (16-11-2026), tercera tanda, en pantalla: «Por hacer» en «Ahora» y «Después», «Asignar a» con «Deshacer»,
# la barra fija de la ficha de la oficina (también a 320 px), lo escrito dentro de las barras del tablero, el mensaje con
# su destinatario, su motivo, su caducidad y lo último que se le mandó, el pago, el parte y la factura en la zona del cliente
# y el nombre de cada papel al guardarlo en PDF.
# Uso: python3 auditoria.py [puerto]   (por defecto 8765) · NAVEGADOR=chromium|firefox|webkit
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json, re
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # el buzón de mejoras no sale a internet en las pruebas: ver buzon_falso.py
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt)
def oye(pg, nombre):
    pg.on('console', lambda m: webkit_linux.consola(m, nombre, errores))
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    pg.on('response', lambda r: errores.append(f'{nombre}: {r.status} {r.url}') if r.status >= 400 else None)
    return pg
async def hasta(pg, js, ms=7000):
    try: await pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
async def toast(pg, trozo): return await hasta(pg, f"(()=>{{const e=document.querySelector('#toast');return e&&e.classList.contains('on')&&e.textContent.includes({json.dumps(trozo)})}})()")
async def texto(pg, sel): return (await pg.locator(sel).first.inner_text()) if await pg.locator(sel).count() else ''
AV = "(id=>{const a=Oficio.estado().avisos.find(x=>x.id===id);return a?JSON.parse(JSON.stringify(a)):null})"
C = "{rol:'centralita',id:'oficina'}"
# quién puede ir a un aviso ahora (sin otro en la calle): el primero, o todos
PUEDEN = "(id=>{const K=OficioNucleo,cfg=Oficio.cfg,S=Oficio.estado(),A=S.avisos.find(a=>a.id===id);return Object.keys(cfg.tec).filter(x=>!K.puedeIr(S,cfg,A,x,Date.now())&&!S.avisos.some(y=>y.tec===x&&(y.e==='camino'||y.e==='curso')))})"
# la barra de la ficha: ¿se ve entera, pegada abajo, sin que nada se salga?
BARRA = """(()=>{const b=document.querySelector('.accion.of');if(!b)return null;const r=b.getBoundingClientRect();
 return{arriba:Math.round(r.top),abajo:Math.round(r.bottom),alto:innerHeight,ancho:innerWidth,izq:Math.round(r.left),der:Math.round(r.right),
  sale:[...b.querySelectorAll('button')].filter(x=>x.scrollWidth>x.clientWidth+1||x.getBoundingClientRect().height<43.5).map(x=>x.textContent),texto:b.innerText}})()"""

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        ctx = await br.new_context(viewport={'width': 1280, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid'); await pon_hora(ctx)
        c = oye(await ctx.new_page(), 'oficina'); await c.goto(B + 'app.html#/bandeja/hacer'); await c.wait_for_selector('.alertas')

        # ---------- 1. «Por hacer», en «Ahora» y «Después» (UX-15) ----------
        ph = await c.locator('#bResto .ph').all_inner_texts(); L = c.locator('#bResto .alertas')
        es(ph == ['Ahora', 'Después'] and await L.count() == 2, f'«Por hacer» en dos: «Ahora» y «Después» ({ph})')
        ahora, despues = await L.nth(0).inner_text(), await L.nth(1).inner_text()
        es('mensajes por mandar' in ahora and 'por reponer' in despues and 'seguimiento' in despues and 'seguimiento' not in ahora,
           f'en «Ahora», los mensajes que esperan; en «Después», reponer la furgoneta y el seguimiento ({ahora[:60]!r} | {despues[:80]!r})')
        # un aviso que entra por el WhatsApp de la web, solo con el teléfono: no se puede asignar y va a «Ahora»
        r = await c.evaluate("Oficio.hacer({tipo:'pedir',av:'fuga',origen:'web',cli:{tel:'611222333'}},{rol:'cliente'})")
        es(r.get('ok'), f'entra un aviso por el WhatsApp de la web, solo con el teléfono ({r})'); sd = r.get('id')
        await c.goto(B + 'app.html#/bandeja/hacer'); await c.wait_for_selector('.alertas')
        li = c.locator('#bResto .alertas').nth(0).locator('li', has_text='sin los datos del cliente')
        es(await li.count() == 1 and await li.locator('a').get_attribute('href') == f'#/aviso/{sd}' and 'no se puede asignar' in await li.inner_text(),
           'en «Ahora»: «1 aviso sin los datos del cliente», que lleva a ese aviso')
        await c.goto(B + 'app.html#/equipo'); await c.wait_for_selector('.tab')
        es('sin los datos del cliente' in await texto(c, '.alertas'), 'y también en el «Por hacer» de «Equipo»: sin datos no se reparte')
        await c.goto(B + f'app.html#/aviso/{sd}'); await c.wait_for_selector('.accion.of')
        es(await c.locator('.accion.of .btn.pri[data-a=completar]').count() == 1, 'en su ficha, lo primero de la barra es «Completar los datos»')

        # ---------- 2. la barra fija de la ficha (UX-17), de 320 px al ordenador ----------
        urg = await c.evaluate("Oficio.estado().avisos.filter(a=>a.e==='nuevo'&&!a.cita&&a.cli.dir).map(a=>a.id)[0]")
        for w, h in ((320, 568), (375, 667), (1280, 900)):
            await c.set_viewport_size({'width': w, 'height': h}); await c.goto(B + f'app.html#/aviso/{urg}'); await c.wait_for_selector('.accion.of'); await c.wait_for_timeout(150)
            b = await c.evaluate(BARRA)
            es(b and b['abajo'] == b['alto'] and b['arriba'] > b['alto'] * .55 and not b['sale'] and 'Sin técnico · urgente' in b['texto'] and 'Asignar a' in b['texto'] and 'Cancelar' in b['texto'],
               f'{w} px: la barra se ve entera y pegada abajo nada más abrir la ficha, con el estado, «Asignar a» y «Cancelar»; ningún botón se sale ni baja de 44 px ({b})')
            await c.evaluate("(()=>{const s=document.querySelector('#v .col:last-child')||document.scrollingElement;s.scrollTop=s.scrollHeight/2;scrollTo(0,document.body.scrollHeight/2)})()"); await c.wait_for_timeout(150)
            b2 = await c.evaluate(BARRA)
            es(b2 and b2['abajo'] == b2['alto'], f'{w} px: a media ficha sigue abajo ({b2 and b2["abajo"]} de {b2 and b2["alto"]})')
        await c.set_viewport_size({'width': 1280, 'height': 900})
        # «Elegir técnico» lleva a «¿Quién va?»; en una cita no se propone a nadie a ciegas
        cid = await c.evaluate("Oficio.estado().avisos.filter(a=>a.e==='nuevo'&&a.cita&&a.cli.dir).map(a=>a.id)[0]")
        await c.goto(B + f'app.html#/aviso/{cid}'); await c.wait_for_selector('.accion.of')
        es(await c.locator('.accion.of .btn.pri[data-a=irSec]').inner_text() == 'Elegir técnico' and 'Cambiar la hora' in await texto(c, '.accion.of'), 'en una cita sin técnico: «Elegir técnico» y «Cambiar la hora»')
        await c.click('.accion.of [data-a=irSec]')
        es(await hasta(c, "document.activeElement&&document.activeElement.id==='reparto'"), '«Elegir técnico» lleva a «¿Quién va?»')

        # ---------- 3. «Asignar a X» y «Deshacer» (UX-16) ----------
        await c.goto(B + f'app.html#/aviso/{urg}'); await c.wait_for_selector('.accion.of [data-a=asignar]')
        quien = await c.get_attribute('.accion.of [data-a=asignar]', 'data-tec'); n_h = len((await c.evaluate(AV + f"('{urg}')"))['h'])
        await c.click('.accion.of [data-a=asignar]')
        es(await toast(c, 'Asignado a') and await c.locator('#toast .tacc').inner_text() == 'Deshacer' and (await c.evaluate(AV + f"('{urg}')"))['tec'] == quien,
           f'«Asignar a» desde la barra: queda asignado y el aviso corto ofrece «Deshacer» ({quien})')
        es('Asignado a' in await texto(c, '.accion.of'), 'la barra pasa a decir «Asignado a …»')
        await c.click('#toast .tacc')
        A = await c.evaluate(AV + f"('{urg}')")
        es(await toast(c, 'Deshecho') and A['e'] == 'nuevo' and A['tec'] == '' and A['h'][-1]['txt'].startswith('Sin técnico') and len(A['h']) == n_h + 2,
           f'«Deshacer»: el aviso vuelve a estar sin técnico y queda escrito ({A["e"]}, {A["h"][-1]["txt"]!r})')
        # un cambio de técnico se deshace volviendo al de antes
        tecs = await c.evaluate(PUEDEN + f"('{cid}')")
        es(len(tecs) >= 2, f'hay dos técnicos que pueden ir a la cita {cid} ({tecs})')
        if len(tecs) >= 2:
            await c.goto(B + f'app.html#/aviso/{cid}'); await c.wait_for_selector(f'.tec[data-tec="{tecs[0]}"]')
            await c.click(f'.tec[data-tec="{tecs[0]}"]'); await toast(c, 'Asignado a')
            await c.wait_for_selector(f'.tec[data-tec="{tecs[1]}"]'); await c.click(f'.tec[data-tec="{tecs[1]}"]')
            es(await toast(c, 'Cambiado: ahora va') and await c.locator('#toast .tacc').count() == 1, 'cambiar de técnico también se puede deshacer')
            await c.click('#toast .tacc')
            A = await c.evaluate(AV + f"('{cid}')")
            es(await toast(c, 'lo vuelve a llevar') and A['tec'] == tecs[0] and A['e'] == 'asignado', f'«Deshacer» un cambio: vuelve a llevarlo quien lo llevaba ({A["tec"]})')
            # pasado el rato, el aviso corto se va y ya no hay nada que deshacer
            es(await hasta(c, "!document.querySelector('#toast').classList.contains('on')", 9000), 'el aviso con «Deshacer» se va solo')

        # ---------- 4. el tablero: lo escrito dentro de cada barra (UX-19) ----------
        nad = await c.evaluate("""(()=>{const K=OficioNucleo,cfg=Oficio.cfg,N=OFICIO_NEGOCIO;let S=Oficio.estado();
          const r=Oficio.hacer({tipo:'pedir',av:'grifo',origen:'llamada',cli:{nombre:'Nadie',apellidos:'En Casa',tel:'611222334',dir:'C/ Vacía 3',cp:Object.keys(N.zonas.cp)[0]}},""" + C + """);if(!r.ok)return r;
          S=Oficio.estado();const A=S.avisos.find(a=>a.id===r.id),tec=Object.keys(cfg.tec).find(x=>!K.puedeIr(S,cfg,A,x,Date.now())&&!S.avisos.some(y=>y.tec===x&&(y.e==='camino'||y.e==='curso')));if(!tec)return{err:'sin técnico'};
          const T={rol:'tecnico',id:tec};for(const a of [[{tipo:'asignar',id:r.id,tec},""" + C + """],[{tipo:'voy',id:r.id},T],[{tipo:'ausente',id:r.id},T]]){const x=Oficio.hacer(a[0],a[1]);if(!x.ok)return x}return{id:r.id,tec}})()""")
        es('id' in nad, f'un aviso al que se fue y no había nadie ({nad})')
        await c.goto(B + 'app.html#/equipo'); await c.wait_for_selector('.tab .dia')
        tb = await c.evaluate("""(()=>({h:[...document.querySelectorAll('.tab .dj.h:not(.n) span')].map(s=>s.textContent),n:[...document.querySelectorAll('.tab .dj.n span')].map(s=>s.textContent),
          x:[...document.querySelectorAll('.tab .dx')].map(s=>s.textContent),ley:document.querySelector('.tabl').textContent}))()""")
        es(tb['h'] and all(x.startswith('✓ ') for x in tb['h']) and '✓ Hecho' in tb['ley'], f'tablero: lo hecho lleva «✓» delante, también en la leyenda ({tb["h"][:3]})')
        es(tb['n'] and all(x == 'No había nadie' for x in tb['n']), f'tablero: donde no había nadie lo pone dentro de la barra ({tb["n"]})')
        es(tb['x'] and all(x == 'No trabaja' for x in tb['x']), f'tablero: lo que no trabaja lleva su texto dentro ({len(tb["x"])} tramos)')
        vis = await c.evaluate("[...document.querySelectorAll('.tab .dx span')].some(s=>getComputedStyle(s).visibility==='visible')")
        es(vis, 'tablero: al menos un «No trabaja» se lee (los tramos muy cortos lo esconden y quedan las rayas)')

        # ---------- 5. el mensaje: para quién, por qué, cuándo caduca y lo último que se le mandó (UX-21) ----------
        await c.goto(B + 'app.html#/bandeja/hacer'); await c.wait_for_selector('.alertas [data-a="mensajes"]')
        await c.click('.alertas [data-a="mensajes"]'); await c.wait_for_selector('dialog .msgs [data-a=msg]')
        await c.locator('dialog .msgs [data-a=msg]').first.click(); await c.wait_for_selector('dialog .mdat')
        md = await c.locator('dialog .mdat').last.inner_text()
        es(all(x in md for x in ('Para', 'Por qué', 'Último mensaje')) and re.search(r'\d{3} \d{2} \d{2} \d{2}', md), f'antes de mandarlo: para quién (nombre y teléfono), por qué y lo último que se le mandó ({md[:140]!r})')
        es(await c.locator('dialog .wa-b').count() >= 1 and await c.locator('dialog #mNo').count() == 1, 'y el texto que sale, con «No hace falta mandarlo»')
        await c.keyboard.press('Escape'); await c.wait_for_timeout(200)
        await c.goto(B + 'app.html#/bandeja/hacer'); await c.wait_for_selector('.alertas [data-a="seguir"]')
        await c.click('.alertas [data-a="seguir"]'); await c.wait_for_selector('dialog .msgs li')
        filas = await c.locator('dialog .msgs li').all_inner_texts()
        es(filas and all('caduca el' in f for f in filas), f'seguimiento: cada uno dice cuándo caduca ({filas[0][:90]!r})')
        await c.locator('dialog .msgs [data-a=msg]').first.click(); await c.wait_for_selector('dialog .mdat')
        md = await c.locator('dialog .mdat').last.inner_text()
        es('Caduca' in md and 'después ya no sale' in md, f'y en su hoja, la fecha en que caduca ({md[:160]!r})')
        await c.keyboard.press('Escape')

        # ---------- 6. el nombre de cada papel: el del archivo al guardarlo en PDF (UX-25) ----------
        hid = await c.evaluate("Oficio.estado().avisos.filter(a=>a.e==='hecho'&&a.tot&&a.pres).map(a=>a.id)[0]")
        for tipo, nombre in (('parte', 'Parte de trabajo'), ('presupuesto', 'Presupuesto'), ('garantia', 'Garantía')):
            await c.goto(B + f'app.html#/papel/{hid}/{tipo}'); await c.wait_for_selector('.doc')
            t = await c.title()
            es(re.match(rf'^{nombre} {hid} \d{{2}}-\d{{2}}-\d{{4}} · ', t) is not None, f'el título del papel es su nombre: «{t}»')
        await c.goto(B + 'app.html#/bandeja/hacer'); await c.wait_for_selector('.alertas')
        es('por dentro' in await c.title(), 'al salir del papel, el título vuelve a ser el de la app')
        await ctx.close()

        # ---------- 7. la zona del cliente: el pago, el parte y la factura, cada uno por su lado (UX-08) ----------
        zx = await br.new_context(viewport={'width': 375, 'height': 760}, locale='es-ES', timezone_id='Europe/Madrid'); await pon_hora(zx)
        z = oye(await zx.new_page(), 'zona'); await z.goto(B + 'cliente.html'); await z.wait_for_selector('#v button')
        await z.click('#v button:has-text("Andreu Soler")'); await z.wait_for_selector('#salir')
        await z.goto(B + 'cliente.html#/trabajos'); await z.wait_for_selector('.tj .tres')   # lo terminado, en «Trabajos» (19-11-2026)
        tres = await z.locator('.tj .tres').first.inner_text()
        es('Pendiente de pago' in tres and 'Parte de trabajo' in tres and 'Factura' in tres and 'aparte' in tres,
           f'un trabajo terminado y sin pagar: «Pendiente de pago», el parte y quién hace la factura, cada uno aparte ({tres!r})')
        es(await z.locator('.tj .tres .pend').count() >= 1, 'lo que tiene que hacer él (pagar) destaca')
        await z.locator('.tj:has(.tres)').first.click(); await z.wait_for_selector('article.doc')
        es(re.match(r'^Parte de trabajo R-\d{4} \d{2}-\d{2}-\d{4} · ', await z.title()) is not None, f'su parte, con nombre de archivo claro: «{await z.title()}»')
        await zx.close()

        es(not errores, 'sin errores en la consola ni archivos que falten: ' + '; '.join(errores[:4]))
        await br.close()
    webkit_linux.resumen_rarezas()
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan.' if fallos else '.'))
    sys.exit(1 if fallos else 0)

asyncio.run(main())
