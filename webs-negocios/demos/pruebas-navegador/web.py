# La web de Ramírez y la página de los tres móviles: archivos, idiomas, hora de Barcelona, desglose,
# barrio, menú, enlaces, metadatos, anchos y la página de prueba. Uso: python3 t9.py [puerto]
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, sys, re, json, urllib.request
from datetime import datetime, timezone
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # el buzón de mejoras no sale a internet en las pruebas: ver buzon_falso.py

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
    # una foto que el navegador corta porque la página cambia o se cierra mientras carga no es un archivo roto (ERR_ABORTED); un 404 sí cuenta, por la línea de arriba
    pg.on('requestfailed', lambda r: rotos.append(f'falla {r.url} {r.failure}') if r.url.startswith(B) and not (r.resource_type == 'image' and any(x in (r.failure or '') for x in ('ERR_ABORTED', 'cancelled', 'NS_BINDING_ABORTED'))) else None)   # Chromium, WebKit y Firefox lo dicen así
    return pg

from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        # ---------- 1. archivos: todo lo que se pide existe ----------
        textos = {}
        for f in ('index.html', 'cita.html', 'app.html', 'prueba.html', 'oficio.css', 'js/oficio-nucleo.js', 'js/oficio-datos.js', 'js/oficio-espejo.js', 'js/oficio-estado.js'):
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
            web = await pg.evaluate("({u:document.body.classList.contains('is-urg'),t:document.querySelector('#ahoraT').textContent,urg:Object.fromEntries([...document.querySelectorAll('[data-urg]')].map(e=>[e.dataset.urg,e.textContent]))})")
            await pg.goto(B + 'app.html'); await pg.wait_for_timeout(300)
            app = await pg.evaluate("OficioNucleo.urgente(OficioNucleo.cfgDe(OFICIO_NEGOCIO),Date.now())")
            es(web['u'] == urg and app == urg, f'tarifa {nombre}: {"urgencia" if urg else "normal"} en la web y en la app (web {web["u"]}, app {app})')
            # el urgente de cada tarjeta (18-11-2026): de día, el de con cita y el suplemento; de noche y festivos, también el recargo
            P = await pg.evaluate("(()=>{const cfg=OficioNucleo.cfgDe(OFICIO_NEGOCIO);return Object.fromEntries(OficioNucleo.webDe({},cfg).map(x=>{const p=OficioNucleo.webPrecios(cfg,x);return[x.id,(p.un*(%s)+p.u*(%s))/100]}))})()" % (int(urg), int(not urg)))
            es(all(abs(float(re.sub(r'[^0-9,]', '', web['urg'][k]).replace(',', '.')) - P[k]) < 0.01 for k in P), f'tarifa {nombre}: el urgente de cada tarjeta es el de las reglas a esa hora ({web["urg"]} / {P})')
            await ctx.close()

        # ---------- 4. el desglose de cada avería cuadra ----------
        ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='Europe/Madrid')
        pg = oye(await ctx.new_page(), 'desglose')
        await pon_hora(ctx, '2026-11-16T10:00:00+01:00')
        await pg.goto(B + 'index.html'); await pg.wait_for_timeout(600)
        vistos = set()
        for av in avs:
            n = (await pg.locator(f'.svc[data-av="{av}"] h3').text_content()).strip()
            await pg.evaluate(f"document.querySelector('[data-incluye=\"{av}\"]').click()"); await pg.wait_for_timeout(450)
            r = await pg.evaluate("""(()=>{const nums=t=>[...t.matchAll(/(\\d+(?:[.,]\\d+)?)\\s?€/g)].map(m=>parseFloat(m[1].replace(',','.')));
              const filas=[...document.querySelectorAll('#dRows > *')].map(f=>f.innerText);const tot=document.querySelector('#dTot').innerText;
              return{filas,tot,abierto:document.querySelector('#p-desglose').getAttribute('aria-hidden')==='false',sa:filas.map(f=>nums(f)[0]||0),sb:filas.map(f=>{const x=nums(f);return x[x.length-1]||0}),t:nums(tot),
               res:document.querySelector('#dRes').getAttribute('href'),resT:document.querySelector('#dResT').textContent,alt:document.querySelector('#dAlt').textContent}})()""")
            vistos.add(n)
            sa, sb = round(sum(r['sa']), 2), round(sum(r['sb']), 2)
            es(r['abierto'] and r['t'] and abs(r['t'][0] - sa) < 0.01 and abs(r['t'][-1] - sb) < 0.01, f'desglose «{n}»: las filas suman el total ({sa}–{sb} vs {r["tot"]})')
            ua = await pg.evaluate(f"document.querySelector('[data-urg=\"{av}\"]').textContent")
            es(re.findall(r'(\d+(?:,\d+)?) €', ua)[:1] == re.findall(r'(\d+(?:,\d+)?) €', r['alt'])[:1], f'tarjeta «{n}»: el urgente de la tarjeta es el de «Qué incluye» ({ua} / {r["alt"][:60]})')
            es(r['res'] == f'cita.html?servicio={av}&lang=es' and r['resT'] == f'Reservar {n}' and 'suplemento' in r['alt'] and '%' not in r['alt'], f'desglose «{n}»: reserva ese servicio y explica la urgencia con una cifra, sin porcentajes ({r["res"]}, {r["alt"]})')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            es(await pg.evaluate("document.querySelector('#p-desglose').getAttribute('aria-hidden')") == 'true', f'desglose «{n}»: se cierra con Escape')
        es(len(vistos) == len(avs), f'servicios: hay una tarjeta con su desglose para cada una de las {len(avs)} averías ({len(vistos)})')

        # ---------- 4 bis. cada tarjeta de servicio (auditoría A3, 16-11): su precio es el de la cita y su botón abre la cita con ese servicio ----------
        for av in avs:
            tj = await pg.evaluate(f"""(()=>{{const c=document.querySelector('.svc[data-av="{av}"]'),a=c.querySelector('[data-reserva]');
              return{{k:c.querySelector('.svk').textContent.trim(),u:c.querySelector('.svu').textContent.trim(),n:c.querySelector('h3').textContent.trim(),p:c.querySelector('[data-precio]').textContent.trim(),href:a.getAttribute('href'),aria:a.getAttribute('aria-label'),img:c.querySelector('img').getAttribute('src'),d:c.querySelector('.svd').textContent.trim()}}}})()""")
            es(tj['k'] == 'Con cita' and re.match(r'Urgente\s*desde \d+', tj['u']), f'tarjeta «{tj["n"]}»: dos precios, con cita y urgente ({tj["k"]} {tj["p"]} · {tj["u"]})')
            es(tj['href'] == f'cita.html?servicio={av}&lang=es' and tj['aria'] == f'Reservar {tj["n"]}' and tj['d'] and av in tj['img'], f'tarjeta «{tj["n"]}»: foto, frase, y «Reservar {tj["n"]}» lleva a cita.html?servicio={av} (con el idioma)')
            await pg.goto(B + tj['href']); await pg.wait_for_selector('#f')
            ci = await pg.evaluate("({el:(document.querySelector('.lleva')||{}).textContent||'',r:(document.querySelector('.rango .num')||{}).textContent||'',grid:document.querySelectorAll('input[name=av]').length,p:document.querySelector('#f').dataset.paso})")
            nums_w = [int(x) for x in re.findall(r'(\d+)', tj['p'].split('+')[0])]; nums_c = [int(x) for x in re.findall(r'(\d+)', ci['r'])]
            es(tj['n'] in ci['el'] and ci['grid'] == 0 and ci['p'] == 'det' and nums_w == nums_c, f'tarjeta «{tj["n"]}»: la cita empieza en el paso 2, con {tj["n"]} ya elegido y el mismo precio ({tj["p"]} en la web, {ci["r"]} en la cita)')
            await pg.click('#atras'); await pg.wait_for_selector('#f[data-paso=av]')
            es(await pg.locator('input[name=av]').count() == len(avs) and await pg.locator(f'input[name=av][value={av}]').is_checked(), f'tarjeta «{tj["n"]}»: en la cita se puede cambiar de servicio sin empezar de nuevo')
            await pg.goto(B + 'index.html'); await pg.wait_for_timeout(500)

        # ---------- 4 ter. los servicios de la web los cambia el negocio desde su app (18-11-2026): se ven al momento ----------
        cw = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='Europe/Madrid'); await pon_hora(cw, '2026-11-16T10:00:00+01:00')
        wv = oye(await cw.new_page(), 'web en vivo'); ap = oye(await cw.new_page(), 'app que cambia la web')
        await wv.goto(B + 'index.html'); await ap.goto(B + 'app.html'); await wv.wait_for_timeout(700)
        r1 = await ap.evaluate("""(()=>{const C={rol:'centralita',id:'oficina'},h=a=>Oficio.hacer(a,C).ok;
          return [h({tipo:'web',av:'fuga',n:'Fugas y goteras',desde:80,hasta:150}),h({tipo:'web',av:'grifo',oculto:true}),h({tipo:'web',orden:['atasco','fuga','termo','cisterna','grifo','otra']})]})()""")
        await wv.wait_for_timeout(700)
        v = await wv.evaluate("[...document.querySelectorAll('#svs .svc')].map(c=>({id:c.dataset.av,n:c.querySelector('h3').textContent,p:c.querySelector('[data-precio]').textContent,u:c.querySelector('[data-urg]').textContent,h:c.querySelector('[data-reserva]').getAttribute('aria-label')}))")
        f = next((x for x in v if x['id'] == 'fuga'), {})
        es(all(r1) and [x['id'] for x in v] == ['atasco', 'fuga', 'termo', 'cisterna', 'otra'] and f.get('n') == 'Fugas y goteras' and f.get('p') == '80–150 €' and '110' in f.get('u', '') and f.get('h') == 'Reservar Fugas y goteras' and await wv.locator('#svDots i').count() == 5,
           f'servicios: lo que cambia la oficina en su app (nombre, precio, orden y quitar uno) sale en la web sin recargar ({v[:2]})')
        await wv.evaluate("document.querySelector('[data-incluye=fuga]').click()"); await wv.wait_for_timeout(450)
        d = await wv.evaluate("({t:document.querySelector('#dT').textContent,filas:document.querySelectorAll('#dRows > *').length,tot:document.querySelector('#dTot').textContent,alt:document.querySelector('#dAlt').textContent,res:document.querySelector('#dResT').textContent})")
        es('Fugas y goteras' in d['t'] and d['res'] == 'Reservar Fugas y goteras' and d['filas'] == 0 and d['tot'] == '80–150 €' and '110' in d['alt'], f'servicios: con un precio propio, «Qué incluye» da ese total y su urgente, sin las líneas del catálogo ({d})')
        await wv.goto(B + 'cita.html'); await wv.wait_for_selector('#f')
        cn = await wv.evaluate("[...document.querySelectorAll('.avc span')].map(e=>e.textContent)")
        await wv.locator('.avc:has(input[value=fuga])').click(); await wv.wait_for_timeout(250)
        es(cn == ['Atasco', 'Fugas y goteras', 'Sin agua caliente', 'Cisterna que pierde', 'Otra avería'] and 'De 80 € a 150 €' in await wv.locator('.rango .num').inner_text(), f'servicios: la cita, igual: su orden, su nombre, su precio y sin el que se ha quitado ({cn})')
        await wv.goto(B + 'cita.html?servicio=fuga'); await wv.wait_for_selector('#f')
        es('Fugas y goteras' in await wv.locator('.lleva').inner_text(), 'servicios: y «Reservar» desde la web lleva «Fugas y goteras» ya elegido')
        # la cita (19-11-2026, lo pidió Oscar): «Pide tu cita aquí.», debajo solo «¿No puedes esperar? Contrata el servicio urgente»,
        # la caja «Explícanos cuál es el problema» y un calendario de lunes a viernes sin hoy (hoy es para las urgencias)
        c2 = await wv.evaluate("({h1:document.querySelector('h1').textContent,lead:document.querySelector('#urgLead').textContent,lb:document.querySelector('label[for=c_nota]').textContent,ph:document.querySelector('#c_nota').placeholder,pn:document.querySelector('.pn').textContent})")
        await wv.click('#sigue'); await wv.wait_for_selector('#f[data-paso=fr]')
        ct = await wv.evaluate("""(()=>{const hoy=Oficio.K.madrid().date,d=[...document.querySelectorAll('[data-dia]')].map(b=>b.dataset.dia);
          return {h1:document.querySelector('h1').textContent,sem:document.querySelectorAll('.cal-sem span').length,dias:d,hoy,
           finde:d.filter(f=>[0,6].includes(new Date(f+'T12:00:00Z').getUTCDay())).length,sel:document.querySelectorAll('[data-dia][aria-checked=true]').length,
           hd:document.querySelector('.hd').textContent,otro:(document.querySelector('[data-dia][aria-checked=false]')||{dataset:{}}).dataset.dia||''}})()""")
        es(c2['h1'] == '¿Algo que debamos saber?' and c2['pn'] == 'Paso 2 de 4' and c2['lead'] == '¿No puedes esperar? Contrata el servicio urgente' and c2['lb'].startswith('Explícanos cuál es el problema')
           and c2['ph'] == '¿Algún detalle importante que debamos saber? Explícanos cuál es la situación.', f"la cita (paso a paso, 20-11): desde la web, el paso 2 con su pregunta, la frase de la urgencia y la caja de la avería ({c2['h1']} · {c2['lead']} · {c2['lb']})")
        es(ct['h1'] == '¿Cuándo te va bien?', f"la cita: el paso 3 pregunta cuándo ({ct['h1']})")
        es(ct['sem'] == 5 and ct['hoy'] not in ct['dias'] and ct['finde'] == 0 and len(ct['dias']) >= 2 and ct['sel'] == 1, f"la cita: el calendario va de lunes a viernes, sin hoy, con un día elegido ({ct['dias']})")
        d1 = ct['otro']; await wv.locator(f'[data-dia="{d1}"]').click(); await wv.wait_for_timeout(150); hd2 = await wv.locator('.hd').text_content()
        es(await wv.get_attribute(f'[data-dia="{d1}"]', 'aria-checked') == 'true' and hd2 != ct['hd'] and await wv.locator('.hk').count() >= 1 and await wv.locator('[data-fr]').count() >= 1,
           f'la cita: al tocar otro día, se marca y debajo salen sus franjas, por la mañana y por la tarde ({hd2})')
        await ap.evaluate("Oficio.reiniciar()"); await wv.goto(B + 'index.html'); await wv.wait_for_timeout(600)
        es(await wv.locator('#svs .svc').count() == 6 and 'Fuga de agua' in await wv.locator('.svc[data-av=fuga] h3').inner_text(), 'servicios: al reiniciar la demo, vuelven los de siempre')
        await cw.close()

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

        # ---------- 7 bis. en el móvil, cada pantalla entra entera entre la cabecera y la barra (16-11-2026) ----------
        # Se recorre como un usuario (una pantalla por gesto). Al pararse en cada sección: su título, entero debajo de la
        # cabecera, y ningún botón ni precio debajo de la barra de abajo. Antes, en un iPhone SE se escondían «Es esto»,
        # «Leer reseñas» y «Mandar la foto», y al seguir, el título se metía bajo la cabecera.
        for w, h in ((360, 640), (375, 667), (390, 844)):
            ctx = await br.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, timezone_id='Europe/Madrid'); await pon_hora(ctx)
            pg = oye(await ctx.new_page(), f'pantallas {w}x{h}')
            await pg.goto(B + 'index.html')   # se espera a que acabe la entrada: un gesto mientras corre solo se la salta
            await pg.wait_for_function("document.body.classList.contains('ready')", timeout=12000); await pg.wait_for_timeout(1000)
            await pg.evaluate("document.fonts.ready.then(()=>1)")   # con la letra de repuesto, más ancha, todo baja un poco
            malas = {}; vistas = set(); y0 = -1; enteros = set()
            MIDE = """(()=>{const top=document.querySelector('.top').getBoundingClientRect().bottom,bt=document.querySelector('.bar').getBoundingClientRect().top;
                  const S=[...document.querySelectorAll('section.sx')].find(s=>Math.abs(s.getBoundingClientRect().top)<3);if(!S)return null;const out=[];
                  S.querySelectorAll('h2,.btn,.svp,.fig').forEach(e=>{const q=e.getBoundingClientRect(),s=getComputedStyle(e);if(!q.width||!q.height||s.visibility==='hidden'||s.display==='none')return;if(e.closest('[hidden],.sheet,.panel'))return;
                   if(S.hasAttribute('data-largo')&&!e.matches('h2'))return;   /* la pantalla larga se mira aparte: abajo */
                   if(e.matches('h2')&&q.top<top-1)out.push('título bajo la cabecera: '+e.textContent.trim().slice(0,30));
                   if(!e.matches('h2')&&q.bottom>bt+1&&q.top<innerHeight)out.push('bajo la barra: '+e.textContent.trim().slice(0,30))});return{id:S.id,out}})()"""
            for _ in range(22):
                r = await pg.evaluate(MIDE)
                # si algo sale mal, se vuelve a mirar parado un momento: en una máquina cargada, el paso puede no haber acabado
                if r and r['out']: await pg.wait_for_timeout(900); r = await pg.evaluate(MIDE)
                if r:
                    vistas.add(r['id'])
                    if r['out']: malas[r['id']] = r['out']
                enteros.update(await pg.evaluate("""(()=>{const top=document.querySelector('.top').getBoundingClientRect().bottom,bt=document.querySelector('.bar').getBoundingClientRect().top;
                  return [...document.querySelectorAll('section[data-largo] .btn,section[data-largo] .svp')].map((e,i)=>{const q=e.getBoundingClientRect();return q.top>=top-1&&q.bottom<=bt+1?i:-1}).filter(i=>i>=0)})()"""))
                y = await pg.evaluate('scrollY')
                if y == y0: break
                y0 = y; await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(1400)
            es(len(vistas) >= 5 and not malas, f'pantallas a {w}×{h}: cada una entra entera, con el título a la vista y nada bajo la barra ({sorted(vistas)}) {malas}')
            nl = await pg.evaluate("document.querySelectorAll('section[data-largo] .btn,section[data-largo] .svp').length")
            es(nl > 0 and len(enteros) == nl, f'pantallas a {w}×{h}: en la de los servicios (más alta que el móvil), cada precio y cada «Reservar» se ve entero en alguna parada ({len(enteros)} de {nl})')
            await ctx.close()
        # ---------- 7 ter. en el móvil, los servicios en una fila que se pasa de lado (18-11-2026) ----------
        # La pantalla de los servicios entra entera y se queda quieta: las tarjetas, cuadradas, se pasan con el dedo de lado, y
        # el gesto hacia abajo va a la pantalla siguiente. Antes era una pantalla larga con paradas por filas, y al pasar por
        # encima con el dedo daba saltos.
        for w, h in ((360, 640), (390, 844)):
            ctx = await br.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, timezone_id='Europe/Madrid'); await pon_hora(ctx)
            pg = oye(await ctx.new_page(), f'servicios en fila {w}')
            await pg.goto(B + 'index.html'); await pg.wait_for_function("document.body.classList.contains('ready')", timeout=12000); await pg.wait_for_timeout(600)
            await pg.evaluate("(()=>{let t=0;for(let e=document.getElementById('averias');e;e=e.offsetParent)t+=e.offsetTop;scrollTo(0,t)})()"); await pg.wait_for_timeout(1300)
            r = await pg.evaluate("""(()=>{const s=document.getElementById('averias'),u=document.getElementById('svs'),C=[...u.children],cs=getComputedStyle(u),b=C.map(c=>c.getBoundingClientRect());
              const c0=C[0],q=c0.getBoundingClientRect(),en=(x,y)=>{const e=document.elementFromPoint(q.left+q.width*x,q.top+q.height*y);return e?(e.closest('a')?e.closest('a').getAttribute('href'):e.closest('button')?'boton:'+(e.closest('button').dataset.incluye||''):e.tagName):''};
              return{alto:s.offsetHeight,vh:innerHeight,n:C.length,fila:b.every(x=>Math.abs(x.top-b[0].top)<1),cuadradas:b.every(x=>Math.abs(x.width-x.height)<2),ox:cs.overflowX,snap:cs.scrollSnapType,dots:document.querySelectorAll('#svDots i').length,
               mas:u.scrollWidth>u.clientWidth,dentro:document.documentElement.scrollWidth<=innerWidth+1,foto:en(.5,.25),titulo:en(.3,.62),incluye:(()=>{const i=c0.querySelector('[data-incluye]').getBoundingClientRect();const e=document.elementFromPoint(i.left+i.width/2,i.top+i.height/2);return e&&e.closest('[data-incluye]')?'boton':''})()}})()""")
            es(r['alto'] <= r['vh'] + 1 and r['n'] == 6 and r['fila'] and r['cuadradas'] and r['ox'] == 'auto' and 'x' in r['snap'] and r['dots'] == 6 and r['mas'] and r['dentro'],
               f'servicios a {w}×{h}: una sola pantalla, con las seis tarjetas cuadradas en una fila que se pasa de lado ({r})')
            es(r['foto'] == 'cita.html?servicio=fuga&lang=es' and r['titulo'] == 'cita.html?servicio=fuga&lang=es' and r['incluye'] == 'boton', f'servicios a {w}×{h}: tocar la tarjeta (la foto o el nombre) abre la cita con ese servicio; «Qué incluye», su desglose ({r["foto"]}, {r["titulo"]}, {r["incluye"]})')
            if NAV == 'chromium':   # el dedo de verdad solo se puede simular en Chromium
                cdp = await ctx.new_cdp_session(pg)
                async def dedo(x0, y0, x1, y1):
                    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
                    for i in range(1, 11):
                        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / 10, 'y': y0 + (y1 - y0) * i / 10}]}); await asyncio.sleep(.016)
                    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                u = await pg.evaluate("(()=>{const b=document.getElementById('svs').getBoundingClientRect();return[b.top+b.height/2]})()")
                y0 = await pg.evaluate('scrollY')
                await dedo(w * .75, u[0], w * .25, u[0] + 8); await pg.wait_for_timeout(1200)   # medio móvil de lado, como se pasa una foto
                lado = await pg.evaluate("({sl:document.getElementById('svs').scrollLeft,y:scrollY,dot:[...document.querySelectorAll('#svDots i')].findIndex(d=>d.classList.contains('on'))})")
                paso = await pg.evaluate("(()=>{const c=document.querySelector('#svs .svc');return c.offsetWidth+parseFloat(getComputedStyle(document.getElementById('svs')).columnGap||'12')})()")
                es(abs(lado['sl'] - paso) < 3 and lado['y'] == y0 and lado['dot'] == 1, f'servicios a {w}×{h}: con el dedo de lado pasa a la tarjeta siguiente, la pantalla no se mueve y el punto lo marca ({lado}, antes {y0})')
                await dedo(w / 2, u[0], w / 2, u[0] - 260); await pg.wait_for_timeout(1700)
                y2 = await pg.evaluate("(()=>{let t=0;for(let e=document.getElementById('cuesta');e;e=e.offsetParent)t+=e.offsetTop;return[scrollY,t]})()")
                es(abs(y2[0] - y2[1]) < 2, f'servicios a {w}×{h}: el gesto hacia abajo va a la pantalla siguiente ({y2})')
            await ctx.close()
        # la entrada lleva también a la cita; los barrios, también en lista; las averías se llaman como en la cita y la app
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, timezone_id='Europe/Madrid'); await pon_hora(ctx)
        pg = oye(await ctx.new_page(), 'entrada y barrios'); await pg.goto(B + 'index.html')
        # la entrada (16-11-2026) es un vídeo corto que arranca solo; al acabar, la portada con la bienvenida
        await pg.wait_for_function("document.body.classList.contains('ready')", timeout=12000); await pg.wait_for_timeout(900)
        es(await pg.locator('#index .espera').count() == 0 and await pg.evaluate("getComputedStyle(document.querySelector('#index')).opacity==='1'"), 'entrada: al acabar el vídeo, sin el «¿Puede esperar? Pedir cita» del medio (19-11-2026): pedir cita va en los botones')
        es('Fontaneros 24 horas.' == (await pg.locator('#index h1').inner_text()).strip(), 'entrada: el título («Fontaneros 24 horas.») va en la portada, encima de la hora de llegada')
        barra = await pg.evaluate("[...document.querySelectorAll('.bar a')].map(a=>({t:a.innerText.trim(),urg:a.classList.contains('urg'),h:a.getAttribute('href'),cabe:a.scrollWidth<=a.clientWidth+1}))")
        es(len(barra) == 2 and barra[0]['urg'] and barra[0]['t'] == 'Pedir cita urgente' and barra[0]['h'].startswith('tel:') and not barra[1]['urg'] and barra[1]['t'] == 'Pedir cita'
           and barra[1]['h'] == 'cita.html?lang=es' and all(x['cabe'] for x in barra), f'entrada: abajo, «Pedir cita urgente», marcado como urgente, y «Pedir cita» al lado, los dos enteros ({barra})')
        es('suplemento de urgencia' in await pg.locator('#urgeL').inner_text() and '30 €' in await pg.locator('#urgeL').inner_text(), 'entrada: si no puede esperar, se dice en una frase, con el suplemento en euros')
        nb = await pg.locator('#baLista button').count()
        es(nb == await pg.locator('#mapa .d').count() == 10 and 'min' in await pg.locator('#baLista').inner_text(), f'barrio: debajo del mapa, la lista de los diez distritos con sus minutos ({nb})')
        await pg.evaluate("document.querySelector('#barrio').scrollIntoView()"); await pg.wait_for_timeout(500)
        await pg.locator('#baLista button[data-id="gra"]').click(); await pg.wait_for_timeout(300)
        es('Gràcia' in await pg.locator('#baR').inner_text() and await pg.get_attribute('#baLista button[data-id="gra"]', 'aria-pressed') == 'true' and await pg.evaluate("document.querySelector('#mapa .d[data-id=gra]').classList.contains('on')"), 'barrio: tocar un barrio de la lista hace lo mismo que tocarlo en el mapa')
        chips = await pg.evaluate("[...document.querySelectorAll('#svs h3')].map(b=>b.textContent.trim()).join(' | ')")
        es(all(x in chips for x in ('Fuga de agua', 'Sin agua caliente', 'Cisterna que pierde', 'Grifo que gotea', 'Otra avería')), f'servicios: los mismos nombres que en la cita y en la app ({chips[:80]!r})')
        tq = ' '.join((await pg.locator('#avT').text_content()).split())
        es(tq == '¿Qué necesitas arreglar?', f'servicios: la pregunta es «¿Qué necesitas arreglar?», la misma que en la cita ({tq!r})')
        # la cita y la zona del cliente van en el idioma de la web: el enlace lo lleva siempre (más en idiomas.py)
        await pg.evaluate("document.querySelector('[data-lang=ca]').click()"); await pg.wait_for_timeout(200)
        hca = await pg.get_attribute('.bar a.cita', 'href'); sca = await pg.get_attribute('[data-reserva=fuga]', 'href'); zca = await pg.evaluate("[...document.querySelectorAll('a[href^=\"cliente.html\"]')].map(a=>a.getAttribute('href'))")
        await pg.evaluate("document.querySelector('[data-lang=es]').click()"); await pg.wait_for_timeout(200)
        es(sca == 'cita.html?servicio=fuga&lang=ca', f'idioma: en catalán, «Reservar» lleva el servicio y el idioma ({sca})')
        hes = await pg.get_attribute('.bar a.cita', 'href')
        es(hca == 'cita.html?lang=ca' and hes == 'cita.html?lang=es' and zca and all(z == 'cliente.html?lang=ca' for z in zca), f'idioma: la cita y la zona del cliente se abren con el idioma de la web ({hca}, {hes}, {zca})')
        # «Lo que cuesta» (19-11-2026): «Ver el ejemplo» abre su hoja, como «Qué incluye», y el botón sigue diciendo «Ver el ejemplo»
        await pg.evaluate("document.querySelector('#verEj').click()"); await pg.wait_for_timeout(500)
        ej = await pg.evaluate("({abierta:document.querySelector('#p-ejemplo').getAttribute('aria-hidden')==='false',t:document.querySelector('#ejT').textContent,tot:document.querySelector('#ej3').textContent,dom:document.querySelector('#ejDom').textContent,btn:document.querySelector('#verEj').textContent,enParte:!!document.querySelector('#parte #ej3')})")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
        cerrada = await pg.evaluate("document.querySelector('#p-ejemplo').getAttribute('aria-hidden')==='true'")
        es(ej['abierta'] and ej['t'] == 'Un ejemplo.' and ej['tot'] == '97,50 €' and 'domingo' in ej['dom'] and ej['btn'] == 'Ver el ejemplo' and not ej['enParte'] and cerrada,
           f'lo que cuesta: «Ver el ejemplo» abre su hoja (con el total y el mismo trabajo un domingo) y se cierra; el botón no cambia ({ej}, cerrada: {cerrada})')
        await pg.goto(B + 'cita.html?lang=ca'); await pg.wait_for_selector('#f')
        es('Què necessites arreglar?' in await pg.locator('h1').inner_text() and await pg.evaluate('document.documentElement.lang') == 'ca' and await pg.locator('.nota-lang').count() == 0, 'idioma: la cita, en catalán (ya no avisa de que va en castellano)')
        await pg.goto(B + 'cita.html?lang=es'); await pg.wait_for_selector('#f')
        es('¿Qué necesitas arreglar?' in await pg.locator('h1').inner_text() and await pg.evaluate('document.documentElement.lang') == 'es', 'idioma: y en castellano')
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
        idp = await cli.evaluate("Oficio.hacer({tipo:'pedir',av:'atasco',cli:{nombre:'Prueba Tres',apellidos:'Prueba',tel:'644555666',dir:'C/ Consell de Cent 300, 2.º',cp:'08007'}},{rol:'cliente'}).id")
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
