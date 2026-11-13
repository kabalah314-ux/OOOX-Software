# La web de Ramírez y la página de los tres móviles: archivos, idiomas, hora de Barcelona, desglose,
# barrio, menú, enlaces, metadatos, anchos y la página de prueba. Uso: python3 t9.py [puerto]
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, sys, re, json, urllib.request
from datetime import datetime, timezone
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []; rotos = []
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt)

def oye(pg, nombre):
    pg.on('console', lambda m: webkit_linux.consola(m, nombre, errores))
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    pg.on('response', lambda r: rotos.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.on('requestfailed', lambda r: rotos.append(f'falla {r.url} {r.failure}') if r.url.startswith(B) else None)
    return pg

from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        # ---------- 1. archivos: todo lo que se pide existe ----------
        textos = {}
        for f in ('index.html', 'cita.html', 'app.html', 'prueba.html', 'oficio.css', 'js/oficio-nucleo.js', 'js/oficio-datos.js', 'js/oficio-estado.js'):
            textos[f] = urllib.request.urlopen(B + f).read().decode('utf-8')
        refs = set()
        for f, s in textos.items():
            for m in re.finditer(r'''(?:src|href|poster|srcset)=["']([^"'#?]+)''', s): refs.add(m.group(1).split(' ')[0])
            for m in re.finditer(r'''url\(([^)'"]+)\)''', s): refs.add(m.group(1))
            for m in re.finditer(r'''['"`](assets/[^'"`$\s,]+\.(?:webp|jpg|png|mp4|svg|json|woff2?))''', s): refs.add(m.group(1))
        internas = sorted(r for r in refs if not re.match(r'(https?:|tel:|mailto:|data:|//|javascript:)', r) and r.strip() and not r.startswith('{') and not r.endswith('-') and '+' not in r)
        malas = []
        for r in internas:
            u = B + r.lstrip('./')
            if r in ('./', '/'): continue
            try:
                q = urllib.request.Request(u, method='HEAD'); code = urllib.request.urlopen(q).status
            except Exception as e: code = getattr(e, 'code', 'error')
            if code != 200: malas.append(f'{r} → {code}')
        es(not malas, f'archivos: los {len(internas)} archivos y enlaces internos que se citan existen {malas[:5]}')
        # los que dependen de la avería o la orientación
        avs = re.findall(r"\{id:'([a-z]+)'", textos['index.html'][textos['index.html'].find('const AV=['):textos['index.html'].find('const AV=[') + 4000])
        falt = []
        for a in avs:
            for f in (f'assets/img/av-{a}.webp', f'assets/img/av-{a}-s.webp'):
                try: urllib.request.urlopen(urllib.request.Request(B + f, method='HEAD'))
                except Exception: falt.append(f)
        for o in 'hv':
            for f in (f'assets/entrada-{o}.mp4', f'assets/entrada-{o}-poster.jpg', f'assets/img/fin-{o}.webp'):
                try: urllib.request.urlopen(urllib.request.Request(B + f, method='HEAD'))
                except Exception: falt.append(f)
        es(not falt, f'archivos: las fotos de las {len(avs)} averías y los vídeos de las dos orientaciones existen {falt}')

        # ---------- 2. idiomas: las tres versiones tienen las mismas frases ----------
        s = textos['index.html']
        I = json.loads(s[s.find('<script type="application/json" id="i18n">') + 42: s.find('</script>', s.find('id="i18n"'))])
        lenguas = sorted(I.keys())
        es(set(lenguas) >= {'ca', 'en'}, f'idiomas: hay catalán e inglés ({lenguas})')
        base = set(I['ca']); faltan = {l: sorted(base ^ set(I[l]))[:5] for l in ('en',) if set(I[l]) != base}
        es(set(I.get('es', {})) <= base, 'idiomas: lo que el castellano cambia por código también existe en catalán e inglés')
        es(not faltan, f'idiomas: las mismas claves en todos {faltan}')
        vacias = [f'{l}:{k}' for l in I for k, v in I[l].items() if not str(v).strip()]
        es(not vacias, f'idiomas: ninguna frase vacía {vacias[:5]}')
        dt = set(re.findall(r'data-t="([^"]+)"', s)) | {x.split(':')[1] for y in re.findall(r'data-ta="([^"]+)"', s) for x in y.split(';')}
        ft = set(re.findall(r"""\bt\('([a-zA-Z0-9.]+)'""", s))
        sin = sorted(k for k in (dt | ft) if k not in I['ca'] and not k.endswith('.'))
        es(not sin, f'idiomas: cada texto que se traduce tiene su traducción {sin[:8]}')
        for l in ('ca', 'en'):
            cl = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='Europe/Madrid'); await pon_hora(cl)
            pg = oye(await cl.new_page(), 'web ' + l)
            await pg.goto(B + f'index.html?lang={l}'); await pg.wait_for_timeout(700)
            r = await pg.evaluate("({lang:document.documentElement.lang,h:document.querySelector('h1').innerText,vacios:[...document.querySelectorAll('[data-t]')].filter(e=>!e.textContent.trim()).map(e=>e.dataset.t).slice(0,5)})")
            es(r['lang'] == l and not r['vacios'], f'idiomas: en {l} la página cambia el idioma y no deja textos vacíos ({r})')
            await pg.context.close()

        # ---------- 3. la hora de Barcelona decide la tarifa: la web y la app dicen lo mismo ----------
        casos = [('2026-11-16T10:00:00+01:00', False, 'lunes a las 10'), ('2026-11-16T07:59:00+01:00', True, 'lunes a las 7:59'), ('2026-11-16T08:00:00+01:00', False, 'lunes a las 8:00'),
                 ('2026-11-16T19:59:00+01:00', False, 'lunes a las 19:59'), ('2026-11-16T20:00:00+01:00', True, 'lunes a las 20:00'), ('2026-11-14T11:00:00+01:00', True, 'sábado'),
                 ('2026-11-15T11:00:00+01:00', True, 'domingo'), ('2026-12-08T11:00:00+01:00', True, 'Inmaculada'), ('2027-12-06T11:00:00+01:00', True, '6 de diciembre de 2027'),
                 ('2027-12-07T11:00:00+01:00', False, 'martes 7 de diciembre de 2027'), ('2027-07-14T09:30:00+02:00', False, 'un día de verano a las 9:30'), ('2026-09-24T12:00:00+02:00', True, 'la Mercè')]
        for iso, urg, nombre in casos:
            ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='Europe/Madrid')
            pg = oye(await ctx.new_page(), 'hora')
            await pon_hora(ctx, iso)
            await pg.goto(B + 'index.html'); await pg.wait_for_timeout(500)
            web = await pg.evaluate("({u:document.body.classList.contains('is-urg'),t:document.querySelector('#ahoraT').textContent,p:document.querySelector('#avP').textContent})")
            await pg.goto(B + 'app.html'); await pg.wait_for_timeout(300)
            app = await pg.evaluate("OficioNucleo.urgente(OficioNucleo.cfgDe(OFICIO_NEGOCIO),Date.now())")
            es(web['u'] == urg and app == urg, f'tarifa {nombre}: {"urgencia" if urg else "normal"} en la web y en la app (web {web["u"]}, app {app})')
            await ctx.close()

        # ---------- 4. el desglose de cada avería cuadra ----------
        ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='Europe/Madrid')
        pg = oye(await ctx.new_page(), 'desglose')
        await pon_hora(ctx, '2026-11-16T10:00:00+01:00')
        await pg.goto(B + 'index.html'); await pg.wait_for_timeout(600)
        vistos = set()
        for i in range(len(avs)):
            n = await pg.locator('#avN').text_content()
            await pg.evaluate("document.querySelector('#esEsto').click()"); await pg.wait_for_timeout(450)
            r = await pg.evaluate("""(()=>{const nums=t=>[...t.matchAll(/(\\d+(?:[.,]\\d+)?)\\s?€/g)].map(m=>parseFloat(m[1].replace(',','.')));
              const filas=[...document.querySelectorAll('#dRows > *')].map(f=>f.innerText);const tot=document.querySelector('#dTot').innerText;
              return{filas,tot,abierto:document.querySelector('#p-desglose').getAttribute('aria-hidden')==='false',sa:filas.map(f=>nums(f)[0]||0),sb:filas.map(f=>{const x=nums(f);return x[x.length-1]||0}),t:nums(tot)}})()""")
            vistos.add(n)
            sa, sb = round(sum(r['sa']), 2), round(sum(r['sb']), 2)
            es(r['abierto'] and r['t'] and abs(r['t'][0] - sa) < 0.01 and abs(r['t'][-1] - sb) < 0.01, f'desglose «{n}»: las filas suman el total ({sa}–{sb} vs {r["tot"]})')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            es(await pg.evaluate("document.querySelector('#p-desglose').getAttribute('aria-hidden')") == 'true', f'desglose «{n}»: se cierra con Escape')
            await pg.evaluate("document.querySelector('#avNext').click()"); await pg.wait_for_timeout(300)
        es(len(vistos) == len(avs), f'averías: «siguiente» recorre las {len(avs)} ({len(vistos)})')

        # ---------- 5. el código postal y el menú ----------
        await pg.locator('#cp').fill('08008'); await pg.wait_for_timeout(200)
        m1 = await pg.locator('#baR').inner_text()
        await pg.locator('#cp').fill('28001'); await pg.wait_for_timeout(200)
        m2 = await pg.locator('#cpMsg').text_content()
        await pg.locator('#cp').fill(''); await pg.locator('#cp').type('0800a8'); await pg.wait_for_timeout(150)
        v3 = await pg.locator('#cp').input_value()
        es('Eixample' in m1 and 'min' in m1, f'barrio: 08008 dice Eixample y los minutos ({m1})')
        es('no es de Barcelona' in m2, f'barrio: 28001 dice que no es de Barcelona y que llames ({m2[:60]})')
        es(v3 == '08008', f'barrio: el campo solo admite cifras ({v3})')
        await pg.evaluate("scrollTo(0,0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('#navOpen').click()"); await pg.wait_for_timeout(400)
        abierto = await pg.evaluate("document.body.classList.contains('navsheet-on')")
        enl = await pg.evaluate("[...document.querySelectorAll('#navsheet a[href^=\"#\"]')].map(a=>a.getAttribute('href'))")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        es(abierto and len(enl) >= 4 and not await pg.evaluate("document.body.classList.contains('navsheet-on')"), f'menú: se abre, tiene {len(enl)} secciones y se cierra con Escape')
        destinos_ok = True
        for h in enl:
            if len(h) > 1 and not await pg.evaluate(f"!!document.getElementById('{h[1:]}')"): destinos_ok = False
        es(destinos_ok, f'menú: cada enlace lleva a una sección que existe {enl}')
        await ctx.close()

        # ---------- 6. metadatos de cada página ----------
        for f in ('index.html', 'cita.html', 'app.html', 'prueba.html'):
            s = textos[f]
            tiene = {k: bool(re.search(r, s)) for k, r in {'title': r'<title>[^<]{10,}</title>', 'lang': r'<html[^>]*lang="es"', 'viewport': r'name="viewport"', 'description': r'name="description" content="[^"]{30,}"', 'theme': r'name="theme-color"'}.items()}
            es(all(tiene.values()), f'{f}: título, idioma, viewport, descripción y color {tiene}')
        og = re.search(r'property="og:image" content="([^"]+)"', textos['index.html'])
        es(bool(og), 'index: tiene imagen para compartir (og:image)')
        noi = {f: bool(re.search(r'name="robots" content="[^"]*noindex', textos[f])) for f in ('index.html', 'cita.html', 'app.html', 'prueba.html')}
        es(all(noi.values()), f'las cuatro páginas son de muestra y no se indexan {noi}')

        # ---------- 7. la web en todos los anchos: nada se sale en ninguna sección ----------
        for w, h in ((320, 640), (375, 812), (390, 844), (430, 932), (768, 1024), (1024, 768), (1280, 800), (1440, 900), (1920, 1080)):
            ctx = await br.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 800, has_touch=w < 800)
            await pon_hora(ctx)
            pg = oye(await ctx.new_page(), f'web {w}')
            await pg.goto(B + 'index.html#averias'); await pg.wait_for_timeout(900)
            peor = []
            for sec in ('averias', 'cuesta', 'barrio', 'garantia', 'mientras', 'fin'):
                r = await pg.evaluate(f"""(()=>{{const S=document.getElementById('{sec}');S.scrollIntoView();const W=innerWidth;
                  const fuera=[...S.querySelectorAll('*')].filter(e=>{{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||s.position==='fixed')return false;const q=e.getBoundingClientRect();if(!q.width||!q.height)return false;let p=e.parentElement;while(p&&p!==S){{const ps=getComputedStyle(p);if(/auto|scroll|hidden|clip/.test(ps.overflowX))return false;p=p.parentElement}}return q.right>W+1||q.left<-1}}).slice(0,2).map(e=>e.tagName+'.'+String(e.className).slice(0,30));
                  return{{sw:document.documentElement.scrollWidth,fuera}}}})()""")
                if r['sw'] > w + 1 or r['fuera']: peor.append((sec, r))
            es(not peor, f'web a {w}×{h}: ninguna sección se sale {peor[:2]}')
            await ctx.close()

        # ---------- 8. la página de los tres móviles ----------
        ctx = await br.new_context(viewport={'width': 1440, 'height': 900})
        await pon_hora(ctx)
        pg = oye(await ctx.new_page(), 'prueba')
        await pg.goto(B + 'prueba.html'); await pg.wait_for_timeout(1500)
        fr = [f for f in pg.frames if f != pg.main_frame]
        es(len(fr) >= 3, f'prueba: carga los tres móviles y los papeles ({len(fr)} marcos)')
        cli = next(f for f in fr if 'cita.html' in f.url); cen = next(f for f in fr if 'app.html' in f.url and 'papel=tecnico' not in f.url and 'solo' not in f.url)
        tec = next(f for f in fr if 'papel=tecnico' in f.url)
        idp = await cli.evaluate("Oficio.hacer({tipo:'pedir',av:'atasco',cli:{nombre:'Prueba Tres',tel:'644555666',dir:'C/ Consell de Cent 300, 2.º',cp:'08007'}},{rol:'cliente'}).id")
        await pg.wait_for_timeout(500)
        es('Prueba Tres' in await cen.locator('main').inner_text(), f'prueba: lo que pide el cliente ({idp}) aparece en la centralita sin recargar')
        await cen.evaluate(f"Oficio.hacer({{tipo:'asignar',id:'{idp}',tec:'omar'}},{{rol:'centralita'}})"); await pg.wait_for_timeout(500)
        es(await tec.locator('[data-a=voy]').count() >= 1, 'prueba: y al asignarlo le sale a Omar con su «Voy»')
        es(await pg.locator('[data-pack]').count() == 0 and await cen.locator('#nav a[href="#/cobros"]').count() == 1, 'prueba: ya no hay interruptor de pack; los cobros están siempre')
        await pg.click('#re'); await pg.wait_for_timeout(1300)
        es('Prueba Tres' not in await cen.locator('main').inner_text(), 'prueba: «Reiniciar» vuelve a la muestra')
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(400)
        tabs = await pg.locator('[data-t^="m-"]').count()
        es(tabs >= 3, f'prueba: en el móvil, pestañas para cambiar de móvil ({tabs})')
        await ctx.close()
        await br.close()
    print(f'\n{"BIEN" if not fallos else "MAL"}: {ok} comprobaciones pasan' + (f', {len(fallos)} fallan.' if fallos else '.'))
    webkit_linux.resumen_rarezas()
    print('Errores de consola:', errores[:8] if errores else 'ninguno')
    print('Peticiones rotas:', sorted(set(rotos))[:8] if rotos else 'ninguna')
    sys.exit(1 if fallos or errores or rotos else 0)

asyncio.run(main())
