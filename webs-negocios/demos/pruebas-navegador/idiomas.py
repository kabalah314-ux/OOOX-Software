# La cita, el seguimiento del aviso, la zona del cliente y sus papeles, en catalán y en inglés (js/oficio-idioma.js).
# Recorre las mismas pantallas en los dos idiomas (el formulario con y sin errores, el resumen, cada estado del aviso, la
# zona de cada cliente de muestra y cada papel, también el contrato y el desistimiento) y mira en cada una:
#  - que no falte ninguna traducción (OficioIdioma.faltan) y que la página diga su idioma (<html lang>);
#  - que no quede nada en castellano: lo que sale igual en catalán y en inglés tiene que ser un dato (un nombre, una
#    dirección, un número) o una de las pocas palabras que se escriben igual en los dos (Total, Bizum…);
#  - que nada se salga de la pantalla del móvil.
# Y además: el pie para cambiar de idioma, que el idioma elegido se queda (y es el mismo que el de la web), el ?lang= del
# enlace, las fechas y las franjas en cada idioma, y lo propio del negocio (sus averías, su catálogo) traducido.
# Uso: python3 idiomas.py [puerto]
import os, sys, re, asyncio, json
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # ningún navegador de las pruebas sale a internet: ver buzon_falso.py
PUERTO = sys.argv[1] if len(sys.argv) > 1 else '8765'
B = f'http://127.0.0.1:{PUERTO}/'
C = "{rol:'centralita',id:'oficina'}"
FI = "'M14 78C30 70 44 34 50 14 54 44 44 86 26 96'"

# lo que se ve: los textos, lo que leen los lectores de pantalla (aria-label, alt, placeholder, title) y el título
MIRA = """(()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;
 if(!p||p.closest('script,style,template'))return 2;return n.nodeValue.trim()?1:2}});let n;while(n=w.nextNode())out.push(n.nodeValue.trim().replace(/\\s+/g,' '));
 document.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(e=>['placeholder','aria-label','title','alt'].forEach(a=>{const v=e.getAttribute(a);if(v&&v.trim())out.push(v.trim())}));
 out.push(document.title);return{t:out,lang:document.documentElement.lang,falta:[...OficioIdioma.faltan],ancho:document.documentElement.scrollWidth-innerWidth}})()"""

async def recorre(br, lang):
    """Las mismas pantallas que ve un cliente, en un idioma. Devuelve {pantalla: lo que se ve} y los datos (nombres, direcciones…)."""
    P = {}
    ctx = await br.new_context(viewport={'width': 375, 'height': 812}, timezone_id='Europe/Madrid', locale='es-ES'); await pon_hora(ctx)
    await ctx.add_init_script("try{if(!localStorage.getItem('ramirez:lang'))localStorage.setItem('ramirez:lang','%s')}catch(e){}" % lang)
    errs = []
    async def mira(pg, nombre):
        await pg.wait_for_timeout(90); P[nombre] = await pg.evaluate(MIRA)
    async def hacer(accion, quien=C):
        r = await app.evaluate(f"Oficio.hacer({accion},{quien})")
        if not r or not r.get('ok'): raise SystemExit(f'{lang}: falla {accion} → {json.dumps(r)}')
        return r
    app = await ctx.new_page(); await app.goto(B + 'app.html#/bandeja'); await app.wait_for_selector('.alertas')
    k = await ctx.new_page(); k.on('pageerror', lambda e: errs.append(str(e)))
    await k.goto(B + 'cita.html'); await k.wait_for_selector('#f'); await mira(k, 'cita')
    await k.click('button[type=submit]'); await mira(k, 'cita con errores')
    await k.locator('input[name=av][value=otra]').check(force=True); await mira(k, 'cita, otra avería')
    await k.locator('input[name=av][value=fuga]').check(force=True)
    await k.locator('[data-dia]').nth(1).click(); await k.locator('[data-fr]:not([disabled])').first.click()
    await k.click('#altAbre')
    if await k.locator('#altMas').count(): await k.click('#altMas')
    await k.locator('[data-alt]').first.click(); await k.locator('[data-alt]').nth(1).click(); await mira(k, 'cita con franjas')
    await k.fill('#c_nomap', 'Pau'); await k.fill('#c_tel', '123'); await k.fill('#c_cp', '28001'); await k.click('button[type=submit]'); await mira(k, 'cita con datos mal')
    await k.fill('#c_nomap', 'Pau Ferrer'); await k.fill('#c_tel', '611223344'); await k.fill('#c_dir', 'C/ Balmes 100, 1.º'); await k.fill('#c_cp', '08008'); await k.fill('#c_nota', 'Gotea')
    await k.click('button[type=submit]'); await k.wait_for_selector('#rConfirma'); await mira(k, 'resumen')
    await k.click('#rConfirma'); await k.wait_for_function("location.hash.startsWith('#/aviso/')"); await mira(k, 'cita pedida')
    await k.click('#copiaId'); await mira(k, 'número copiado')
    idc = (await k.evaluate('location.hash')).split('/')[-1]
    await k.goto(B + 'cita.html?servicio=termo'); await k.wait_for_selector('#f'); await mira(k, 'cita desde la web')
    await k.goto(B + 'cita.html#/aviso/R-9999'); await mira(k, 'aviso que no existe')
    await k.goto(B + 'cita.html'); await k.wait_for_selector('#f'); await k.click('#llama'); await mira(k, 'llamada en la demo'); await k.keyboard.press('Escape')
    # cada aviso de la muestra, en cada estado: con técnico, de camino (con el mapa), sin nadie en casa y cancelado
    await app.evaluate(f"Object.keys(Oficio.cfg.tec).find(t=>Oficio.hacer({{tipo:'asignar',id:'{idc}',tec:t}},{C}).ok)||''")
    await k.goto(B + f'cita.html#/aviso/{idc}'); await mira(k, 'cita confirmada')
    for x in await app.evaluate("Oficio.estado().avisos.map(a=>a.id)"):
        await k.goto(B + f'cita.html#/aviso/{x}'); await mira(k, 'aviso ' + x)
    urg = await app.evaluate("Oficio.estado().avisos.filter(a=>a.e==='nuevo'&&!a.cita).map(a=>a.id)[0]")
    libre = await app.evaluate("(()=>{const S=Oficio.estado();return Object.keys(Oficio.cfg.tec).find(t=>!S.avisos.some(a=>a.tec===t&&(a.e==='camino'||a.e==='curso')))})()")
    T = "{rol:'tecnico',id:'" + libre + "'}"
    await hacer(f"{{tipo:'asignar',id:'{urg}',tec:'{libre}'}}"); await k.goto(B + f'cita.html#/aviso/{urg}'); await mira(k, 'urgencia con técnico')
    await hacer(f"{{tipo:'voy',id:'{urg}'}}", T); await hacer(f"{{tipo:'posicion',id:'{urg}',lat:41.4036,lon:2.1561}}", T); await k.reload(); await mira(k, 'de camino, con el mapa')
    await hacer(f"{{tipo:'ausente',id:'{urg}'}}", T); await k.reload(); await mira(k, 'no había nadie')
    await hacer(f"{{tipo:'cancelar',id:'{urg}'}}"); await k.reload(); await mira(k, 'cancelada')
    # papeles con todo: una urgencia con un aparato nuevo, una ampliación con material escrito a mano y sin pagar; una cita con
    # «empezar ya», cobrada y facturada; dos contratos, uno firmado y otro dado de baja
    r = await hacer("{tipo:'pedir',av:'termo',origen:'llamada',cli:{nombre:'Marc',apellidos:'Puig Soler',tel:'600 00 01 50',dir:'C/ de Pujades 100, 2.º',cp:'08005'}}", "{rol:'cliente'}"); u1 = r['id']
    await hacer(f"{{tipo:'asignar',id:'{u1}',tec:'{libre}'}}")
    await hacer(f"{{tipo:'empezar',id:'{u1}',pres:{{lineas:[{{k:'desp'}},{{k:'mo',q:1}},{{k:'termo80'}}],firma:{FI},pide:true}}}}", T)
    await hacer(f"{{tipo:'ampliar',id:'{u1}',lineas:[{{k:'otro',t:'Racor especial',p:12}},{{k:'termostato'}}],firma:{FI},pide:true}}", T)
    await hacer(f"{{tipo:'terminar',id:'{u1}',modo:'pendiente',firma:{FI}}}", T)
    d = await app.evaluate("(()=>{const d=OficioNucleo.diasDe(Oficio.estado(),Oficio.cfg,Date.now(),5).find(x=>!x.hoy&&x.franjas.some(f=>f.ok));return d.dia+'|'+d.franjas.find(f=>f.ok).id})()")
    di, fr = d.split('|')
    r = await hacer(f"{{tipo:'pedir',av:'grifo',origen:'cita',cita:{{dia:'{di}',fr:'{fr}'}},cli:{{nombre:'Rosa',apellidos:'Vidal',tel:'600 00 01 51',dir:'C/ de Sardenya 300, 1.º',cp:'08025'}}}}", "{rol:'cliente'}"); u2 = r['id']
    t2 = await app.evaluate(f"(()=>{{const S=Oficio.estado();return Object.keys(Oficio.cfg.tec).filter(t=>!S.avisos.some(a=>a.tec===t&&(a.e==='camino'||a.e==='curso'))).find(t=>Oficio.hacer({{tipo:'asignar',id:'{u2}',tec:t}},{C}).ok)||''}})()")
    T2 = "{rol:'tecnico',id:'" + t2 + "'}"
    await hacer(f"{{tipo:'empezar',id:'{u2}',pres:{{lineas:[{{k:'grifo'}},{{k:'latig'}}],firma:{FI},pide:true}}}}", T2)
    await hacer(f"{{tipo:'terminar',id:'{u2}',modo:'bizum'}}", T2); await hacer(f"{{tipo:'facturar',id:'{u2}',num:'F-7'}}")
    await hacer("{tipo:'contrato',plan:'anual',cli:{nombre:'Elvira',apellidos:'Casas',tel:'600 00 01 12',dir:'C/ Aragó 214, 4.º 2.ª',cp:'08011'},acepta:'firma',firma:" + FI + ",pide:true,modo:'tarjeta'}")
    r = await hacer("{tipo:'contrato',plan:'anual',cli:{nombre:'Carmen',apellidos:'Ortiz',tel:'600 00 01 40',dir:'C/ Mallorca 310, 3.º 1.ª',cp:'08037'},acepta:'mensaje'}")
    await hacer("{tipo:'bajaContrato',id:'" + (await app.evaluate("Oficio.estado().contratos.slice(-1)[0].id")) + "',motivo:'Se muda'}")
    for x in [u1, u2]:
        await k.goto(B + f'cita.html#/aviso/{x}'); await mira(k, 'aviso ' + x + ' terminado')
    # la zona del cliente: entrar (y lo que puede salir mal) y lo de cada cliente, con todos sus papeles
    z = await ctx.new_page(); z.on('pageerror', lambda e: errs.append(str(e)))
    await z.goto(B + 'cliente.html'); await z.wait_for_selector('#fE'); await mira(z, 'zona: entrar')
    await z.click('#fE button[type=submit]'); await mira(z, 'zona: teléfono mal')
    await z.fill('#z_tel', '600000112'); await z.fill('#z_cod', 'abcd'); await z.click('#fE button[type=submit]'); await mira(z, 'zona: código mal')
    await z.fill('#z_tel', '600000999'); await z.fill('#z_cod', '2468-1357'); await z.click('#fE button[type=submit]'); await mira(z, 'zona: sin avisos')
    tels = await app.evaluate("[...new Set(Oficio.estado().avisos.map(a=>OficioNucleo.tel9(a.cli.tel)).filter(Boolean))]")
    for t in tels:
        await z.goto(B + f'cliente.html#/entra/{t}/2468-1357'); await z.wait_for_timeout(200); await mira(z, 'zona ' + t)
        hs = await z.evaluate("[...document.querySelectorAll('#v a[href^=\"#/\"]')].map(a=>a.getAttribute('href'))")
        for h in dict.fromkeys(hs):
            await z.goto(B + 'cliente.html' + h); await mira(z, 'zona ' + t + ' ' + h)
            for h2 in dict.fromkeys(await z.evaluate("[...document.querySelectorAll('#v a[href^=\"#/aviso\"]')].map(a=>a.getAttribute('href'))")):
                if h2 not in hs: await z.goto(B + 'cliente.html' + h2); await mira(z, 'zona ' + t + ' ' + h2)
        await z.goto(B + 'cliente.html#/'); await z.click('#salir'); await mira(z, 'zona: salir')
    datos = await app.evaluate("""(()=>{const S=Oficio.estado(),N=Oficio.N,K=Oficio.K,d=new Set(),p=x=>{if(typeof x==='string'&&x.trim())d.add(x.trim())};
     S.avisos.forEach(a=>{const c=a.cli||{};[c.nombre,c.apellidos,K.nomCli(c),c.dir,c.cp,a.nota,a.obs].forEach(p);(a.pres&&a.pres.lineas||[]).concat(a.amp?a.amp.flatMap(m=>m.lineas):[]).forEach(l=>{if(l.k==='otro')p(l.t)})});
     (S.contratos||[]).forEach(C=>{const c=C.cli;[c.nombre,c.apellidos,K.nomCli(c),c.dir].forEach(p)});
     N.tecnicos.forEach(t=>{p(t.n);p(t.ap);p(t.n+' '+t.ap)});[N.nombre,N.razon,N.ciudad,N.tel,N.nif,'NIF',N.mapa&&N.mapa.firma].forEach(p);N.marca.forEach(p);
     Object.values(N.zonas.dis).forEach(x=>{p(x[0]);p(x[2])});['Castellano','Català','English','OOOX Oficios','WhatsApp'].forEach(p);return[...d]})()""")
    iguales = await k.evaluate("(()=>{const D=OficioIdioma.D,t=Oficio.N.textos||[];return Object.keys(D.ca).filter(x=>D.ca[x]===D.en[x]).map(x=>D.ca[x]).concat(t.filter(f=>f[1]===f[2]).map(f=>f[1]))})()")
    await ctx.close()
    return P, datos, iguales, errs

def quita_datos(s, datos):
    for d in sorted(datos, key=len, reverse=True):
        if len(d) >= 2: s = s.replace(d, ' ')
    # números de aviso y de contrato, horas, fechas, duraciones («1 h 30 min»), importes, porcentajes y el código de la demo
    s = re.sub(r'\b(?:P-)?[A-Z]{1,3}-\d+\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}-\d{1,2}-\d{4}\b|\b\d+\s?(?:h|min)\b|[\d.,]+\s?€|€\s?[\d.,]+|\d+\s?%|\b\d[\d\s]*\b', ' ', s)
    return s

async def main():
    ok = 0; mal = []
    def es(c, t):
        nonlocal ok
        if c: ok += 1
        else: mal.append(t); print('  MAL', t)
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        R = {}
        for lang in ['ca', 'en']: R[lang] = await recorre(br, lang)
        (Pca, datos, iguales, eca), (Pen, _, _, een) = R['ca'], R['en']
        es(set(Pca) == set(Pen) and len(Pca) >= 70, f'las mismas pantallas en los dos idiomas ({len(Pca)} y {len(Pen)})')
        es(not eca and not een, f'sin errores en las páginas {(eca + een)[:2]}')
        # 1) nada sin traducir, cada página con su idioma y nada fuera de la pantalla
        for lang, P in (('ca', Pca), ('en', Pen)):
            falta = sorted({f for x in P.values() for f in x['falta']})
            es(not falta, f'{lang}: no falta ninguna traducción {falta[:4]}')
            es(all(x['lang'] == lang for x in P.values()), f'{lang}: todas las páginas dicen lang="{lang}" ' + str([k for k, x in P.items() if x['lang'] != lang][:3]))
            anchas = [k for k, x in P.items() if x['ancho'] > 1]
            es(not anchas, f'{lang}: nada se sale de un móvil de 375 px {anchas[:3]}')
        # 2) lo que sale igual en los dos idiomas: o es un dato o se escribe igual (Total, Bizum…). Lo demás es castellano que se ha quedado
        pat = [re.compile('^' + re.sub(r'\\\{\w+\\\}', '.+?', re.escape(i)) + '$') for i in iguales]
        restos = []
        for k in Pca:
            if k not in Pen: continue
            for s in set(Pca[k]['t']) & set(Pen[k]['t']):
                if any(x.match(s) for x in pat): continue
                if re.search(r'[A-Za-zÀ-ÿ]{3,}', quita_datos(s, datos)): restos.append((k, s))
        for k, s in restos[:12]: print('     castellano en', k, '→', s[:110])
        es(not restos, f'nada en castellano en catalán ni en inglés ({len(restos)} textos)')
        # 3) lo de cada idioma, mirado a mano: fechas, franjas, el negocio (sus averías), los papeles y el desistimiento
        txt = lambda P, k: ' | '.join(P[k]['t'])
        es('Demana cita sense pressa.' in txt(Pca, 'cita') and 'Book a visit, no rush.' in txt(Pen, 'cita'), 'la cita, en catalán y en inglés')
        es('Fuita d’aigua' in txt(Pca, 'cita') and 'Water leak' in txt(Pen, 'cita') and 'Embús' in txt(Pca, 'cita'), 'las averías del negocio, con sus textos (oficio-datos.js)')
        cp = txt(Pca, 'cita confirmada'); ce = txt(Pen, 'cita confirmada')
        es(re.search(r'(dilluns|dimarts|dimecres|dijous|divendres) \d{1,2} (de |d’)\w+, de \d{1,2} a \d{1,2}', cp) is not None, 'en catalán, la fecha y la franja: «dimecres 18 de novembre, de 8 a 11»')
        es(re.search(r'(Monday|Tuesday|Wednesday|Thursday|Friday) \d{1,2} [A-Z][a-z]+, \d{1,2}:\d{2}–\d{1,2}:\d{2}', ce) is not None, 'en inglés: «Wednesday 18 November, 8:00–11:00»')
        cdia = txt(Pca, 'cita con franjas'); edia = txt(Pen, 'cita con franjas')
        es('demà' in cdia and re.search(r'\b(dl|dt|dc|dj|dv)\. \d', cdia) and 'tomorrow' in edia and re.search(r'\b(Mon|Tue|Wed|Thu|Fri) \d', edia), 'los días cortos: «demà», «dj. 19»; «tomorrow», «Thu 19»')
        pre = [k for k in Pca if k.endswith('/presupuesto') and 'Formulari de desistiment' in txt(Pca, k)]
        es(pre and 'Withdrawal form' in txt(Pen, pre[0]) and 'Termo elèctric de 80 litres, instal·lat' in txt(Pca, pre[0]) and 'Racor especial' in txt(Pen, pre[0]), 'el presupuesto con desistimiento: el formulario traducido, el catálogo del negocio traducido y lo escrito a mano tal cual')
        con = [k for k in Pca if '/contrato/' in k]
        es(len(con) >= 2 and all('Contracte de manteniment' in txt(Pca, c) and 'Maintenance contract' in txt(Pen, c) for c in con), 'el contrato de mantenimiento, en los dos idiomas')
        par = [k for k in Pen if k.endswith('/parte')]
        es(par and all('This job sheet is not an invoice.' in txt(Pen, k) for k in par), 'el parte dice que no es una factura, también en inglés')
        es(any('Part de treball' in Pca[k]['t'][-1] for k in par), 'el título del papel (el nombre al guardarlo en PDF), traducido')
        # 4) el pie para cambiar de idioma, que se queda, y el ?lang= del enlace de la web
        ctx = await br.new_context(viewport={'width': 375, 'height': 812}, timezone_id='Europe/Madrid', locale='es-ES'); await pon_hora(ctx)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B + 'cita.html'); await pg.wait_for_selector('#f')
        es(await pg.evaluate('document.documentElement.lang') == 'es' and 'Pide cita sin prisa.' in await pg.locator('h1').inner_text(), 'sin elegir nada (y un navegador en castellano), en castellano')
        bt = pg.locator('#idiomas [data-lang]')
        es(await bt.count() == 3 and await pg.locator('#idiomas [aria-pressed=true]').get_attribute('data-lang') == 'es' and await pg.locator('#idiomas [role=group]').get_attribute('aria-label') == 'Idioma', 'abajo, los tres idiomas en un grupo con su nombre, con el de ahora marcado')
        alto = await pg.evaluate("Math.min(...[...document.querySelectorAll('#idiomas button')].map(b=>b.getBoundingClientRect().height))")
        es(alto >= 44, f'los botones del idioma se pueden tocar (44 px de alto: {alto})')
        es(await pg.locator('#idiomas [data-lang=ca]').get_attribute('lang') == 'ca' and await pg.locator('#idiomas [data-lang=ca]').inner_text() == 'Català', 'cada idioma escrito en el suyo, con su lang')
        await pg.fill('#c_nomap', 'Laia Puig'); await pg.locator('#idiomas [data-lang=ca]').click(); await pg.wait_for_timeout(150)
        es(await pg.evaluate('document.documentElement.lang') == 'ca' and 'Demana cita sense pressa.' in await pg.locator('h1').inner_text() and await pg.input_value('#c_nomap') == 'Laia Puig', 'al tocar «Català», la cita cambia de idioma sin perder lo escrito')
        es(await pg.evaluate("document.activeElement&&document.activeElement.dataset.lang") == 'ca' and await pg.locator('#idiomas [aria-pressed=true]').get_attribute('data-lang') == 'ca', 'y el foco se queda en el idioma elegido, ya marcado')
        es(await pg.evaluate("localStorage.getItem('ramirez:lang')") == 'ca' and (await pg.locator('#llama').get_attribute('aria-label')).startswith('Urgent? Truca al'), 'se guarda (en la llave de la web) y cambia también lo de arriba')
        await pg.goto(B + 'cliente.html'); await pg.wait_for_selector('#fE')
        es(await pg.evaluate('document.documentElement.lang') == 'ca' and 'La teva zona' in await pg.locator('h1').inner_text() and await pg.locator('#pideArriba').inner_text() == 'Demanar cita', 'la zona del cliente, ya en catalán')
        await pg.locator('#idiomas [data-lang=en]').click(); await pg.reload(); await pg.wait_for_selector('#fE')
        es(await pg.evaluate('document.documentElement.lang') == 'en' and 'Your account' in await pg.locator('h1').inner_text(), 'en inglés, y al volver a cargar se queda')
        await pg.goto(B + 'cita.html?lang=es'); await pg.wait_for_selector('#f')
        es(await pg.evaluate('document.documentElement.lang') == 'es' and await pg.evaluate("localStorage.getItem('ramirez:lang')") == 'es', '?lang=es en el enlace manda, y se guarda')
        await pg.goto(B + 'index.html?lang=ca'); await pg.wait_for_timeout(400)
        h = await pg.evaluate("(()=>{const a=document.querySelector('a[href^=\"cita.html\"]');return a?a.getAttribute('href'):''})()")
        await pg.goto(B + h); await pg.wait_for_selector('#f')
        es('lang=ca' in h and await pg.evaluate('document.documentElement.lang') == 'ca' and await pg.locator('.nota-lang').count() == 0, f'desde la web en catalán, la cita sale en catalán (sin la nota de «este formulario es en castellano») [{h}]')
        await ctx.close()
        ctx = await br.new_context(viewport={'width': 375, 'height': 812}, timezone_id='Europe/Madrid', locale='ca-ES'); await pon_hora(ctx)
        pg = await ctx.new_page(); await pg.goto(B + 'cita.html'); await pg.wait_for_selector('#f')
        es(await pg.evaluate('document.documentElement.lang') == 'ca', 'un navegador en catalán, sin haber elegido nada: en catalán (como la web)')
        await ctx.close()
        # 5) el idioma del cliente, en la oficina (17-11-2026): quien pide cita en catalán queda en catalán, y sus mensajes, sus
        #    papeles y lo que firma salen en su idioma; la app de la oficina sigue en castellano
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Madrid', locale='es-ES'); await pon_hora(ctx)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B + 'cita.html?lang=ca'); await pg.wait_for_selector('#f'); N = await pg.evaluate('OFICIO_NEGOCIO'); CP = list(N['zonas']['cp'].keys())[0]
        await pg.locator('input[name=av]').first.check(force=True); await pg.locator('[data-dia]').nth(1).click(); await pg.locator('[data-fr]:not([disabled])').first.click()
        await pg.fill('#c_nomap', 'Laia Puig Soler'); await pg.fill('#c_tel', '611 22 33 99'); await pg.fill('#c_dir', 'C/ de la Prova 12, 3r'); await pg.fill('#c_cp', CP)
        await pg.click('#f button[type=submit]'); await pg.wait_for_selector('#rConfirma'); await pg.click('#rConfirma'); await pg.wait_for_function("location.hash.startsWith('#/aviso/')")
        ID = (await pg.evaluate('location.hash')).split('/')[2]
        await pg.goto(B + 'app.html#/aviso/' + ID); await pg.wait_for_selector('[data-a=idioma]')
        es(await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{ID}').idioma") == 'ca' and await pg.locator('[data-a=idioma][aria-checked=true]').get_attribute('data-l') == 'ca',
           f'la cita pedida en catalán: el aviso ({ID}) lo apunta y la oficina lo ve marcado')
        es(await pg.evaluate('document.documentElement.lang') == 'es' and await pg.evaluate("localStorage.getItem('ramirez:lang')") == 'ca' and 'Idioma del cliente' in await pg.inner_text('main'),
           'la app de la oficina sigue en castellano (aunque el navegador tenga el catalán elegido para la web)')
        WA = "(()=>{const b=document.querySelector('dialog[open] .wa-b');return b?b.firstChild.textContent:''})()"
        await pg.click(f'#msgPend [data-a=msg][data-id="{ID}"]'); await pg.wait_for_selector('dialog[open] .wa-b'); m = await pg.evaluate(WA)
        es(m.startswith('Hola, Laia. Hem rebut el teu avís ' + ID) and f'cita.html?lang=ca#/aviso/{ID}' in m and 'Segueix el teu avís aquí: ' in m, f'el mensaje, en catalán, con el enlace en catalán ({m[:90]}…)')
        await pg.keyboard.press('Escape'); await pg.locator('[data-a=idioma][data-l=en]').click(); await pg.wait_for_timeout(150)
        es(await pg.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{ID}').idioma") == 'en' and await pg.locator('[data-a=idioma][aria-checked=true]').get_attribute('data-l') == 'en', 'la oficina lo cambia a inglés con un toque')
        await pg.click(f'#msgPend [data-a=msg][data-id="{ID}"]'); await pg.wait_for_selector('dialog[open] .wa-b'); m = await pg.evaluate(WA)
        es(m.startswith('Hi, Laia. We’ve received your request ' + ID) and f'cita.html?lang=en#/aviso/{ID}' in m, f'y el mensaje sale en inglés ({m[:70]}…)')
        await pg.keyboard.press('Escape'); await pg.click(f'[data-a=zona][data-id="{ID}"]'); await pg.wait_for_selector('dialog[open] .wa-b'); m = await pg.evaluate(WA)
        es(m.startswith('Hi, Laia. In your ') and 'cliente.html?lang=en#/entra/' in m, f'el mensaje de su zona, también ({m[:70]}…)')
        await pg.keyboard.press('Escape')
        # el mismo cliente llama otra vez: el aviso nuevo de la oficina hereda su idioma. Y lo que lee y firma en el móvil del técnico
        X = await pg.evaluate("""(async()=>{const C={rol:'centralita',id:'oficina'},av=Oficio.N.averias[0].id,cp=Object.keys(Oficio.N.zonas.cp)[0];
          const r=await Oficio.crear({tipo:'pedir',av,origen:'llamada',cli:{nombre:'Laia',apellidos:'Puig Soler',tel:'611223399',dir:'C/ de la Prova 12, 3r',cp}},C);if(!r.ok)return{err:r.err};
          const A=Oficio.estado().avisos.find(a=>a.id===r.id),tec=Oficio.N.tecnicos.map(t=>t.id).find(id=>!Oficio.K.puedeIr(Oficio.estado(),Oficio.cfg,A,id,Date.now()));
          const a1=Oficio.hacer({tipo:'asignar',id:r.id,tec},C),a2=a1.ok?Oficio.hacer({tipo:'voy',id:r.id},{rol:'tecnico',id:tec}):a1;
          return{id:r.id,tec,idioma:Oficio.estado().avisos.find(a=>a.id===r.id).idioma,ok:a1.ok&&a2.ok,err:a2.err||''}})()""")
        es(X.get('ok') and X.get('idioma') == 'en', f'el mismo cliente llama otra vez: el aviso que hace la oficina hereda su idioma ({X})')
        await pg.goto(B + f"app.html?papel=tecnico&tec={X['tec']}#/aviso/{X['id']}"); await pg.wait_for_selector('[data-a=empezar]'); await pg.click('[data-a=empezar]'); await pg.wait_for_selector('#pF')
        h = await pg.inner_text('dialog[open]')
        es(('You have 14 days to change your mind' in h or 'Emergency repair you asked for: no right of withdrawal.' in h or 'The emergency repair you asked for has no right of withdrawal.' in h)
           and 'Customer’s signature' in h and 'Fixed price. If anything else is needed' in h and 'Presupuesto' in h and 'Tarifa' in h, 'lo que lee y firma el cliente, en su idioma; lo del técnico, en castellano')
        await pg.keyboard.press('Escape')
        H = await pg.evaluate("(()=>{const a=Oficio.estado().avisos.find(a=>a.e==='hecho'&&a.tot&&!a.sinTrabajo);return a?a.id:''})()")
        await pg.evaluate(f"Oficio.hacer({{tipo:'idioma',id:'{H}',idioma:'en'}},{C})"); await pg.goto(B + f'app.html#/papel/{H}/parte'); await pg.wait_for_selector('article.papel')
        es(H and 'This job sheet is not an invoice.' in await pg.inner_text('article.papel') and 'Papeles del aviso' in await pg.inner_text('main') and await pg.evaluate('document.documentElement.lang') == 'es',
           f'sus papeles, en su idioma ({H}); la pantalla, en castellano')
        ti = await pg.title()
        es(ti.startswith('Job sheet ' + H + ' '), f'y el nombre del papel (el del PDF que se le manda), también: «{ti}»')
        # el contrato de mantenimiento: al ofrecerlo en su aviso, la firma en su idioma (lo demás es de la oficina, en castellano)
        await pg.goto(B + f"app.html#/aviso/{X['id']}"); await pg.wait_for_selector('[data-a=conAlta]')
        await pg.click('[data-a=conAlta]'); await pg.wait_for_selector('#ca_fz')
        es(await pg.locator('#ca_fz .lb').inner_text() == 'Customer’s signature' and await pg.locator('#ca_fz .lb').get_attribute('lang') == 'en'
           and 'Contrato de mantenimiento' in await pg.inner_text('dialog[open]'), 'al ofrecerle el contrato: la firma, en su idioma; lo demás, en castellano')
        await pg.keyboard.press('Escape')
        # y sus contratos, en el idioma de su último aviso; el de quien no tiene ninguno en otro idioma, en castellano
        CA = await pg.evaluate("""(()=>{const C={rol:'centralita',id:'oficina'},cp=Object.keys(Oficio.N.zonas.cp)[0],plan=Object.keys(Oficio.cfg.planes)[0];
          const r=[['Laia','Puig Soler','611223399','C/ de la Prova 12, 3r'],['Pere','Mas Roca','611223388','C/ de la Prova 14, 1r']].map(([nombre,apellidos,tel,dir])=>
            Oficio.hacer({tipo:'contrato',plan,cli:{nombre,apellidos,tel,dir,cp},acepta:'mensaje'},C));
          const L=Oficio.estado().contratos||[],de=t=>(L.filter(c=>c.cli.tel===t).slice(-1)[0]||{}).id||'';
          return{ok:r.every(x=>x.ok),err:r.map(x=>x.err||'').join(' '),ids:[de('611223399'),de('611223388')]}})()""")
        tx, ti = [], []
        for c in CA.get('ids', []):
            await pg.goto(B + f'app.html#/papel/{c}/contrato'); await pg.wait_for_selector('article.papel'); tx.append(await pg.inner_text('article.papel')); ti.append(await pg.title())
        es(CA.get('ok') and len(tx) == 2 and 'Maintenance contract' in tx[0] and 'Contrato de mantenimiento' not in tx[0] and 'Contrato de mantenimiento' in tx[1]
           and ti[0].startswith('Maintenance contract ' + CA['ids'][0]) and ti[1].startswith('Contrato de mantenimiento ' + CA['ids'][1])
           and await pg.evaluate('document.documentElement.lang') == 'es', f'sus contratos, en el idioma de su último aviso (también el nombre del PDF); los de otro cliente, en castellano ({CA}, {ti})')
        await ctx.close()
        es(not errs, f'sin errores {errs[:2]}')
        await br.close()
    print(('BIEN' if not mal else 'MAL') + f': {ok} comprobaciones de los idiomas de la cita, la zona del cliente y los papeles' + (f', {len(mal)} fallos' if mal else ''))
    sys.exit(1 if mal else 0)

asyncio.run(main())
