# Lo del repaso del 16-11-2026, en pantalla (la demo, sin servidor): «Es garantía» en la oficina y lo que ve el técnico,
# el presupuesto y el cierre a cero en garantía, rebajar el precio (el técnico trabajando y la oficina ya cobrado),
# corregir la forma de pago, el enlace del aviso en los mensajes, los consejos de «mientras tanto» de cada negocio y el
# plazo de la garantía en los papeles.
# Uso: python3 repaso.py [puerto]   (por defecto 8765) · NAVEGADOR=chromium|firefox|webkit
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json
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
    else: fallos.append(txt); print('  MAL ', txt, flush=True)
def oye(pg, nombre):
    pg.on('console', lambda m: webkit_linux.consola(m, nombre, errores))
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    pg.on('response', lambda r: errores.append(f'{nombre}: {r.status} {r.url}') if r.status >= 400 else None)
    return pg
async def hasta(pg, js, ms=7000):
    try: await pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
async def toast(pg, trozo): return await hasta(pg, f"(()=>{{const e=document.querySelector('#toast');return e&&e.classList.contains('on')&&e.textContent.includes({json.dumps(trozo)})}})()")
async def texto(pg, sel): return (await pg.locator(sel).first.inner_text()) if await pg.locator(sel).count() else ''
async def firma(pg, sel):
    await pg.locator(sel).scroll_into_view_if_needed()
    bb = await pg.locator(sel).bounding_box(); x, y, w, h = bb['x'], bb['y'], bb['width'], bb['height']
    await pg.mouse.move(x + 20, y + h * .6); await pg.mouse.down()
    for i in range(1, 16): await pg.mouse.move(x + 20 + i * (w - 40) / 16, y + h * (.65 if i % 2 else .3), steps=2)
    await pg.mouse.up(); await pg.wait_for_timeout(150)
AV = "(id=>{const a=Oficio.estado().avisos.find(x=>x.id===id);return a?JSON.parse(JSON.stringify(a)):null})"
# un aviso de fuga para un teléfono; si «tec», asignado a quien pueda ir; si «hasta», llevado por ese técnico hasta ahí
# («curso»: empezado con lo de partida; «hecho»: además terminado con «modo»)
PIDE = """((tel,dir,tec,hasta,modo)=>{const K=OficioNucleo,N=OFICIO_NEGOCIO,cfg=K.cfgDe(N),C={rol:'centralita',id:'oficina'},t=Date.now(),F='M10 10L60 40L110 12L160 44';
 const r=Oficio.hacer({tipo:'pedir',av:'fuga',origen:'llamada',cli:{nombre:'Prueba',apellidos:'Repaso',tel,dir,cp:Object.keys(N.zonas.cp)[0]}},C);if(!r.ok||!tec)return r.ok?{id:r.id}:r;
 let S=Oficio.estado();const A=S.avisos.find(a=>a.id===r.id);
 const x=Object.keys(cfg.tec).find(x=>!K.puedeIr(S,cfg,A,x,t)&&!S.avisos.some(y=>y.tec===x&&(y.e==='camino'||y.e==='curso')));if(!x)return{err:'sin técnico'};
 const T={rol:'tecnico',id:x},pasos=[[{tipo:'asignar',id:r.id,tec:x},C]];
 if(hasta){pasos.push([{tipo:'voy',id:r.id},T],[{tipo:'empezar',id:r.id,pres:{lineas:cfg.av.fuga.ini.concat(hasta==='hecho'?[]:[{k:'sifon'}]),firma:F,pide:true}},T]);if(hasta==='hecho')pasos.push([{tipo:'terminar',id:r.id,modo,firma:F},T])}
 for(const [a,q] of pasos){const y=Oficio.hacer(a,q);if(!y.ok)return Object.assign({paso:a.tipo},y)}
 return{id:r.id,tec:x}})"""

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        ctx = await br.new_context(viewport={'width': 1280, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid'); await pon_hora(ctx)
        c = oye(await ctx.new_page(), 'oficina'); await c.goto(B + 'app.html#/bandeja'); await c.wait_for_selector('#nav a')

        # ---------- 1. «Es garantía»: la oficina lo decide al ver el aviso; el técnico lo ve y no lo cobra ----------
        G = await c.evaluate(PIDE + "('611000201','C/ de la Garantía 1, 1.º',true,'hecho','tarjeta')"); es('id' in G, f'un trabajo terminado y cobrado ({G})')
        g = await c.evaluate(PIDE + "('611000201','C/ de la Garantía 1, 1.º',false)"); gid = g.get('id')
        await c.goto(B + f'app.html#/aviso/{gid}'); await c.wait_for_selector('#garB')
        es('Revisar si puede ser garantía' in await texto(c, '#garB') and G.get('id', '?') in await texto(c, '#garB') and await c.locator('#garB [data-a=esGar]').count() == 1, 'el mismo cliente vuelve a llamar: la oficina ve el trabajo de antes y el botón «Es garantía»')
        await c.click('#garB [data-a=esGar]')
        es(await toast(c, 'Apuntado: va en garantía') and await hasta(c, "/En garantía del trabajo/.test(document.querySelector('#garB').textContent)") and await c.locator('#garB [data-a=noGar]').count() == 1, 'al pulsarlo queda en garantía, con «Quitar»')
        await c.click('#garB [data-a=noGar]')
        es(await toast(c, 'Ya no va en garantía') and await hasta(c, "!!document.querySelector('#garB [data-a=esGar]')") and not (await c.evaluate(AV + f"('{gid}')")).get('enGar'), '«Quitar» lo deja como estaba')
        await c.click('#garB [data-a=esGar]'); await toast(c, 'Apuntado')
        tg = await c.evaluate(f"""(()=>{{const K=OficioNucleo,cfg=K.cfgDe(OFICIO_NEGOCIO),S=Oficio.estado(),A=S.avisos.find(a=>a.id==='{gid}'),t=Date.now();
          const x=Object.keys(cfg.tec).find(x=>!K.puedeIr(S,cfg,A,x,t)&&!S.avisos.some(y=>y.tec===x&&(y.e==='camino'||y.e==='curso')));return x&&Oficio.hacer({{tipo:'asignar',id:'{gid}',tec:x}},{{rol:'centralita',id:'oficina'}}).ok?x:null}})()""")
        t = oye(await ctx.new_page(), 'técnico'); await t.goto(B + f'app.html?papel=tecnico&tec={tg}#/aviso/{gid}'); await t.wait_for_selector('#garB')
        es('En garantía del trabajo' in await texto(t, '#garB') and await t.locator('#garB [data-a=noGar]').count() == 0, 'el técnico lo ve en su aviso, y no puede quitarlo')
        await t.click('[data-a=voy]'); await t.wait_for_selector('[data-a=empezar]'); await t.click('[data-a=empezar]'); await t.wait_for_selector('#pF'); await t.wait_for_timeout(250)
        pl = await texto(t, '#pL')
        es('va en la garantía' in pl, f'en el presupuesto, lo de entonces dice que va en la garantía ({pl[:120]})')
        await firma(t, '#pF')
        if await t.locator('#pPide').count(): await t.click('#pPide')
        await t.click('#pOk'); await t.wait_for_timeout(350)
        A = await c.evaluate(AV + f"('{gid}')")
        es(A and A['e'] == 'curso' and A['tot']['total'] == 0 and all(l.get('gar') for l in A['tot']['lineas']), 'empieza con total cero: todo lo de partida va en la garantía')
        await t.click('[data-a=terminar]'); await t.wait_for_selector('#tOk')
        ct = await texto(t, 'dialog[open]')
        es('Va en la garantía: no hay nada que cobrar' in ct and 'Incluido' in ct and '¿Cómo paga?' not in ct, 'al cerrar: «Va en la garantía», lo de entonces «Incluido» y sin preguntar cómo paga')
        await t.click('#tOk')
        es(await toast(t, 'Terminado. Va en garantía: no se cobra nada.'), 'y se cierra sin cobrar')
        await t.goto(B + f'app.html?papel=tecnico&tec={tg}#/papel/{gid}/parte'); await t.wait_for_selector('.papel'); pp = await texto(t, '.papel')
        es('No hay nada que pagar: va en la garantía.' in pp and 'va en la garantía' in pp, 'el parte dice que va en la garantía')

        # ---------- 2. rebajar el precio: el técnico trabajando, y la oficina con el trabajo ya cobrado ----------
        R = await c.evaluate(PIDE + "('611000202','C/ de la Rebaja 2, 3.º',true,'curso')"); rid, rtec = R.get('id'), R.get('tec'); es(rid and rtec, f'un trabajo en marcha ({R})')
        await t.goto(B + f'app.html?papel=tecnico&tec={rtec}#/aviso/{rid}'); await t.wait_for_selector('[data-a=rebajar]')
        tot0 = (await c.evaluate(AV + f"('{rid}')"))['tot']['total']
        await t.click('[data-a=rebajar]'); await t.wait_for_selector('#rOk')
        es(await t.locator('#rOk').is_disabled() and 'lo verá el cliente' in await texto(t, 'dialog[open]'), 'la hoja de rebajar: sin cambiar nada no deja; avisa de que el motivo lo verá el cliente')
        await t.click('#rL [data-m="-1"]:not([disabled]) >> nth=-1'); await t.wait_for_timeout(150)
        es(await t.locator('#rOk').is_disabled(), 'quitar algo sin motivo tampoco deja')
        await t.fill('#rM', 'Al final no hizo falta el sifón'); await t.wait_for_timeout(150)
        bt = await texto(t, '#rOk')
        es(not await t.locator('#rOk').is_disabled() and bt.startswith('Rebajar a '), f'con algo quitado y el motivo, el botón dice el precio nuevo ({bt})')
        await t.click('#rOk')
        A = await c.evaluate(AV + f"('{rid}')")
        es(await toast(t, 'Precio rebajado') and A['tot']['total'] < tot0 and len(A.get('rebajas', [])) == 1 and A['rebajas'][0]['motivo'] == 'Al final no hizo falta el sifón', 'el técnico lo rebaja: queda el precio nuevo y el motivo')
        es(await hasta(t, "/Rebajado el .+: Al final no hizo falta el sifón/.test((document.querySelector('#rebs')||{}).textContent||'')"), 'y en el aviso se ve la rebaja')
        await t.click('[data-a=terminar]'); await t.wait_for_selector('#tOk'); await t.click('#tM [data-modo=tarjeta]'); await t.click('#tOk'); await toast(t, 'Terminado')
        await c.goto(B + f'app.html#/aviso/{rid}'); await c.wait_for_selector('[data-a=corrPago]')
        es(await c.locator('[data-a=rebajar]').count() == 1, 'terminado y cobrado, la oficina puede rebajar y corregir la forma de pago')
        await c.click('[data-a=rebajar]'); await c.wait_for_selector('#rOk')
        await c.click('#rL [data-m="-1"]:not([disabled]) >> nth=-1'); await c.fill('#rM', 'Descuento por la espera'); await c.wait_for_timeout(150); await c.click('#rOk')
        es(await toast(c, 'Precio rebajado') and await hasta(c, "/Hay que devolverle/.test((document.querySelector('#rebs')||{}).textContent||'')"), 'ya cobrado: dice cuánto hay que devolverle')

        # ---------- 3. corregir la forma de pago ----------
        await c.click('[data-a=corrPago]'); await c.wait_for_selector('#oOk')
        ht = await texto(c, 'dialog[open]')
        es(await c.locator('#oOk').is_disabled() and 'Ahora consta: tarjeta' in ht and await c.locator('#oM [data-modo=tarjeta]').count() == 0, 'la hoja dice cómo consta y no ofrece la misma forma')
        await c.click('#oM [data-modo=bizum]'); await c.click('#oOk')
        A = await c.evaluate(AV + f"('{rid}')")
        es(await toast(c, 'Corregido: bizum') and A['pago']['modo'] == 'bizum' and A['pago']['cobrado'], 'corregido a Bizum, sigue cobrado')

        # ---------- 4. el enlace del aviso en los mensajes ----------
        await c.goto(B + f'app.html#/aviso/{gid}'); await c.wait_for_selector('#v')
        mt = await c.evaluate(f"""(()=>{{const A=Oficio.estado().avisos.find(a=>a.id==='{gid}');return A.msgs.map(m=>m.k)}})()""")
        if 'hecho' in mt:
            await c.click(f'[data-a=msg][data-id="{gid}"]'); await c.wait_for_selector('dialog[open] #mOk')
            wt = await texto(c, 'dialog[open]')
            es(f'cita.html#/aviso/{gid}' in wt and 'Tu aviso, con el total y la garantía' in wt, f'el mensaje de trabajo terminado lleva el enlace de su aviso ({wt[-160:]})')
        else: es(False, f'el aviso en garantía tiene su mensaje de terminado por mandar ({mt})')

        # ---------- 5. la cita: los consejos de «mientras tanto» son del negocio ----------
        await c.goto(B + 'cita.html?servicio=termo'); await c.wait_for_selector('main')
        mien = await c.evaluate("(()=>{const N=OFICIO_NEGOCIO;return N.averias.filter(a=>a.mientras).map(a=>a.id)})()")
        es('fuga' in mien and 'termo' in mien and 'lampara' not in mien, f'los consejos de mientras llega el técnico están en los datos de cada avería ({mien})')

        # ---------- 6. el plazo de la garantía en los papeles: el del negocio ----------
        await c.goto(B + 'app.html#/bandeja'); await c.wait_for_selector('#nav a')
        dos = await c.evaluate(f"""(()=>{{const A=JSON.parse(JSON.stringify(Oficio.estado().avisos.find(a=>a.id==='{G.get('id')}'))),K=OficioNucleo,N=OFICIO_NEGOCIO,cfg=K.cfgDe(N);
          A.gar.hasta=K.masMeses(K.madrid(A.fin).date,6);const h=OficioPapeles.doc(A,'garantia',{{K,N,cfg,firmaSvg:()=>''}}),d=document.createElement('div');d.innerHTML=h;return d.textContent}})()""")
        es('6 meses' in dos and '1 año' not in dos, 'con seis meses de garantía, el papel dice «6 meses»')

        es(not errores, 'sin errores en la consola: ' + '; '.join(errores[:5]))
        await br.close()
    print(('BIEN' if not fallos else 'MAL') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + ' · lo del repaso del 16-11 · motor ' + NAV)
    sys.exit(1 if fallos else 0)

asyncio.run(main())
