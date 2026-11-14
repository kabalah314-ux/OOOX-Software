# El mapa: el técnico comparte su posición desde «Voy» hasta que llega, y el cliente la ve en su página.
#  - Solo si el negocio lo tiene activado en sus datos. Solo la última posición. Al llegar o al dejar de compartir, se borra.
#  - El móvil del técnico es de mentira (el navegador de la prueba dice dónde está) y las teselas del mapa también:
#    no sale nada a internet.
# Uso: python3 mapa.py <datos-de-un-negocio-sin-mapa.js> [puerto]     (NAVEGADOR=chromium|firefox|webkit)
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json, re, math, base64
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # el buzón de mejoras no sale a internet en las pruebas: ver buzon_falso.py
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py

SIN_MAPA = open(sys.argv[1], encoding='utf-8').read() if len(sys.argv) > 1 else ''
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []; teselas = []; fuera = []
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt, flush=True)

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
async def tesela(route):
    teselas.append(route.request.url); await route.fulfill(status=200, content_type='image/png', body=PNG)

def vigila(pg, nombre):
    def consola(m):
        if m.type != 'error': return
        t = m.text
        # con la red interceptada, Firefox a veces deja una fuente a medio bajar al cambiar de pantalla (código 2152398850): lo dice el motor
        if re.search(r'downloadable font: download failed.*status=2152398850', t): return
        webkit_linux.consola(m, nombre, errores)
    pg.on('console', consola)
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    pg.on('request', lambda r: fuera.append(r.url) if not r.url.startswith(B) and not r.url.startswith('data:') and 'tile.openstreetmap.org' not in r.url else None)

async def hasta(pg, js, ms=7000):
    try: await pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
async def toast(pg, trozo): return await hasta(pg, f"(()=>{{const e=document.querySelector('#toast');return e&&e.classList.contains('on')&&e.textContent.includes({json.dumps(trozo)})}})()")
async def texto(pg, sel): return (await pg.locator(sel).first.inner_text()) if await pg.locator(sel).count() else ''
def tile(lat, lon, z=15):
    n = 2 ** z; x = (lon + 180) / 360 * n; la = math.radians(lat); y = (1 - math.log(math.tan(la) + 1 / math.cos(la)) / math.pi) / 2 * n
    return int(x), int(y), (x - int(x)) * 256, (y - int(y)) * 256
A1 = {'latitude': 41.3879, 'longitude': 2.1699}; A2 = {'latitude': 41.4036, 'longitude': 2.1744}
C = "{rol:'centralita',id:'oficina'}"
def crea(tec, n): return f"""(()=>{{const N=OFICIO_NEGOCIO,r=Oficio.hacer({{tipo:'pedir',av:N.averias[0].id,origen:'llamada',cli:{{nombre:'Cliente Mapa {n}',apellidos:'Prueba',tel:'61144770{n}',dir:'C/ del Mapa {n}, 1.º',cp:Object.keys(N.zonas.cp)[0]}}}},{C});
  const a=Oficio.hacer({{tipo:'asignar',id:r.id,tec:'{tec}'}},{C});return a.ok?r.id:a.err}})()"""
POS = "(id=>{const a=Oficio.estado().avisos.find(x=>x.id===id);return a?{e:a.e,pos:a.pos||null,no:!!a.posNo}:null})"

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        movil = dict(viewport={'width': 390, 'height': 844}, is_mobile=(NAV != 'firefox'), has_touch=True, locale='es-ES', timezone_id='Europe/Madrid')
        ctx = await br.new_context(**movil, geolocation=A1, permissions=['geolocation']); await pon_hora(ctx); await ctx.route('**/tile.openstreetmap.org/**', tesela)
        c = await ctx.new_page(); vigila(c, 'oficina'); await c.goto(B + 'app.html'); await c.wait_for_selector('#nav a')
        N = await c.evaluate('OFICIO_NEGOCIO'); mapa = await c.evaluate('Oficio.cfg.mapa')
        # dos técnicos que ahora mismo no estén con nada
        libres = await c.evaluate("OFICIO_NEGOCIO.tecnicos.map(t=>t.id).filter(id=>!Oficio.estado().avisos.some(a=>a.tec===id&&(a.e==='camino'||a.e==='curso')))")
        print(f"Negocio: {N['nombre']} ({N['id']}) · mapa {'activado' if mapa else 'sin activar'} · técnicos libres {libres} · motor {NAV}", flush=True)
        es(bool(mapa) and len(libres) >= 2, 'esta batería necesita un negocio con el mapa activado y dos técnicos libres (la demo los tiene)')
        T1, T2 = libres[0], libres[1]; n1 = next(t['n'] for t in N['tecnicos'] if t['id'] == T1)
        id1 = await c.evaluate(crea(T1, 1))

        # ---------- 1. antes de «Voy» no se comparte nada ----------
        t = await ctx.new_page(); vigila(t, 'técnico'); await t.goto(B + f'app.html?papel=tecnico&tec={T1}#/aviso/{id1}'); await t.wait_for_selector('[data-a="voy"]')
        k = await ctx.new_page(); vigila(k, 'cliente'); await k.goto(B + f'cita.html#/aviso/{id1}'); await k.wait_for_selector('.doc')
        await t.bring_to_front(); await t.wait_for_timeout(600)
        es(await t.locator('#geo').count() == 0 and (await c.evaluate(POS + f"('{id1}')"))['pos'] is None and await k.locator('#mapa').count() == 0 and not teselas, 'antes de «Voy»: ni el técnico comparte ni el cliente ve mapa ni se pide ninguna tesela')

        # ---------- 2. «Voy»: empieza a compartir ----------
        await t.click('[data-a="voy"]'); await t.wait_for_selector('#geo')
        es(await hasta(c, POS + f"('{id1}').pos!==null"), 'al pulsar «Voy», la posición del móvil llega sola a la app')
        st = await c.evaluate(POS + f"('{id1}')")
        es(st['e'] == 'camino' and abs(st['pos']['lat'] - A1['latitude']) < 1e-4 and abs(st['pos']['lon'] - A1['longitude']) < 1e-4 and sorted(st['pos'].keys()) == ['lat', 'lon', 't'], f"y es la del móvil, con su hora y nada más ({st['pos']})")
        es(await hasta(t, "(document.querySelector('#geoT')||{}).textContent.includes('El cliente ve dónde estás hasta que llegues')") and await t.locator('#geo [data-a="geoNo"]').count() == 1, 'técnico: la app le dice que está compartiendo, hasta cuándo, y le da el botón para dejar de hacerlo')
        es(await t.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'técnico: el bloque nuevo no se sale por los lados')

        # ---------- 3. el cliente la ve en su mapa ----------
        await k.bring_to_front(); es(await hasta(k, "!!document.querySelector('#mapa .mapa-v')"), 'cliente: en su página aparece el mapa')
        tx, ty, ox, oy = tile(st['pos']['lat'], st['pos']['lon'])
        srcs = await k.evaluate("[...document.querySelectorAll('#mapa .mapa-t img')].map(i=>i.getAttribute('src'))")
        esperadas = sorted(f'https://tile.openstreetmap.org/15/{tx + i}/{ty + j}.png' for i in (-1, 0, 1) for j in (-1, 0, 1))
        es(sorted(srcs) == esperadas, f'cliente: son las nueve teselas de alrededor de esa posición ({len(srcs)})')
        await hasta(k, f"{len(teselas)}>=0&&[...document.querySelectorAll('#mapa .mapa-t img')].every(i=>i.complete&&i.naturalWidth>0)")
        es(len(set(teselas)) >= 9 and all(u in esperadas for u in teselas), f'cliente: se piden esas teselas y ninguna otra ({len(set(teselas))})')
        geo = await k.evaluate(f"""(()=>{{const m=document.querySelector('#mapa .mapa-p').getBoundingClientRect(),v=document.querySelector('#mapa .mapa-v').getBoundingClientRect(),
            i=[...document.querySelectorAll('#mapa .mapa-t img')].find(x=>x.getAttribute('src').endsWith('/{tx}/{ty}.png')).getBoundingClientRect();
            return{{dx:m.left+m.width/2-i.left,dy:m.top+m.height/2-i.top,cx:Math.abs(m.left+m.width/2-(v.left+v.width/2)),cy:Math.abs(m.top+m.height/2-(v.top+v.height/2)),w:v.width,h:v.height,tapa:i.left<=v.left+1&&i.right>=v.left}}}})()""")
        es(abs(geo['dx'] - ox) < 1.5 and abs(geo['dy'] - oy) < 1.5 and geo['cx'] < 1 and geo['cy'] < 1, f"cliente: el punto está en el centro del mapa y cae justo en su sitio dentro de la tesela ({geo['dx']:.1f}, {geo['dy']:.1f} frente a {ox:.1f}, {oy:.1f})")
        lado = await k.evaluate("(()=>{const v=document.querySelector('#mapa .mapa-v').getBoundingClientRect();return[...document.querySelectorAll('#mapa .mapa-t img')].reduce((a,i)=>{const r=i.getBoundingClientRect();return{l:Math.min(a.l,r.left),r:Math.max(a.r,r.right),t:Math.min(a.t,r.top),b:Math.max(a.b,r.bottom),vl:v.left,vr:v.right,vt:v.top,vb:v.bottom}},{l:1e9,r:-1e9,t:1e9,b:-1e9})})()")
        es(lado['l'] <= lado['vl'] and lado['r'] >= lado['vr'] and lado['t'] <= lado['vt'] and lado['b'] >= lado['vb'], 'cliente: las teselas tapan el recuadro entero, sin huecos')
        tm = await texto(k, '#mapa')
        es(f'Última posición de {n1}' in tm and 'ahora mismo' in tm, f'cliente: debajo dice de quién es la posición y de cuándo ({tm[:60]!r})')
        fir = await k.evaluate("(a=>a?[a.textContent,a.getAttribute('href'),a.rel]:null)(document.querySelector('#mapa .mapa-f a'))")
        es(fir == [mapa['firma'], mapa['firmaUrl'], 'noopener noreferrer'], f'cliente: el mapa lleva la firma de quien lo da, con su enlace ({fir})')
        es(await k.evaluate("document.querySelector('#mapa .mapa-v').getAttribute('role')==='img'&&document.querySelector('#mapa .mapa-v').getAttribute('aria-label').includes('" + n1 + "')") and await k.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'cliente: el mapa tiene su descripción para quien no ve y no se sale por los lados')
        es(n1 + ' llega sobre las' in await texto(k, '.doc'), 'cliente: y sigue viendo la hora de llegada')

        # ---------- 4. el técnico se mueve: el mapa se mueve con él ----------
        antes = st['pos']; await ctx.set_geolocation(A2); await t.bring_to_front()
        es(await hasta(c, POS + f"('{id1}').pos.lat!=={antes['lat']}"), 'al moverse el técnico, llega la posición nueva')
        st2 = await c.evaluate(POS + f"('{id1}')"); tx2, ty2, _, _ = tile(st2['pos']['lat'], st2['pos']['lon'])
        es(abs(st2['pos']['lat'] - A2['latitude']) < 1e-4 and json.dumps(await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{id1}')")).count('"lat"') == 1, 'y solo se guarda esa: de la anterior no queda nada')
        await k.bring_to_front()
        es(await hasta(k, f"!![...document.querySelectorAll('#mapa .mapa-t img')].find(i=>i.getAttribute('src').endsWith('/{tx2}/{ty2}.png'))") and (tx2, ty2) != (tx, ty), 'cliente: su mapa pasa solo a la zona nueva')
        await c.bring_to_front(); await c.evaluate(f"location.hash='#/aviso/{id1}'"); await c.wait_for_selector('#posOf')
        es(n1 + ' compartió su posición' in await texto(c, '#posOf') and await c.locator('#geo').count() == 0, 'oficina: ve cuándo fue la última posición, y no tiene el botón del técnico')

        # ---------- 5. «Dejar de compartir» ----------
        await t.bring_to_front(); await t.click('#geo [data-a="geoNo"]')
        es(await toast(t, 'Ya no se comparte') and await hasta(c, POS + f"('{id1}').pos===null"), 'técnico: al dejar de compartir, la posición se borra')
        es((await c.evaluate(POS + f"('{id1}')"))['no'] is True and 'Has dejado de compartir' in await texto(t, '#geoT') and await t.locator('#geo [data-a="geoNo"]').count() == 0, 'técnico: queda dicho en su pantalla y el botón desaparece')
        await k.bring_to_front()
        es(await hasta(k, "!document.querySelector('#mapa')") and n1 + ' llega sobre las' in await texto(k, '.doc'), 'cliente: el mapa desaparece de su página; la hora de llegada sigue')
        await ctx.set_geolocation(A1); await t.bring_to_front(); await t.wait_for_timeout(900)
        es((await c.evaluate(POS + f"('{id1}')"))['pos'] is None, 'y aunque el móvil se mueva, ya no se guarda nada en ese viaje')
        await c.bring_to_front(); await c.wait_for_selector('#v'); es(await c.locator('#posOf').count() == 0, 'oficina: tampoco ve ya ninguna posición')
        await c.click('details.hist summary'); es('Deja de compartir su posición' in await texto(c, 'details.hist'), 'oficina: en el historial queda que dejó de compartirla')

        # ---------- 6. al llegar, se borra sola ----------
        id2 = await c.evaluate(crea(T2, 2)); n2 = next(x['n'] for x in N['tecnicos'] if x['id'] == T2)
        t2 = await ctx.new_page(); vigila(t2, 'técnico 2'); await t2.goto(B + f'app.html?papel=tecnico&tec={T2}#/aviso/{id2}'); await t2.wait_for_selector('[data-a="voy"]'); await t2.click('[data-a="voy"]'); await t2.wait_for_selector('#geo')
        es(await hasta(c, POS + f"('{id2}').pos!==null"), 'otro técnico sale hacia otro aviso y también comparte')
        await k.goto(B + f'cita.html#/aviso/{id2}'); await k.bring_to_front(); await k.wait_for_selector('#mapa .mapa-v')
        r = await t2.evaluate(f"Oficio.hacer({{tipo:'empezar',id:'{id2}',pres:{{lineas:OFICIO_NEGOCIO.averias[0].ini,firma:'M10 10L60 40L110 12L160 44'}}}},{{rol:'tecnico',id:'{T2}'}})")
        es(r['ok'] and (await c.evaluate(POS + f"('{id2}')")) == {'e': 'curso', 'pos': None, 'no': False}, 'al llegar y empezar el trabajo, la posición se borra sola')
        es(await hasta(k, "!document.querySelector('#mapa')") and 'Está en tu casa' in await texto(k, '.doc'), 'cliente: su mapa desaparece y pone que ya está en su casa')
        await t2.bring_to_front(); await t2.wait_for_selector('#v')
        es(await hasta(t2, "!document.querySelector('#geo')"), 'técnico: su bloque de posición desaparece al llegar')
        es(json.dumps(await c.evaluate('Oficio.estado()')).count('"lat"') == 0, 'en toda la app no queda guardada ninguna posición')
        await t2.close()

        # ---------- 7. un móvil que no da permiso ----------
        s = await br.new_context(**movil); await pon_hora(s); await s.route('**/tile.openstreetmap.org/**', tesela)
        await s.add_init_script("(()=>{const g=navigator.geolocation;if(!g)return;window.__geo=0;g.watchPosition=function(si,no){window.__geo++;setTimeout(()=>no&&no({code:1,message:'denegado'}),60);return 7};g.clearWatch=function(){}})()")
        ps = await s.new_page(); vigila(ps, 'sin permiso'); await ps.goto(B + 'app.html'); await ps.wait_for_selector('#nav a')
        ls = await ps.evaluate("OFICIO_NEGOCIO.tecnicos.map(t=>t.id).filter(id=>!Oficio.estado().avisos.some(a=>a.tec===id&&(a.e==='camino'||a.e==='curso')))")
        id3 = await ps.evaluate(crea(ls[0], 3)); await ps.goto(B + f'app.html?papel=tecnico&tec={ls[0]}#/aviso/{id3}'); await ps.reload(); await ps.wait_for_selector('[data-a="voy"]'); await ps.click('[data-a="voy"]')
        es(await hasta(ps, "(document.querySelector('#geoT')||{}).textContent.includes('no ha dado permiso')") and await ps.evaluate('window.__geo') == 1, 'sin permiso: la app lo pide una vez y, si el móvil dice que no, lo explica')
        es((await ps.evaluate(POS + f"('{id3}')"))['pos'] is None and 'El cliente ve solo la hora de llegada' in await texto(ps, '#geoT'), 'sin permiso: no se guarda nada y el técnico sabe qué ve el cliente')
        pk = await s.new_page(); vigila(pk, 'cliente sin mapa'); await pk.goto(B + f'cita.html#/aviso/{id3}'); await pk.wait_for_selector('.doc')
        es(await pk.locator('#mapa').count() == 0 and 'llega sobre las' in await texto(pk, '.doc'), 'sin permiso: el cliente no ve mapa, pero sí la hora de llegada')
        await s.close()

        # ---------- 8. un negocio con el mapa activado pero sin mapa de fondo: se ve la hora y un enlace ----------
        f = await br.new_context(**movil, geolocation=A1, permissions=['geolocation']); await pon_hora(f)
        async def sin_fondo(route):
            rs = await route.fetch(); cuerpo = await rs.text()
            await route.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=cuerpo + "\n;(function(g){g.OFICIO_NEGOCIO.mapa={}})(typeof globalThis!=='undefined'?globalThis:this);")
        await f.route('**/js/oficio-datos.js', sin_fondo)
        pf = await f.new_page(); vigila(pf, 'sin fondo'); await pf.goto(B + 'app.html'); await pf.wait_for_selector('#nav a')
        lf = await pf.evaluate("OFICIO_NEGOCIO.tecnicos.map(t=>t.id).filter(id=>!Oficio.estado().avisos.some(a=>a.tec===id&&(a.e==='camino'||a.e==='curso')))")
        id4 = await pf.evaluate(crea(lf[0], 4)); tf = await f.new_page(); vigila(tf, 'técnico sin fondo'); await tf.goto(B + f'app.html?papel=tecnico&tec={lf[0]}#/aviso/{id4}'); await tf.wait_for_selector('[data-a="voy"]'); await tf.click('[data-a="voy"]')
        es(await hasta(pf, POS + f"('{id4}').pos!==null"), 'sin mapa de fondo: la posición se comparte igual')
        kf = await f.new_page(); vigila(kf, 'cliente sin fondo'); n0 = len(teselas); await kf.goto(B + f'cita.html#/aviso/{id4}'); await kf.wait_for_selector('#mapa')
        enl = await kf.evaluate("(a=>a?[a.getAttribute('href'),a.target,a.rel]:null)(document.querySelector('#mapa .mapa-l a'))")
        es(await kf.locator('#mapa .mapa-v').count() == 0 and len(teselas) == n0 and enl and enl[0].startswith('https://www.openstreetmap.org/?mlat=41.3879') and enl[1:] == ['_blank', 'noopener noreferrer'] and 'Última posición' in await texto(kf, '#mapa'),
           f'sin mapa de fondo: el cliente ve de cuándo es la posición y un enlace para abrirla; no se pide ninguna tesela ({enl})')
        await f.close()

        # ---------- 9. un negocio sin el mapa activado: la app ni pregunta dónde está el móvil ----------
        if SIN_MAPA:
            v = await br.new_context(**movil, geolocation=A1, permissions=['geolocation']); await pon_hora(v)
            await v.add_init_script("(()=>{const g=navigator.geolocation;if(!g)return;window.__geo=0;const w=g.watchPosition.bind(g);g.watchPosition=function(){window.__geo++;return w.apply(null,arguments)}})()")
            await v.route('**/js/oficio-datos.js', lambda x: x.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=SIN_MAPA))
            pv = await v.new_page(); vigila(pv, 'otro negocio'); await pv.goto(B + 'app.html'); await pv.wait_for_selector('#nav a')
            NV = await pv.evaluate('OFICIO_NEGOCIO')
            if await pv.evaluate('!!Oficio.cfg.mapa'): print('  (el negocio pasado también tiene el mapa activado: se salta esta parte)')
            else:
                tv0 = NV['tecnicos'][0]['id']; id5 = await pv.evaluate(crea(tv0, 5))
                tv = await v.new_page(); vigila(tv, 'técnico de otro negocio'); await tv.goto(B + f'app.html?papel=tecnico&tec={tv0}#/aviso/{id5}'); await tv.wait_for_selector('[data-a="voy"]'); await tv.click('[data-a="voy"]'); await tv.wait_for_selector('[data-a="empezar"]'); await tv.wait_for_timeout(900)
                es(await tv.evaluate('window.__geo') == 0 and await tv.locator('#geo').count() == 0 and (await pv.evaluate(POS + f"('{id5}')"))['pos'] is None, f"{NV['nombre']}, sin mapa activado: tras «Voy», la app ni pregunta dónde está el móvil ni enseña el bloque")
                r = await tv.evaluate(f"Oficio.hacer({{tipo:'posicion',id:'{id5}',lat:39.47,lon:-0.37}},{{rol:'tecnico',id:'{tv0}'}})")
                es(r['ok'] is False and r['err'] == 'mapa', 'y si alguien lo intenta por su cuenta, las reglas dicen que no')
                kv = await v.new_page(); vigila(kv, 'cliente de otro negocio'); await kv.goto(B + f'cita.html#/aviso/{id5}'); await kv.wait_for_selector('.doc')
                es(await kv.locator('#mapa').count() == 0, 'su cliente no ve ningún mapa')
            await v.close()

        es(not fuera, f'ninguna página ha pedido nada a internet, quitando las teselas, que aquí son de mentira {sorted(set(fuera))[:4]}')
        es(not errores, f'ninguna pantalla da errores en la consola {errores[:5]}')
        webkit_linux.resumen_rarezas()
        await br.close()
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + '.')
    sys.exit(1 if fallos else 0)

asyncio.run(main())
