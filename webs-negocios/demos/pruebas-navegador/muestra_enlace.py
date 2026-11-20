# El enlace de la muestra con el nombre de un negocio (19-11-2026, para las cartas de captación): la demo con su nombre,
# el aviso de arriba (qué es, para quién, hasta cuándo y «Me interesa»), que sigue en la misma pestaña y en los marcos de
# la página de los tres móviles, y que caducada, a más de 90 días o mal hecha no cambia nada.
# Uso: python3 muestra_enlace.py [puerto]
import os, sys
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, base64, json, datetime
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # ningún navegador de las pruebas sale a internet: ver buzon_falso.py
PUERTO = sys.argv[1] if len(sys.argv) > 1 else '8765'
B = f'http://127.0.0.1:{PUERTO}/'
tok = lambda o: base64.urlsafe_b64encode(json.dumps(o, ensure_ascii=False).encode()).decode().rstrip('=')

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
        await pg.goto(B + 'cita.html'); await pg.wait_for_selector('main h1')
        hoy = datetime.date.fromisoformat(await pg.evaluate("new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid'}).format(new Date())"))
        es(await pg.locator('#muestraOoox').count() == 0 and await pg.evaluate('Oficio.N.nombre') == 'Ramírez 24 h', 'sin enlace de muestra, la demo de siempre')
        h = (hoy + datetime.timedelta(days=20)).isoformat(); M = tok({'v': 1, 'n': 'Fontanería Serra', 't': '600123456', 'd': "Carrer de Verdi, 80", 'z': 'Sants', 'h': h})
        await pg.goto(B + 'cita.html?m=' + M); await pg.wait_for_selector('#muestraOoox')
        a = await pg.locator('#muestraOoox').inner_text(); wa = await pg.get_attribute('#muestraOoox a', 'href')
        es('Fontanería Serra' in a and 'No es su web' in a and '-'.join(reversed(h.split('-'))) in a, 'el aviso de arriba: para quién, que no es su web y hasta cuándo')
        es(wa.startswith('https://wa.me/34670409550?text=') and 'Fontaner%C3%ADa%20Serra' in wa, '«Me interesa» abre el WhatsApp de Oscar con el nombre del negocio')
        N = await pg.evaluate('({n:Oficio.N.nombre,m:Oficio.N.marca,r:Oficio.N.razon,d:Oficio.N.dir,t:Oficio.N.tel})')
        es(N == {'n': 'Fontanería Serra', 'm': ['Fontanería', 'Serra'], 'r': 'Fontanería Serra', 'd': "Carrer de Verdi, 80, Barcelona", 't': '600 12 34 56'} and 'Fontanería Serra' in await pg.title() and 'Ramírez' not in await pg.locator('header').first.inner_text(),
           f'la demo con sus datos: su nombre, su marca, su dirección y su teléfono: {N}')
        es('600 12 34 56' in await pg.locator('header').first.inner_text(), 'su teléfono, arriba en su web de citas')
        await pg.goto(B + 'app.html'); await pg.wait_for_selector('#muestraOoox')
        es(await pg.evaluate('Oficio.N.nombre') == 'Fontanería Serra' and await pg.evaluate("Oficio.N.tecnicos.every(t=>!/Ramírez/.test(t.coche||''))"), 'en la misma pestaña sigue con su nombre: la oficina y las furgonetas')
        # la página de los tres móviles: el aviso arriba, una vez; los marcos con su nombre
        await pg.goto(B + 'prueba.html?m=' + M); await pg.wait_for_selector('#muestraOoox'); await pg.wait_for_timeout(1500)
        noms = []
        for f in pg.frames[1:]:
            try: noms.append(await f.evaluate('window.Oficio&&Oficio.N&&Oficio.N.nombre'))
            except Exception: pass
        dentro = 0
        for f in pg.frames[1:]:
            try: dentro += await f.evaluate("document.querySelectorAll('#muestraOoox').length")
            except Exception: pass
        es(await pg.locator('#muestraOoox').count() == 1 and dentro == 0 and noms and all(n == 'Fontanería Serra' for n in noms if n), f'los tres móviles con su nombre ({noms}) y el aviso solo arriba')
        es('Serra' in await pg.locator('.fila1 .wm').inner_text() and 'Ramírez' not in await pg.locator('.fila1 .wm').inner_text(), 'y la marca de arriba, la suya')
        es(await pg.evaluate("[...document.querySelectorAll('[data-muestra-oculta]')].every(e=>e.hidden)") and await pg.locator('[data-muestra-nombre]').first.inner_text() == 'Fontanería Serra', 'sin el fundador inventado, y «Volver a la web de» con su nombre')
        # su web: su nombre, su teléfono y su dirección en todo; ni el fundador ni las reseñas de ejemplo con su nombre
        await pg.goto(B + 'index.html?m=' + M); await pg.wait_for_selector('#muestraOoox'); await pg.wait_for_timeout(900)
        txt = await pg.evaluate('document.body.innerText')
        es('Ramírez' not in txt and 'Fontanería Serra' in txt and 'Fontanería Serra' in await pg.title() and 'Fontanería' in await pg.locator('header .wm').inner_text(), 'su web, con su nombre en todo y nada del negocio de ejemplo')
        es(await pg.evaluate('document.documentElement.dataset.telTxt') == '600 12 34 56' and '930 00 00 00' not in txt, 'y con su teléfono')
        es(await pg.evaluate("[...document.querySelectorAll('.gfoto,#verRes')].every(e=>e.hidden)") and 'Muestra hecha por OOOX para Fontanería Serra' in txt, 'sin la foto del fundador ni las reseñas de ejemplo, y el pie dice para quién es')
        es('Fontanería Serra' in await pg.evaluate("JSON.parse(document.getElementById('i18n').textContent).ca['ga.k']") and 'Ramírez' not in await pg.evaluate("document.getElementById('i18n').textContent"), 'también en catalán y en inglés')
        o2 = await ctx.new_page(); await o2.goto(B + 'index.html'); await o2.wait_for_timeout(600)
        es(await o2.locator('#muestraOoox').count() == 0 and 'Ramírez' in await o2.evaluate('document.body.innerText'), 'en otra pestaña, sin el enlace, la web de siempre'); await o2.close()
        es(await pg.evaluate("[...document.querySelectorAll('[data-t=\"ga.d3\"]')].every(e=>e.closest('li').hidden)") and '540' not in txt, 'sin su nota de Google en el enlace, la nota inventada no sale')
        es('Sants' not in await pg.evaluate("document.querySelector('[data-t=\"ba.ley\"]').textContent+document.querySelector('[data-t=\"fi.l\"]').textContent") and "Taller: Carrer de Verdi, 80." in txt, 'el taller ya no está en Sants: está en su dirección')
        es(await pg.evaluate("[...document.querySelectorAll('.fin .ffoto img')].every(e=>e.getAttribute('src').includes('-liso'))") and await pg.evaluate("performance.getEntriesByType('resource').some(e=>/entrada-[hv]-liso\\.mp4/.test(e.name))"), 'la furgoneta de la entrada y la foto del final, sin el rótulo del negocio de ejemplo')
        await pg.evaluate("document.querySelector('[data-wa]').click()"); await pg.wait_for_timeout(600)
        dlg = await pg.evaluate("(document.querySelector('.wa-hd')||{}).innerText||''")
        es('Fontanería Serra' in dlg and 'Ramírez' not in dlg and dlg.strip().startswith('F'), 'la vista previa de WhatsApp, con su nombre y su inicial')
        # con su nota de Google y su distrito: su nota de verdad, y los minutos contados desde su barrio
        M2 = tok({'v': 1, 'n': 'Fontanería Serra', 't': '600123456', 'd': "Carrer de Verdi, 80", 'r': 4.9, 'c': 163, 'b': 'gra', 'h': h})
        p3 = await ctx.new_page(); await p3.goto(B + 'index.html?m=' + M2); await p3.wait_for_selector('#mapa .d[data-id="gra"]'); await p3.wait_for_timeout(500)
        li = await p3.evaluate("document.querySelector('[data-t=\"ga.d3\"]').closest('li').innerText")
        es('4,9' in li and '163' in li and not await p3.evaluate("document.querySelector('[data-t=\"ga.d3\"]').closest('li').hidden"), 'su nota y sus reseñas de Google')
        zon = await p3.evaluate("Object.fromEntries([...document.querySelectorAll('#mapa .d')].map(e=>[e.dataset.id,e.dataset.b]))")
        es(zon.get('gra') == 'a' and zon.get('eix') == 'a' and zon.get('stm') == 'b' and zon.get('nou') == 'b' and zon.get('cve') == 'b', 'los minutos del mapa, desde su distrito (Gràcia, lo más cerca)')
        rara = tok({'v': 1, 'n': 'Fontanería Serra', 'r': 9, 'c': -3, 'b': 'xxx', 'h': h})
        await p3.goto(B + 'index.html?m=' + rara); await p3.wait_for_selector('#mapa .d[data-id="stm"]'); await p3.wait_for_timeout(400)
        es(await p3.evaluate("document.querySelector('[data-t=\"ga.d3\"]').closest('li').hidden") and await p3.evaluate("document.querySelector('#mapa .d[data-id=\"stm\"]').dataset.b") == 'a', 'una nota o un distrito raros no se usan'); await p3.close()
        # el regalo: lo primero que abre el QR de la carta (20-11-2026: el diseño de Canva, con vida)
        p4 = await ctx.new_page(); e4 = []; p4.on('pageerror', lambda e: e4.append(str(e)))
        await p4.goto(B + 'regalo.html?m=' + M2); await p4.wait_for_timeout(600)
        es(await p4.locator('#nombre').inner_text() == 'Fontanería Serra' and 'Fontanería Serra' in await p4.title() and 'hasta el' in await p4.locator('#hastaTxt').inner_text(), 'el regalo, con su nombre y hasta cuándo')
        es(await p4.evaluate("(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1&&parseFloat(e.style.fontSize)>20)(document.getElementById('nombre'))"), 'su nombre cabe en su hueco, bien grande')
        hrefs = await p4.evaluate("['#aWeb','#aGuia','#aSolo','#aQuiero','#aPrueba','#aPie'].map(s=>document.querySelector(s).getAttribute('href'))")
        es(hrefs[0] == 'index.html?m=' + M2 and hrefs[1] == 'prueba.html?guia&m=' + M2 and hrefs[2] == 'prueba.html?m=' + M2 and 'Fontaner%C3%ADa%20Serra' in hrefs[3] and hrefs[4] == hrefs[0] and hrefs[5] == hrefs[3], 'los botones llevan su muestra, y el WhatsApp, su nombre')
        await p4.wait_for_timeout(3600)
        es(await p4.evaluate("[...document.querySelectorAll('.tapa')].every(e=>getComputedStyle(e).visibility=='hidden'||getComputedStyle(e).display=='none')") and await p4.evaluate("getComputedStyle(document.querySelector('.sello')).opacity") == '1', 'la carta entra entera y el sello se queda estampado')
        await p4.click('#aWeb'); await p4.wait_for_selector('#muestraOoox')
        es('Fontanería Serra' in await p4.title(), 'de su regalo a su web, con su nombre')
        await p4.goto(B + 'regalo.html?m=' + tok({'v': 1, 'n': 'Fontanería Serra', 'h': (hoy - datetime.timedelta(days=1)).isoformat()})); await p4.wait_for_timeout(500)
        es(not await p4.locator('#caducada').is_hidden() and await p4.locator('#nombre').inner_text() == 'tu negocio', 'caducada: el aviso, sin su nombre')
        es(not e4, f'el regalo, sin errores {e4[:2]}'); await p4.close()
        # en otra pestaña, sin el enlace: la demo de siempre
        o = await ctx.new_page(); await o.goto(B + 'cita.html'); await o.wait_for_selector('main h1')
        es(await o.locator('#muestraOoox').count() == 0 and await o.evaluate('Oficio.N.nombre') == 'Ramírez 24 h', 'en otra pestaña, sin el enlace, no')
        # caducada, demasiado larga o mal hecha: no cambia nada
        cad = tok({'v': 1, 'n': 'Fontanería Serra', 'h': (hoy - datetime.timedelta(days=1)).isoformat()})
        await o.goto(B + 'cita.html?m=' + cad); await o.wait_for_selector('#muestraOoox')
        es('caducado' in await o.locator('#muestraOoox').inner_text() and await o.evaluate('Oficio.N.nombre') == 'Ramírez 24 h' and await o.evaluate("sessionStorage.getItem('ooox:muestra')") is None, 'caducada: lo dice y es la demo de siempre')
        lejos = tok({'v': 1, 'n': 'Fontanería Serra', 'h': (hoy + datetime.timedelta(days=120)).isoformat()})
        await o.goto(B + 'cita.html?m=' + lejos); await o.wait_for_selector('main h1')
        es(await o.evaluate('Oficio.N.nombre') == 'Ramírez 24 h', 'a más de 90 días, no vale')
        for raro in ('hola', tok({'v': 2, 'n': 'X Y', 'h': h}), tok({'v': 1, 'n': 'X', 'h': h}), tok([1, 2]), '%3Cscript%3E'):
            await o.goto(B + 'cita.html?m=' + raro); await o.wait_for_selector('main h1')
            es(await o.locator('#muestraOoox').count() == 0 and await o.evaluate('Oficio.N.nombre') == 'Ramírez 24 h', f'un enlace mal hecho no cambia nada ({raro[:12]})')
        sin = tok({'v': 1, 'n': 'Fontanería Serra', 'z': 'Sants', 't': '123', 'h': h})
        await o.goto(B + 'cita.html?m=' + sin); await o.wait_for_selector('#muestraOoox')
        es(await o.evaluate('Oficio.N.tel') == '930 00 00 00' and await o.evaluate('Oficio.N.dir') == 'Sants, Barcelona', 'sin teléfono que valga ni dirección: el del ejemplo y su zona')
        mala = tok({'v': 1, 'n': '<img src=x onerror=alert(1)>Serra', 'd': '<b>Calle</b> 1', 'h': h})
        await o.goto(B + 'cita.html?m=' + mala); await o.wait_for_selector('#muestraOoox')
        es(await o.locator('#muestraOoox img').count() == 0 and '<' not in await o.evaluate('Oficio.N.nombre') and '<' not in await o.evaluate('Oficio.N.dir'), 'lo que no es un nombre ni una dirección se quita: nada de etiquetas')
        await o.close()
        es(not errs, f'sin errores {errs[:2]}')
        await b.close()
    print(('BIEN' if not mal else 'MAL') + f': {ok} comprobaciones pasan' + (f', {len(mal)} fallan' if mal else ''))
    sys.exit(1 if mal else 0)

asyncio.run(main())
