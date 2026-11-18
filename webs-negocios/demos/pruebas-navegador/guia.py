# La demo guiada (prueba.html?guia, 17-11-2026): el recorrido de principio a fin, en el ordenador tocando las pantallas
# como lo haría quien la prueba y en el móvil con «Hazlo por mí»; que cada paso señala algo que se ve, en el móvil que toca,
# sin que la burbuja lo tape ni se salga; salir, volver a empezar, Esc, movimiento reducido y sin errores de consola.
# Uso: python3 guia.py [puerto]
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, sys
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
    return pg

# lo que se ve de la guía: la burbuja, el hueco y la flecha, y en el móvil la pestaña elegida
MIRA = """(()=>{const b=document.querySelector('.gu-b'),h=document.querySelector('.gu-hueco'),s=document.querySelector('.gu-flecha');
 if(!b)return null;const R=e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height}};
 const tab=document.querySelector('[data-t][aria-selected=true]'),tabs=document.querySelector('.tabs');
 return{paso:OficioGuia.paso(),t:(b.querySelector('h2')||{}).textContent||'',x:(b.querySelector('#guX')||{}).textContent||'',
  b:R(b),h:h&&!h.hidden?R(h):null,flecha:!!s&&s.style.visibility==='visible',W:innerWidth,H:innerHeight,
  sw:document.documentElement.scrollWidth,tab:tab&&getComputedStyle(tabs).display!=='none'?tab.dataset.t:'',
  velo:!document.querySelector('.gu-velo').hidden}})()"""

async def espera_paso(pg, n, ms=9000):
    try: await pg.wait_for_function(f'window.OficioGuia&&OficioGuia.paso()==={n}', timeout=ms)
    except Exception: pass
    await pg.wait_for_timeout(700)
    return await pg.evaluate(MIRA)

def marco(pg, trozo, sin=None):
    return next((f for f in pg.frames if trozo in f.url and (not sin or sin not in f.url)), None)

def dentro(r, W, H, tol=1):
    return r and r['x'] >= -tol and r['y'] >= -tol and r['x'] + r['w'] <= W + tol and r['y'] + r['h'] <= H + tol

# «Lo quiero para mi negocio» va al WhatsApp de Oscar (js/ooox-contacto.js, con su número desde el 18-11-2026). En el
# ordenador se prueba con el número de verdad; en el móvil y en la página del vídeo se sirve ese archivo con uno de
# mentira, y una vez sin número, para que el camino del correo (si algún día se vacía) siga probado.
WA_PRUEBA = '34600000000'
async def con_numero(ctx, numero=WA_PRUEBA):
    import re
    async def sirve(route):
        r = await route.fetch()
        await route.fulfill(response=r, body=re.sub(r"const WA='[^']*'", f"const WA='{numero}'", await r.text(), count=1))
    await ctx.route('**/js/ooox-contacto.js', sirve)
ENLACES_WA = "[...document.querySelectorAll('a[data-contacto]')].map(a=>({k:a.dataset.contacto,href:a.href,t:a.target,en:a.closest('.gu-b')?'guia':'pagina'}))"
def va_a_whatsapp(L, k, frase):
    from urllib.parse import unquote
    return bool(L) and all(e['href'].startswith(f'https://wa.me/{WA_PRUEBA}?text=') and frase in unquote(e['href']) and e['t'] == '_blank' and e['k'] == k for e in L)

def tapa_centro(b, h):
    cx, cy = h['x'] + h['w'] / 2, h['y'] + h['h'] / 2
    return b['x'] <= cx <= b['x'] + b['w'] and b['y'] <= cy <= b['y'] + b['h']

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()

        # ---------- 1. en el ordenador, tocando las pantallas ----------
        ctx = await br.new_context(viewport={'width': 1440, 'height': 900}); await pon_hora(ctx)
        pg = oye(await ctx.new_page(), 'guía ordenador')
        await pg.goto(B + 'prueba.html'); await pg.wait_for_timeout(1200)
        es(await pg.locator('.gu-b').count() == 0, 'sin ?guia: la página de los tres móviles sale como siempre, sin guía')
        es(await pg.locator('#guiaBtn').count() == 1, 'y tiene el botón de la demo guiada')
        # sin empezar la guía («Prefiero mirarlo solo»): la demo se toca por su cuenta y la guía no vuelve sola
        await pg.click('#guiaBtn'); await espera_paso(pg, 0)
        await pg.click('.gu-b [data-g=sal]'); await pg.wait_for_timeout(400)
        cli0 = marco(pg, 'cita.html'); await cli0.locator('.avc').first.click(); await pg.wait_for_timeout(900)
        es(await pg.locator('.gu-b').count() == 0 and await cli0.locator('input[name=av]:checked').count() == 1 and await pg.locator('.ph').is_visible(),
           'saltarse la guía deja tocar la demo libremente (y la guía no vuelve sola)')
        es('tocarlo todo' in (await pg.locator('#guAviso').inner_text()), 'y lo dice: «Ya puedes tocarlo todo por tu cuenta»')
        await pg.click('#guiaBtn')
        r = await espera_paso(pg, 0)
        es(r and r['velo'] and 'Así funciona' in r['t'], f'la guía empieza con su presentación ({r and r["t"]})')
        es(await pg.evaluate("document.activeElement&&document.activeElement.dataset.g==='ya'"), 'presentación: el foco está en «Empezar»')
        await pg.click('.gu-b [data-g=ya]')
        r = await espera_paso(pg, 1)
        cli = marco(pg, 'cita.html')
        f = await pg.locator('#m-cli iframe').bounding_box()
        es(r['h'] and r['flecha'] and r['h']['x'] >= f['x'] - 8 and r['h']['x'] + r['h']['w'] <= f['x'] + f['width'] + 8,
           f'paso 1: señala las averías dentro del móvil del cliente, con su flecha ({r["h"]})')
        es(dentro(r['b'], r['W'], r['H']) and not tapa_centro(r['b'], r['h']), 'paso 1: la burbuja cabe en la pantalla y no tapa lo que señala')
        await cli.locator('.avc').first.click()
        r = await espera_paso(pg, 2)
        es('día y hora' in r['t'], f'elegir la avería en la web pasa solo al paso siguiente ({r["t"]})')
        await cli.locator('[data-fr]:not([disabled])').first.click()
        r = await espera_paso(pg, 3)
        es('datos' in r['t'], f'elegir la franja, también ({r["t"]})')
        await pg.click('.gu-b [data-g=b0]')   # «Rellenar por mí»
        r = await espera_paso(pg, 4)
        es('confirma' in r['t'] and await cli.locator('#rConfirma').count() == 1, f'«Rellenar por mí» rellena los datos y lleva al resumen ({r["t"]})')
        await cli.locator('#rConfirma').click()
        r = await espera_paso(pg, 5)
        cen = marco(pg, 'app.html', 'papel=')
        cita = await pg.evaluate("Oficio.estado().avisos.find(a=>a.origen==='cita'&&a.cli.nombre==='Laura')")
        es(cita and 'oficina' in r['t'] and r['h'], f'al confirmar, la cita entra en la oficina y la guía la señala ({r["t"]})')
        if cita:
            fila = await cen.locator(f'a.fila[href="#/aviso/{cita["id"]}"]').bounding_box()
            es(fila and r['h']['y'] <= fila['y'] + 2 and r['h']['y'] + r['h']['h'] >= fila['y'] + fila['height'] - 2, 'el hueco rodea la fila de la cita nueva')
        await pg.click('.gu-b [data-g=sig]')
        r = await espera_paso(pg, 6)
        U = await pg.evaluate('OficioGuia.aviso()')
        es('urgencia' in r['t'] and U, f'después, la urgencia que acaba de entrar ({U})')
        await cen.locator(f'button.dar[data-id="{U}"]').click()
        r = await espera_paso(pg, 7)
        A = await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{U}')")
        src = await pg.locator('#m-tec iframe').get_attribute('src')
        es(A['e'] == 'asignado' and f"tec={A['tec']}&" in src, f'al asignarla, el móvil del técnico es el suyo ({A["tec"]}, {src})')
        tec = marco(pg, 'papel=tecnico')
        await tec.wait_for_selector(f'[data-a=voy][data-id="{U}"]', timeout=8000)
        await tec.locator(f'[data-a=voy][data-id="{U}"]').click()
        r = await espera_paso(pg, 8)
        es('cliente' in r['t'].lower() and r['h'] and (await cli.evaluate('location.hash')) == f'#/aviso/{U}',
           f'tras «Voy», la guía enseña lo que ve el cliente en su página ({r["t"]})')
        await pg.click('.gu-b [data-g=sig]')
        r = await espera_paso(pg, 9)
        es('Precio' in r['t'] and r['h'], f'paso del precio firmado ({r["t"]})')
        await tec.locator(f'[data-a=empezar][data-id="{U}"]').click(); await pg.wait_for_timeout(900)
        r = await pg.evaluate(MIRA)
        es('Firma en el recuadro' in r['x'] and r['h'], f'al abrirse la hoja, la guía cambia el texto y señala la firma ({r["x"][:40]})')
        cv = await tec.locator('canvas#pF').bounding_box()
        await pg.mouse.move(cv['x'] + 30, cv['y'] + cv['height'] * .6); await pg.mouse.down()
        for i in range(1, 12): await pg.mouse.move(cv['x'] + 30 + i * 18, cv['y'] + cv['height'] * (.6 - .25 * ((-1) ** i)))
        await pg.mouse.up(); await pg.wait_for_timeout(300)
        await tec.locator('#pOk').click()
        r = await espera_paso(pg, 10)
        es('Terminado' in r['t'], f'firmar y empezar pasa a «Terminado» ({r["t"]})')
        await tec.locator(f'[data-a=terminar][data-id="{U}"]').click(); await pg.wait_for_timeout(700)
        await tec.locator('[data-modo=tarjeta]').click(); await tec.locator('#tOk').click()
        r = await espera_paso(pg, 11)
        hs = await pg.locator('.hojap iframe').get_attribute('src')
        es('papeles' in r['t'] and U in (hs or '') and r['h'], f'al cerrar, el parte de ese trabajo, señalado ({hs})')
        await pg.click('.gu-b [data-g=sig]')
        r = await espera_paso(pg, 12)
        es('oficina' in r['t'] and (await cen.evaluate('location.hash')) == '#/cobros' and r['h'], f'y los cobros de la oficina ({r["t"]})')
        await pg.click('.gu-b [data-g=sig]')
        r = await espera_paso(pg, 13)
        fin = await pg.locator('.gu-b').inner_text()
        es('hasta que encaje' in fin and 'tu forma de trabajar' in fin, 'el final dice que la adaptamos a su forma de trabajar')
        wa = await pg.evaluate("window.OOOX_CONTACTO&&OOOX_CONTACTO.wa||''")
        lo = await pg.locator('.gu-b a[data-contacto="demo"]').get_attribute('href') or ''
        from urllib.parse import unquote
        es(wa and lo.startswith(f'https://wa.me/{wa}?text=') and 'OOOX Oficios' in unquote(lo),
           f'«Lo quiero para mi negocio» abre el WhatsApp de Oscar, con su número de verdad, y el mensaje escrito ({lo[:60]})')
        es(await pg.locator('.gu-b a[href="video.html"]').count() == 1 and (await pg.locator('.gu-b [data-g=sal]').inner_text()).strip() == 'Volver a la demo',
           'el final lleva «Volver a la demo» y el vídeo')
        A = await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{U}')")
        es(A['e'] == 'hecho' and A['pago']['modo'] == 'tarjeta', f'el trabajo queda hecho y cobrado con tarjeta ({A["e"]})')
        await pg.click('.gu-b [data-g=sal]'); await pg.wait_for_timeout(900)
        es(await pg.locator('.gu-b').count() == 0 and await pg.locator('.ph').is_visible() and await pg.evaluate('scrollY') < 5,
           '«Volver a la demo» quita la guía y vuelve arriba, a las instrucciones y la cabecera')
        es((await pg.locator('#guAviso').inner_text()).endswith('«Demo guiada».'), 'y dice cómo volver a la guía')
        es(await pg.evaluate("Oficio.estado().avisos.some(a=>a.cli.nombre==='Laura')"), 'y la demo se queda como la dejó la guía, para seguir tocándola')
        # Esc y volver a empezar
        await pg.click('#guiaBtn'); await espera_paso(pg, 0)
        await pg.click('.gu-b [data-g=ya]'); await espera_paso(pg, 1)
        es((await pg.evaluate('Oficio.estado().avisos.some(a=>a.cli.nombre==="Laura")')) is False, 'volver a empezar deja la muestra como al principio')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        es(await pg.locator('.gu-b').count() == 0, 'Esc sale de la guía')
        await ctx.close()

        # ---------- 2. en el móvil, con «Hazlo por mí» ----------
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=NAV != 'firefox', has_touch=True); await pon_hora(ctx); await con_numero(ctx)
        pg = oye(await ctx.new_page(), 'guía móvil')
        await pg.goto(B + 'prueba.html?guia')
        r = await espera_paso(pg, 0, 15000)
        es(r and r['velo'], 'con ?guia, la guía arranca sola')
        await pg.click('.gu-b [data-g=ya]')
        PANEL = {1: 'cli', 2: 'cli', 3: 'cli', 4: 'cli', 5: 'cen', 6: 'cen', 7: 'tec', 8: 'cli', 9: 'tec', 10: 'tec', 12: 'cen'}
        malos = []; tapados = []
        for n in range(1, 13):
            r = await espera_paso(pg, n)
            if not r or r['paso'] != n: malos.append(f'no llega al paso {n}'); break
            if n in PANEL and r['tab'] != 'm-' + PANEL[n]: malos.append(f'paso {n}: pestaña {r["tab"]}')
            if not dentro(r['b'], r['W'], r['H']): malos.append(f'paso {n}: la burbuja se sale {r["b"]}')
            if r['sw'] > r['W'] + 1: malos.append(f'paso {n}: la página se sale a lo ancho ({r["sw"]})')
            if not r['h']: malos.append(f'paso {n}: no señala nada')
            elif r['h']['h'] < r['H'] * .5 and tapa_centro(r['b'], r['h']): tapados.append(n)
            if n == 1: await marco(pg, 'cita.html').locator('.avc').first.click()
            elif await pg.locator('.gu-b [data-g=sig]').count(): await pg.click('.gu-b [data-g=sig]')
            else: await pg.click('.gu-b [data-g=b0]')
        es(not malos, f'móvil: cada paso cambia al móvil que toca, señala algo y la burbuja cabe {malos[:3]}')
        es(not tapados, f'móvil: la burbuja no tapa lo que señala (pasos {tapados})')
        r = await espera_paso(pg, 13)
        es(r and r['paso'] == 13 and dentro(r['b'], r['W'], r['H']), 'móvil: llega al final y cabe en la pantalla')
        U = await pg.evaluate('OficioGuia.aviso()')
        es(await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{U}').e") == 'hecho', 'móvil: «Hazlo por mí» cierra el trabajo entero')
        L = await pg.evaluate(ENLACES_WA)
        es(va_a_whatsapp(L, 'demo', 'He probado la demo de OOOX Oficios y lo quiero para mi negocio') and {e['en'] for e in L} == {'guia', 'pagina'},
           f'con el número puesto, «Lo quiero para mi negocio» (el del final y el de arriba) abre WhatsApp con el mensaje escrito ({L[:1]})')
        es('mensaje ya escrito' in (await pg.locator('.gu-b').inner_text()), 'y el final avisa de que se abre WhatsApp con el mensaje escrito')
        await pg.click('.gu-b [data-g=sal]'); await pg.wait_for_timeout(500)
        v = await pg.evaluate("""(()=>{const f=document.querySelector('.mv.on iframe').getBoundingClientRect(),t=document.querySelector('.tabs').getBoundingClientRect();
          return{f:f.top<innerHeight-200&&f.bottom>200,t:t.top>=-1&&t.bottom<=innerHeight}})()""")
        es(v['f'] and v['t'] and await pg.locator('.gu-b').count() == 0, f'móvil: «Volver a la demo» deja el móvil a la vista para seguir tocando ({v})')
        av = await pg.evaluate("""(()=>{const n=document.querySelector('#guAviso'),r=n.getBoundingClientRect(),t=document.querySelector('.tabs').getBoundingClientRect();
          return{ve:n.classList.contains('ve'),arriba:r.top>=t.bottom-1&&r.bottom<innerHeight*.4,x:n.textContent}})()""")
        es(av['ve'] and av['arriba'] and 'más arriba' in av['x'], f'móvil: el aviso sale arriba, sin tapar la barra de la app, y dice dónde está la guía ({av})')
        await pg.wait_for_timeout(300)
        cen = marco(pg, 'app.html', 'tecnico')
        await cen.locator('h1, h2').first.click(); await pg.wait_for_timeout(500)
        es(not await pg.evaluate("document.querySelector('#guAviso').classList.contains('ve')"), 'móvil: en cuanto se toca el móvil, el aviso se va')
        # sin empezar la guía, la página no se mueve de donde estaba
        await pg.evaluate('scrollTo(0,0)'); await pg.click('#guiaBtn'); await espera_paso(pg, 0)
        y0 = await pg.evaluate('scrollY'); await pg.click('.gu-b [data-g=sal]'); await pg.wait_for_timeout(400)
        es(await pg.locator('.gu-b').count() == 0 and abs(await pg.evaluate('scrollY') - y0) < 2, 'móvil: «Prefiero mirarlo solo» deja la página donde estaba')
        await ctx.close()

        # ---------- 3. la página del vídeo: el vídeo, su portada y los dos botones, en el móvil y en el ordenador ----------
        import urllib.request
        def existe(r):
            try: return urllib.request.urlopen(urllib.request.Request(B + r, method='HEAD')).status == 200
            except Exception: return False
        for w, hh in ((375, 812), (1440, 900)):
            ctx = await br.new_context(viewport={'width': w, 'height': hh}); await pon_hora(ctx); await con_numero(ctx)
            pg = oye(await ctx.new_page(), f'vídeo {w}')
            await pg.goto(B + 'video.html'); await pg.wait_for_timeout(900)
            v = await pg.evaluate("""(()=>{const v=document.querySelector('video'),s=v&&v.querySelector('source');return{src:s&&s.getAttribute('src'),poster:v&&v.getAttribute('poster'),
              sw:document.documentElement.scrollWidth,W:innerWidth,guia:!!document.querySelector('a.btn[href="prueba.html?guia"]'),mail:!!document.querySelector('a.btn[data-contacto="video"]'),
              h1:(document.querySelector('h1')||{}).textContent||'',noindex:!!document.querySelector('meta[name=robots][content*=noindex]')}})()""")
            es(v['src'] and existe(v['src']) and v['poster'] and existe(v['poster']), f'vídeo a {w} px: el vídeo y su portada existen ({v["src"]})')
            es(v['guia'] and v['mail'] and 'OOOX Oficios' in v['h1'] and v['noindex'], f'vídeo a {w} px: título, «Probar la demo guiada», «Lo quiero para mi negocio» y sin indexar')
            es(v['sw'] <= v['W'] + 1, f'vídeo a {w} px: nada se sale a lo ancho ({v["sw"]})')
            L = await pg.evaluate(ENLACES_WA)
            es(va_a_whatsapp(L, 'video', 'He visto el vídeo de OOOX Oficios y lo quiero para mi negocio'), f'vídeo a {w} px: «Lo quiero para mi negocio» abre WhatsApp con el mensaje escrito')
            await ctx.close()
        # sin número (si algún día se vacía js/ooox-contacto.js), «Lo quiero» se queda en el correo, en la misma pestaña
        ctx = await br.new_context(viewport={'width': 375, 'height': 812}); await pon_hora(ctx); await con_numero(ctx, '')
        pg = oye(await ctx.new_page(), 'vídeo sin número')
        await pg.goto(B + 'video.html'); await pg.wait_for_timeout(700)
        L = await pg.evaluate(ENLACES_WA)
        es(bool(L) and all(e['href'].startswith('mailto:software@ooox.es') and e['t'] != '_blank' for e in L),
           f'sin número, «Lo quiero para mi negocio» escribe a software@ooox.es ({L[:1]})')
        await ctx.close()
        es(existe('assets/video/oficios-demo-correo.jpg'), 'la imagen del correo está publicada')

        # ---------- 4. movimiento reducido: nada late ni se dibuja ----------
        ctx = await br.new_context(viewport={'width': 1280, 'height': 800}, reduced_motion='reduce'); await pon_hora(ctx)
        pg = oye(await ctx.new_page(), 'guía sin movimiento')
        await pg.goto(B + 'prueba.html?guia'); await espera_paso(pg, 0, 15000)
        await pg.click('.gu-b [data-g=ya]'); await espera_paso(pg, 1)
        an = await pg.evaluate("[getComputedStyle(document.querySelector('.gu-hueco'),'::after').animationName,getComputedStyle(document.querySelector('.gu-flecha path')).animationName]")
        es(an == ['none', 'none'], f'con movimiento reducido, ni el latido ni la flecha se animan ({an})')
        await pg.click('.gu-b [data-g=sal]')
        await ctx.close()
        await br.close()
    print(f'\n{"BIEN" if not fallos else "MAL"}: {ok} comprobaciones pasan' + (f', {len(fallos)} fallan.' if fallos else '.'))
    webkit_linux.resumen_rarezas()
    print('Errores de consola:', errores[:8] if errores else 'ninguno')
    sys.exit(1 if fallos or errores else 0)

asyncio.run(main())
