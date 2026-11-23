# El contador de las cartas (B6, 23-11-2026): js/oficio-visitas.js cuenta, una vez por pestaña, cada paso de quien llega
# desde una carta (abre el QR, entra en la web, abre la app, empieza la cita, la manda, mira los tres móviles). Sin enlace
# de carta, caducado o mal hecho, no cuenta nada. La clave de la carta es la de tanda.py (los 12 primeros del sha256 del
# enlace). Ningún navegador sale a internet: lo que se mandaría lo recoge buzon_falso.py en window.__visitas.
# Uso: python3 visitas.py [puerto]
import os, sys, asyncio, base64, json, datetime, hashlib
NAV = os.environ.get('NAVEGADOR', 'chromium')
from reloj import pon_hora
from playwright.async_api import async_playwright
import webkit_linux, buzon_falso
from cita_pasos import hasta
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
        async def contexto(prueba=True):
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Madrid'); await pon_hora(ctx)
            if prueba: await ctx.add_init_script('window.OOOX_VISITAS_PRUEBA=true')
            return ctx
        async def manda(pg, n=1, ms=4000):
            try: await pg.wait_for_function('n=>(window.__visitas||[]).length>=n', arg=n, timeout=ms)
            except Exception: pass
            return await pg.evaluate('window.__visitas||[]')
        ctx = await contexto(); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B + 'cita.html'); await pg.wait_for_selector('main h1')
        hoy = datetime.date.fromisoformat(await pg.evaluate("new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid'}).format(new Date())"))
        h = (hoy + datetime.timedelta(days=20)).isoformat()
        M = tok({'v': 1, 'n': 'Fontanería Serra', 't': '600123456', 'z': 'Sants', 'h': h}); C = hashlib.sha256(M.encode()).hexdigest()[:12]
        es(await manda(pg, 1, 800) == [], 'sin enlace de carta no cuenta nada')
        await pg.goto(B + 'regalo.html?m=' + M); v = await manda(pg)
        es(v == [{'p_tanda': h, 'p_carta': C, 'p_paso': 'carta'}], f'abrir el QR cuenta «carta», con la tanda y la clave de tanda.py: {v}')
        await pg.reload(); es(await manda(pg, 1, 800) == [], 'al volver a cargar, no cuenta otra vez')
        await pg.goto(B + 'index.html'); v = await manda(pg)
        es([x['p_paso'] for x in v] == ['web'] and v[0]['p_carta'] == C, f'la web, desde el regalo (sin el enlace en la dirección): «web» {v}')
        await pg.goto(B + 'app.html'); await pg.wait_for_selector('#v'); v = await manda(pg)
        es([x['p_paso'] for x in v] == ['app'], f'la app: «app» {v}')
        await pg.goto(B + 'cita.html'); await pg.wait_for_selector('#f')
        es(await manda(pg, 1, 800) == [], 'entrar en la cita no cuenta: cuenta empezarla')
        await hasta(pg, 'tu'); await pg.fill('#c_nomap', 'Pau Ferrer Puig'); await pg.fill('#c_tel', '611 22 33 55'); await pg.fill('#c_dir', 'C/ Balmes 100, 1.º')
        await hasta(pg, 'resumen'); v = await manda(pg)
        es([x['p_paso'] for x in v] == ['cita'], f'empezar la cita: «cita», una sola vez aunque haya varios pasos {v}')
        await pg.click('#rConfirma'); await pg.wait_for_url('**#/aviso/*'); v = await manda(pg, 2)
        es([x['p_paso'] for x in v] == ['cita', 'pide'], f'mandarla: «pide» {v}')
        await pg.goto(B + 'prueba.html'); v = await manda(pg)
        es('prueba' in [x['p_paso'] for x in v], f'los tres móviles: «prueba» {v}')
        es(not errs, f'sin errores en la página: {errs}')
        # otra pestaña, sin enlace: nada. Caducado, a más de 90 días o mal hecho: nada
        for nombre, m in (('sin enlace', None), ('caducado', tok({'v': 1, 'n': 'Fontanería Serra', 'h': (hoy - datetime.timedelta(days=1)).isoformat()})),
                          ('a más de 90 días', tok({'v': 1, 'n': 'Fontanería Serra', 'h': (hoy + datetime.timedelta(days=120)).isoformat()})), ('mal hecho', 'hola-que-tal'),
                          ('otra versión', tok({'v': 2, 'n': 'Fontanería Serra', 'h': h}))):
            c2 = await contexto(); o = await c2.new_page(); await o.goto(B + 'regalo.html' + ('?m=' + m if m else ''))
            es(await manda(o, 1, 800) == [], f'{nombre}: no cuenta'); await c2.close()
        # en el ordenador de pruebas (localhost) no sale nada si no se pide
        c3 = await contexto(False); o = await c3.new_page(); await o.goto(B + 'regalo.html?m=' + M)
        es(await manda(o, 1, 800) == [] and await o.evaluate("sessionStorage.getItem('ooox:visto:carta')") is not None, 'en localhost, sin OOOX_VISITAS_PRUEBA, no sale nada'); await c3.close()
        await b.close()
    print(f'MAL: {ok} comprobaciones pasan, {len(mal)} fallan' if mal else f'BIEN: {ok} comprobaciones pasan · el contador de las cartas · motor {NAV}')
    sys.exit(1 if mal else 0)

asyncio.run(main())
