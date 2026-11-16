# La app en el móvil (16-11-2026): que se pueda instalar (manifiesto e iconos del negocio) y que abra sin cobertura.
# El trabajador de la app (sw.js) no se registra en las pruebas (127.0.0.1) salvo con ?sw=1: aquí se pide.
# Uso: python3 instalable.py [puerto]   (por defecto 8765) · NAVEGADOR=chromium|firefox|webkit
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt, flush=True)
async def hasta(pg, js, ms=8000):
    try: await pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid'); await pon_hora(ctx)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errores.append(f'! {e}'))
        pg.on('console', lambda m: webkit_linux.consola(m, 'app', errores))

        # ---------- 1. el manifiesto y los iconos son los del negocio ----------
        await pg.goto(B + 'app.html'); await pg.wait_for_selector('#v')
        m = await pg.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json())")
        N = await pg.evaluate("({nombre:OFICIO_NEGOCIO.nombre,marca:OFICIO_NEGOCIO.marca})")
        es(m['name'] == N['nombre'] and m['start_url'] == 'app.html' and m['display'] == 'standalone' and m['scope'] == './', f'el manifiesto es el del negocio y abre la app ({m["name"]})')
        srcs = [i['src'] for i in m['icons']]
        es('assets/icono.svg' in srcs and 'assets/icono-192.png' in srcs and 'assets/icono-512.png' in srcs and any(i.get('purpose') == 'maskable' for i in m['icons']), 'con su icono en SVG y en PNG (también el recortable de Android)')
        st = await pg.evaluate("Promise.all(['assets/icono.svg','assets/icono-180.png','assets/icono-192.png','assets/icono-512.png'].map(f=>fetch(f).then(r=>r.status)))")
        es(st == [200, 200, 200, 200], f'los iconos están ({st})')
        svg = await pg.evaluate("fetch('assets/icono.svg').then(r=>r.text())")
        es(f'>{N["marca"][0][0].upper()}</text>' in svg, 'el icono lleva la letra de la marca')
        es(await hasta(pg, "document.querySelectorAll('link[rel=apple-touch-icon]').length===1") and await pg.locator('meta[name=apple-mobile-web-app-capable]').count() == 1, 'y lo del iPhone: su icono (porque tiene los PNG) y que abra a pantalla completa')
        # sin ?sw=1, en las pruebas no se registra
        await pg.wait_for_timeout(600)
        es(await pg.evaluate("navigator.serviceWorker?navigator.serviceWorker.getRegistrations().then(r=>r.length):0") == 0, 'en las pruebas (127.0.0.1), sin ?sw=1, el trabajador no se registra')

        # ---------- 2. con el trabajador: la segunda vez ya abre sin cobertura ----------
        if NAV != 'chromium':
            print('  (' + NAV + ' en Playwright no lleva bien los trabajadores de la app: la parte sin cobertura se mira en Chromium)')
        else:
            await pg.goto(B + 'app.html?sw=1#/bandeja'); await pg.wait_for_selector('#nav a')
            # «ready»: ya hay un trabajador activo (instalado y con lo justo guardado)
            es(await pg.evaluate("Promise.race([navigator.serviceWorker.ready.then(r=>!!r.active),new Promise(s=>setTimeout(()=>s(false),10000))])"), 'con ?sw=1 se registra el trabajador')
            await pg.reload(); await pg.wait_for_selector('#nav a')
            es(await hasta(pg, "!!navigator.serviceWorker.controller"), 'y al volver a abrir, la app va por él')
            # lo de fuera no se guarda: el trabajador solo toca archivos de esta carpeta
            cajas = await pg.evaluate("caches.keys().then(async K=>{const o=[];for(const k of K){const c=await caches.open(k);for(const r of await c.keys())o.push(r.url)}return o})")
            es(all(u.startswith(B) for u in cajas) and any(u.endswith('/app.html') for u in cajas) and any(u.endswith('/js/oficio-nucleo.js') for u in cajas) and not any('?' in u for u in cajas), f'guarda las pantallas de esta carpeta, sin lo de después de «?» ({len(cajas)} archivos)')
            await ctx.set_offline(True)
            await pg.reload(); ok_off = await hasta(pg, "!!document.querySelector('#nav a')", 10000)
            es(ok_off, 'sin cobertura, la app vuelve a abrir')
            await pg.goto(B + 'app.html?papel=tecnico&sw=1#/'); ok_t = await hasta(pg, "!!document.querySelector('#v')&&document.querySelector('#v').textContent.length>20", 10000)
            es(ok_t, 'también con otra dirección de la misma pantalla (la del técnico)')
            await ctx.set_offline(False)
            # al quitarlo todo, la app sigue igual
            await pg.evaluate("navigator.serviceWorker.getRegistrations().then(L=>Promise.all(L.map(r=>r.unregister())))")

        es(not errores, 'sin errores en la consola: ' + '; '.join(errores[:5]))
        await br.close()
    print(('BIEN' if not fallos else 'MAL') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + ' · la app instalable · motor ' + NAV)
    sys.exit(1 if fallos else 0)

asyncio.run(main())
