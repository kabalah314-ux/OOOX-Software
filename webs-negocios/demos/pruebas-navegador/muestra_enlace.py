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
        h = (hoy + datetime.timedelta(days=20)).isoformat(); M = tok({'v': 1, 'n': 'Fontanería Serra', 'z': 'Sants', 'h': h})
        await pg.goto(B + 'cita.html?m=' + M); await pg.wait_for_selector('#muestraOoox')
        a = await pg.locator('#muestraOoox').inner_text(); wa = await pg.get_attribute('#muestraOoox a', 'href')
        es('Fontanería Serra' in a and 'No es su web' in a and '-'.join(reversed(h.split('-'))) in a, 'el aviso de arriba: para quién, que no es su web y hasta cuándo')
        es(wa.startswith('https://wa.me/34670409550?text=') and 'Fontaner%C3%ADa%20Serra' in wa, '«Me interesa» abre el WhatsApp de Oscar con el nombre del negocio')
        N = await pg.evaluate('({n:Oficio.N.nombre,m:Oficio.N.marca,r:Oficio.N.razon,d:Oficio.N.dir})')
        es(N == {'n': 'Fontanería Serra', 'm': ['Fontanería', 'Serra'], 'r': 'Fontanería Serra', 'd': 'Sants, Barcelona'} and 'Fontanería Serra' in await pg.title() and 'Ramírez' not in await pg.locator('header').first.inner_text(),
           f'la demo con su nombre, su marca y su zona: {N}')
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
        mala = tok({'v': 1, 'n': '<img src=x onerror=alert(1)>Serra', 'h': h})
        await o.goto(B + 'cita.html?m=' + mala); await o.wait_for_selector('#muestraOoox')
        es(await o.locator('#muestraOoox img').count() == 0 and '<' not in await o.evaluate('Oficio.N.nombre'), 'lo que no es un nombre se quita: nada de etiquetas')
        await o.close()
        es(not errs, f'sin errores {errs[:2]}')
        await b.close()
    print(('BIEN' if not mal else 'MAL') + f': {ok} comprobaciones pasan' + (f', {len(mal)} fallan' if mal else ''))
    sys.exit(1 if mal else 0)

asyncio.run(main())
