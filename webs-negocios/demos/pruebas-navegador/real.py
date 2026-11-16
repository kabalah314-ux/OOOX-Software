# Una copia de verdad no enseña nada de la demo: ni «web de muestra», ni «de ejemplo», ni el código que comparten los
# clientes de muestra, ni clientes inventados. Se hacen dos copias de verdad en una carpeta temporal (con servidor y sin
# él) a partir de los datos de Voltio, quitándoles «prueba», con la misma herramienta que hace las copias (copias.mjs), y
# se miran sus tres páginas: la cita, la zona del cliente y la app. Sin internet: el servidor no contesta (buzon_falso).
# Uso: python3 real.py
import asyncio, json, os, re, shutil, subprocess, sys, tempfile, time
from playwright.async_api import async_playwright
from reloj import pon_hora
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso    # ningún navegador de las pruebas sale a internet: ver buzon_falso.py
NAV = os.environ.get('NAVEGADOR', 'chromium')
AQUI = os.path.dirname(os.path.abspath(__file__)); DEMOS = os.path.dirname(AQUI)
REPO = os.path.dirname(os.path.dirname(DEMOS))
DATOS = os.path.join(REPO, 'frontend/public/oficios/voltio/js/oficio-datos.js')
if not os.path.exists(DATOS): DATOS = os.path.join(DEMOS, '../oficios/voltio/js/oficio-datos.js')   # en la copia del PC
PROHIBIDO = [r'\bmuestra\b', r'de ejemplo', r'\bdemo\b', r'inventad', r'2468-1357', r'copia de prueba']
hay = lambda txt: [w for w in PROHIBIDO if re.search(w, txt)]

def copia(base, id_, con_servidor):
    """Hace la copia de un negocio «de verdad» con copias.mjs y devuelve su carpeta."""
    js = ("const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "const N=c.OFICIO_NEGOCIO;delete N.prueba;N.id=process.argv[2];N.serie='RV';if(process.argv[3]!=='1')delete N.servidor;"
          "fs.writeFileSync(process.argv[4],'(function(g){\\ng.OFICIO_NEGOCIO='+JSON.stringify(N,null,1)+';\\n})(typeof globalThis!==\\'undefined\\'?globalThis:this);\\n')")
    d = os.path.join(base, 'datos-' + id_, 'js'); os.makedirs(d)
    f = os.path.join(d, 'oficio-datos.js')
    subprocess.run(['node', '-e', js, DATOS, id_, '1' if con_servidor else '0', f], check=True)
    r = subprocess.run(['node', os.path.join(DEMOS, 'copias.mjs'), 'nueva', '--datos', f, '--destino', os.path.join(base, 'copias')], capture_output=True, text=True)
    if r.returncode: raise SystemExit('No se ha podido hacer la copia: ' + r.stdout + r.stderr)
    return os.path.join(base, 'copias', id_)

async def main():
    ok = 0; mal = []
    def es(c, t):
        nonlocal ok
        if c: ok += 1
        else: mal.append(t); print('  MAL', t)
    base = tempfile.mkdtemp(prefix='copia-real-')
    srv = None
    try:
        c1 = copia(base, 'real-con', True); c2 = copia(base, 'real-sin', False)
        srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8771', '--directory', os.path.join(base, 'copias')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
        async with async_playwright() as p:
            b = await getattr(p, NAV).launch()
            for c, nom, srvr in [(c1, 'real-con', True), (c2, 'real-sin', False)]:
                ctx = await b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Madrid'); await pon_hora(ctx)
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                B = f'http://127.0.0.1:8771/{nom}/'
                ficha = json.load(open(os.path.join(c, 'copia.json')))
                es(ficha['prueba'] is False, f'{nom}: la copia es de verdad (sin «prueba»)')
                for pag, sel in [('cita.html', 'form, main'), ('cliente.html', 'main'), ('app.html', 'main, .entra')]:
                    await pg.goto(B + pag); await pg.wait_for_selector(sel); await pg.wait_for_timeout(700)
                    t = (await pg.locator('body').inner_text()).lower()
                    malas = hay(t)
                    es(not malas, f'{nom} · {pag}: no sale nada de la demo {malas}')
                    meta = (await pg.evaluate("(document.querySelector('meta[name=description]')||{}).content||''")).lower()
                    es(not hay(meta), f'{nom} · {pag}: tampoco en la descripción de la página ({meta[:60]})')
                    tit = (await pg.title()).lower()
                    es(not hay(tit), f'{nom} · {pag}: ni en el título ({tit})')
                if not srvr:
                    await pg.goto(B + 'app.html'); await pg.wait_for_selector('main')
                    es(await pg.evaluate('Oficio.DEMO') is False and await pg.evaluate('Oficio.estado().avisos.length') == 0, f'{nom}: la app empieza vacía, sin clientes inventados')
                    await pg.goto(B + 'cliente.html'); await pg.wait_for_selector('main')
                    es('todavía no está abierta' in await pg.locator('main').inner_text(), f'{nom}: sin servidor, la zona del cliente dice que aún no está abierta (no deja entrar con ningún código)')
                es(not errs, f'{nom}: sin errores {errs[:2]}')
                await ctx.close()
            await b.close()
    finally:
        if srv: srv.terminate()
        shutil.rmtree(base, ignore_errors=True)
    print(('BIEN' if not mal else 'MAL') + f': {ok} comprobaciones pasan · dos copias de verdad, con servidor y sin él')
    raise SystemExit(1 if mal else 0)
asyncio.run(main())
