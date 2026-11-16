# El vigía de fallos (js/oficio-vigia.js) en el navegador: que ve los fallos de verdad (errores, promesas, archivos que
# no cargan, la consola y el servidor que se rompe), que los manda limpios y con el papel justo, que sin red los guarda
# para la vez siguiente, y que en un recorrido normal por la app no hay nada que apuntar.
# No sale nada a internet: el servidor es el de mentira de buzon_falso.py, que guarda lo recibido en window.__vigia.
# Uso: python3 vigia.py [carpeta de las copias] [puerto]     (NAVEGADOR=chromium|firefox|webkit)
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json, threading, functools, http.server, socketserver
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # el buzón y el vigía no salen a internet en las pruebas: ver buzon_falso.py
from reloj import pon_hora

COPIAS = sys.argv[1] if len(sys.argv) > 1 else ''
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt, flush=True)

async def hasta(pg, js, ms=9000):
    try: await pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
async def lotes(pg): return await pg.evaluate('window.__vigia||[]')
def todos(ls): return [x for l in ls for x in (l.get('p_lote') or [])]

async def abre(ctx, url, listo='#nav a'):
    pg = await ctx.new_page(); await pg.goto(url)
    if listo: await pg.wait_for_selector(listo)
    return pg

def sirve(carpeta, puerto):
    """Un servidor de archivos aparte, para las copias de cada negocio (cada una en su carpeta)."""
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=carpeta)
    h.log_message = lambda *a, **k: None
    socketserver.TCPServer.allow_reuse_address = True
    s = socketserver.TCPServer(('127.0.0.1', puerto), h)
    threading.Thread(target=s.serve_forever, daemon=True).start(); return s

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        movil = dict(viewport={'width': 390, 'height': 844}, is_mobile=(NAV != 'firefox'), has_touch=True, locale='es-ES', timezone_id='Europe/Madrid')
        ctx = await br.new_context(**movil); await pon_hora(ctx)

        # 1. un recorrido normal por la oficina: nada que apuntar
        pg = await abre(ctx, B + 'app.html')
        es(await pg.evaluate('!!(window.OficioVigia&&OficioVigia.crea)'), 'el vigía está cargado en la app')
        for i in range(await pg.locator('#nav a').count()):
            await pg.locator('#nav a').nth(i).click(); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(3200)
        es(await lotes(pg) == [], 'un recorrido normal por la oficina no apunta nada: ' + json.dumps(todos(await lotes(pg)), ensure_ascii=False)[:300])

        # 2. un error de JavaScript, tres veces seguidas: uno solo, con su cuenta, limpio y con el papel
        await pg.evaluate("for(let i=0;i<3;i++)setTimeout(()=>{throw new Error('Prueba del vigía: llama al 600 00 01 12')},0)")
        es(await hasta(pg, 'window.__vigia.length>=1'), 'el error llega al servidor')
        l = await lotes(pg); x = todos(l)
        v = await pg.evaluate('OficioNucleo.VERSION')
        es(len(l) == 1 and l[0].get('p_negocio') == 'ramirez' and len(x) == 1, 'una sola llamada, del negocio, con un solo fallo')
        if x:
            x = x[0]
            es(x.get('n') == 3, 'tres veces el mismo: n = 3')
            es(x.get('tipo') == 'js' and x.get('pagina') == 'app' and x.get('rol') == 'centralita' and x.get('version') == v and x.get('aparato'), 'tipo, página, papel, versión y aparato: ' + json.dumps(x, ensure_ascii=False)[:200])
            es('600' not in x.get('mensaje', '') and '#' in x.get('mensaje', ''), 'sin el teléfono: ' + x.get('mensaje', ''))
        # 3. una promesa que nadie recoge, un error que la app apunta en la consola, una foto que no carga y el servidor que se rompe
        await pg.evaluate("""Promise.reject(new RangeError('Prueba de promesa'));console.error(new Error('Prueba de consola'));
          const im=document.createElement('img');im.src='assets/img/no-existe-prueba.webp';document.body.appendChild(im);
          window.__falso503=true;fetch('https://glsmahzpvzabeeucyqif.supabase.co/rest/v1/rpc/oficios_v',{method:'POST',body:'{}'}).then(()=>{window.__falso503=false})""")
        es(await hasta(pg, "window.__vigia.flatMap(l=>l.p_lote).length>=5", 40000), 'llegan los otros cuatro (en la tanda siguiente, a los 30 s)')
        x = todos(await lotes(pg)); por = {y.get('tipo'): y for y in x}
        es('promesa' in por and por['promesa'].get('mensaje') == 'RangeError: Prueba de promesa', 'la promesa: ' + json.dumps(por.get('promesa'), ensure_ascii=False)[:160])
        es('consola' in por and por['consola'].get('mensaje') == 'Prueba de consola', 'la consola')
        es('recurso' in por and por['recurso'].get('mensaje') == 'No carga: /assets/img/no-existe-prueba.webp (img)', 'la foto que no carga: ' + json.dumps(por.get('recurso'), ensure_ascii=False)[:160])
        es('servidor' in por and por['servidor'].get('mensaje') == 'HTTP 503 · rest/v1/rpc/oficios_v', 'el servidor roto: ' + json.dumps(por.get('servidor'), ensure_ascii=False)[:160])
        await pg.close()

        # 4. el técnico: su papel, nunca quién es
        pg = await abre(ctx, B + 'app.html?papel=tecnico')
        await pg.evaluate("setTimeout(()=>{throw new Error('Prueba del técnico')},0)")
        es(await hasta(pg, 'window.__vigia.length>=1'), 'el error del técnico llega')
        x = todos(await lotes(pg))
        es(x and x[0].get('rol') == 'tecnico' and 'omar' not in json.dumps(x).lower(), 'papel técnico y sin su nombre')
        await pg.close()

        # 5. sin red: se guarda en el aparato y sale la vez siguiente
        pg = await abre(ctx, B + 'app.html')
        await pg.evaluate("window.__vigiaSinRed=true;setTimeout(()=>{throw new Error('Prueba sin red')},0)")
        es(await hasta(pg, "(JSON.parse(localStorage.getItem('oficio-vigia')||'[]')).length===1"), 'sin red queda guardado en el aparato')
        await pg.close()
        pg = await abre(ctx, B + 'app.html')
        es(await hasta(pg, "window.__vigia.flatMap(l=>l.p_lote).some(x=>x.mensaje==='Error: Prueba sin red')", 15000), 'la vez siguiente sale solo')
        es(await hasta(pg, "localStorage.getItem('oficio-vigia')===null"), 'y deja de estar guardado')
        await pg.close()

        # 6. la página del cliente con su enlace: la pantalla sí, el enlace no
        pg = await abre(ctx, B + 'cita.html#/aviso/R-0001/qwertyuiopasdfghjkzxcvbn', listo='body')
        await pg.wait_for_timeout(800)
        await pg.evaluate("setTimeout(()=>{throw new Error('Prueba en '+location.href)},0)")
        es(await hasta(pg, 'window.__vigia.length>=1'), 'el error de la cita llega')
        x = todos(await lotes(pg)); t = json.dumps(x, ensure_ascii=False)
        es(x and x[0].get('pagina') == 'cita' and x[0].get('rol') == 'cliente' and x[0].get('pantalla') == 'aviso', 'cita: página, papel y pantalla: ' + t[:200])
        es('qwerty' not in t and 'R-0001' not in t, 'ni la llave ni el aviso del enlace')
        await pg.close()

        # 7. la zona del cliente y la web del negocio
        pg = await abre(ctx, B + 'cliente.html', listo='body'); await pg.wait_for_timeout(600)
        await pg.evaluate("setTimeout(()=>{throw new Error('Prueba en la zona')},0)")
        es(await hasta(pg, 'window.__vigia.length>=1') and todos(await lotes(pg))[0].get('pagina') == 'cliente', 'la zona del cliente')
        await pg.close()
        pg = await abre(ctx, B + 'index.html?shot=1', listo='body'); await pg.wait_for_timeout(600)
        await pg.evaluate("setTimeout(()=>{throw new Error('Prueba en la web')},0)")
        ok7 = await hasta(pg, 'window.__vigia.length>=1'); l = await lotes(pg)
        es(ok7 and l[0].get('p_negocio') == 'ramirez' and l[0]['p_lote'][0].get('pagina') == 'web' and l[0]['p_lote'][0].get('rol') == 'web', 'la web del negocio: ' + json.dumps(l, ensure_ascii=False)[:200])
        await pg.close()

        # 8. la copia de un negocio, servida desde su carpeta: el fallo es suyo
        if COPIAS and os.path.isdir(os.path.join(COPIAS, 'voltio')):
            s = sirve(COPIAS, PORT + 7)
            try:
                pg = await abre(ctx, f'http://127.0.0.1:{PORT + 7}/voltio/app.html', listo='body'); await pg.wait_for_timeout(800)
                await pg.evaluate("setTimeout(()=>{throw new Error('Prueba en la copia')},0)")
                ok8 = await hasta(pg, 'window.__vigia.length>=1'); l = await lotes(pg)
                es(ok8 and l[0].get('p_negocio') == 'voltio', 'en la copia de Voltio, el fallo es de Voltio: ' + json.dumps(l, ensure_ascii=False)[:160])
                await pg.close()
            finally: s.shutdown()
        await br.close()
    print(f'BIEN: {ok} comprobaciones del vigía en {NAV}' if not fallos else f'MAL: {len(fallos)} de {ok + len(fallos)} en {NAV}')
    sys.exit(1 if fallos else 0)

asyncio.run(main())
