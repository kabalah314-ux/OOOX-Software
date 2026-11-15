# Lo del 15-11-2026, en pantalla: el desistimiento al firmar el presupuesto, «Facturada», el mes para la gestoría, lo que
# deja cada trabajo, la zona de un administrador de fincas, quién va en la página del aviso, el material que falta y los contratos de mantenimiento.
# Uso: python3 novedades.py [puerto]   (por defecto 8765) · NAVEGADOR=chromium|firefox|webkit
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json
from urllib.parse import unquote
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
PF = """(()=>{const s=[...document.querySelectorAll('section.sec')].find(x=>/^Por facturar/.test(x.querySelector('h2').textContent.trim()));return s?[...s.querySelectorAll('a[href^="#/aviso/"]')].map(a=>a.getAttribute('href').split('/')[2]):[]})()"""
AV = "(id=>{const a=Oficio.estado().avisos.find(x=>x.id===id);return a?JSON.parse(JSON.stringify(a)):null})"
# un aviso nuevo, con cita o urgente, asignado a quien pueda ir; devuelve su número y su técnico
CREA = """((av,cita,tel,dir)=>{const K=OficioNucleo,N=OFICIO_NEGOCIO,cfg=K.cfgDe(N),C={rol:'centralita',id:'oficina'},t=Date.now();let S=Oficio.estado(),c=null;
 if(cita){for(const d of K.diasDe(S,cfg,t,8,true)){const f=d.franjas.find(f=>f.okOf);if(f){c={dia:d.dia,fr:f.id};break}}if(!c)return{err:'sin hueco'}}
 const r=Oficio.hacer({tipo:'pedir',av,origen:'llamada',cli:{nombre:'Prueba',apellidos:'Novedades',tel,dir,cp:Object.keys(N.zonas.cp)[0]},cita:c},C);if(!r.ok)return r;
 S=Oficio.estado();const A=S.avisos.find(a=>a.id===r.id);
 const tec=Object.keys(cfg.tec).find(x=>!K.puedeIr(S,cfg,A,x,t)&&!S.avisos.some(y=>y.tec===x&&(y.e==='camino'||y.e==='curso')));if(!tec)return{err:'sin técnico'};
 const s=Oficio.hacer({tipo:'asignar',id:r.id,tec},C);return s.ok?{id:r.id,tec}:s})"""

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        # todo en un mismo navegador de ordenador: en la demo, sin servidor, la oficina y el técnico comparten lo guardado
        perm = ['clipboard-read', 'clipboard-write'] if NAV == 'chromium' else []
        ctx = await br.new_context(viewport={'width': 1280, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', permissions=perm, accept_downloads=True); await pon_hora(ctx)
        c = oye(await ctx.new_page(), 'oficina'); await c.goto(B + 'app.html#/bandeja'); await c.wait_for_selector('#nav a')

        # ---------- 1. con cita: el cliente ve los 14 días y tiene que marcar que quiere que se haga ya ----------
        r = await c.evaluate(CREA + "('grifo',true,'611000002','C/ Verdi 7')"); es('id' in r, f'se crea un aviso con cita ({r})')
        cid, ctec = r.get('id'), r.get('tec')
        t = oye(await ctx.new_page(), 'técnico'); await t.goto(B + f'app.html?papel=tecnico&tec={ctec}#/aviso/{cid}'); await t.wait_for_selector('[data-a=voy]')
        await t.click('[data-a=voy]'); await t.wait_for_selector('[data-a=empezar]')
        await t.click('[data-a=empezar]'); await t.wait_for_selector('#pF'); await t.wait_for_timeout(250)
        es(await t.locator('#pPide').count() == 1 and '14 días' in await texto(t, '#pDes'), 'con cita: el cliente ve sus 14 días y la casilla')
        await firma(t, '#pF')
        es(await t.locator('#pOk').is_disabled(), 'con cita: con la firma pero sin la casilla, no deja empezar')
        await t.click('#pPide'); es(not await t.locator('#pOk').is_disabled(), 'con la casilla marcada, ya deja empezar')
        await t.click('#pOk'); await t.wait_for_timeout(350)
        A = await c.evaluate(AV + f"('{cid}')")
        es(A and A['e'] == 'curso' and A['pres']['des']['c'] == 'cita' and A['pres']['des']['pide'] > 0, 'con cita: empieza y queda la petición del cliente con su hora')
        await t.goto(B + f'app.html?papel=tecnico&tec={ctec}#/papel/{cid}/presupuesto'); await t.wait_for_selector('.papel')
        pt = await texto(t, '.papel')
        es('Formulario de desistimiento' in pt and 'Pediste que lo hiciéramos ya' in pt and '14 días naturales' in pt, 'el presupuesto firmado lleva el desistimiento, la petición y el formulario')

        # ---------- 2. urgencia: nada que marcar, salvo si se añade un aparato nuevo ----------
        r = await c.evaluate(CREA + "('termo',false,'611000001','C/ Verdi 5')"); es('id' in r, f'se crea una urgencia ({r})')
        uid, utec = r.get('id'), r.get('tec')
        t2 = oye(await ctx.new_page(), 'técnico 2'); await t2.goto(B + f'app.html?papel=tecnico&tec={utec}#/aviso/{uid}'); await t2.wait_for_selector('[data-a=voy]')
        await t2.click('[data-a=voy]'); await t2.wait_for_selector('[data-a=empezar]')
        await t2.click('[data-a=empezar]'); await t2.wait_for_selector('#pF'); await t2.wait_for_timeout(250)
        es(await t2.locator('#pPide').count() == 0 and 'no tiene derecho de desistimiento' in await texto(t2, '#pT'), 'urgencia: sin casilla, y se le dice que la reparación no tiene desistimiento')
        await t2.click('[data-add="termo80"]'); await t2.wait_for_timeout(200)
        es(await t2.locator('#pPide').count() == 1 and 'añadido' in await texto(t2, '#pL'), 'al añadir un termo nuevo sale la casilla, y la línea dice que es un añadido')
        await firma(t2, '#pF'); es(await t2.locator('#pOk').is_disabled(), 'urgencia con añadido: sin la casilla no deja empezar')
        await t2.click('#pPide'); await t2.click('#pOk'); await t2.wait_for_timeout(350)
        A = await c.evaluate(AV + f"('{uid}')"); es(A and A['e'] == 'curso' and A['pres']['des']['c'] == 'urgente+', 'urgencia con añadido: empieza con la petición')
        for i, tc in ((cid, ctec), (uid, utec)):
            await c.evaluate(f"Oficio.hacer({{tipo:'terminar',id:'{i}',modo:'tarjeta'}},{{rol:'tecnico',id:'{tc}'}})")

        # ---------- 3. «Por facturar», «Facturada» y copiar los datos ----------
        await c.goto(B + 'app.html#/cobros'); await c.wait_for_selector('.cifras')
        tc = await c.locator('main').inner_text(); pf = await c.evaluate(PF)
        es(cid in pf and uid in pf, 'cobros: lo terminado sale en «Por facturar»')
        es('Lo que deja cada trabajo' in tc and '/ h' in await texto(c, '#deja') and 'El mes para la gestoría' in tc, 'cobros: lo que deja cada trabajo y el mes para la gestoría')
        await c.goto(B + f'app.html#/aviso/{uid}'); await c.wait_for_selector('[data-a=facturar]')
        await c.click('[data-a=copiaFac]')
        es(await toast(c, 'Copiado') or await toast(c, 'No se ha podido copiar'), 'copiar los datos de la factura dice qué ha pasado')
        if NAV == 'chromium':
            cp = await c.evaluate("navigator.clipboard.readText()")
            es('Cliente: Prueba Novedades' in cp and uid in cp and 'Total:' in cp, 'en el portapapeles están el cliente, el aviso y el total')
        await c.click('[data-a=facturar]'); await c.wait_for_selector('#fNum'); await c.fill('#fNum', 'F-77'); await c.click('#fOk')
        es(await toast(c, 'Apuntado como facturado') and 'n.º F-77' in await texto(c, '#fac'), 'facturada: queda apuntado con su número')
        es((await c.evaluate(AV + f"('{uid}')"))['fac']['num'] == 'F-77', 'y se guarda en el aviso')
        await c.click('[data-a=desfacturar]'); es(await toast(c, 'Ya no consta') and 'fac' not in (await c.evaluate(AV + f"('{uid}')")), '«Quitar» lo deshace')
        await c.wait_for_selector('[data-a=facturar]'); await c.click('[data-a=facturar]'); await c.wait_for_selector('#fNum'); await c.fill('#fNum', 'F-77'); await c.click('#fOk'); await toast(c, 'Apuntado')
        await c.goto(B + 'app.html#/cobros'); await c.wait_for_selector('.cifras')
        tc = await c.locator('main').inner_text(); pf = await c.evaluate(PF)
        es(uid not in pf and cid in pf, 'cobros: lo facturado deja de salir; lo otro sigue')

        # ---------- 4. el mes para la gestoría: se descarga una hoja de cálculo ----------
        async with c.expect_download() as dl: await c.click('[data-a=mes]')
        d = await dl.value; cuerpo = open(await d.path(), 'rb').read().decode('utf-8')
        es(d.suggested_filename.startswith('ramirez-trabajos-') and d.suggested_filename.endswith('.csv'), f'el archivo se llama como el negocio y el mes ({d.suggested_filename})')
        es(cuerpo.startswith('﻿Fecha;Aviso;Cliente') and uid in cuerpo and cid in cuerpo and ';F-77' in cuerpo, 'el archivo lleva los trabajos del mes y su factura')

        # ---------- 5. la zona del cliente: su factura, y un administrador con sus fincas ----------
        z = oye(await ctx.new_page(), 'cliente'); await z.goto(B + 'cliente.html#/entra/611000001/2468-1357'); await z.wait_for_selector('#salir')
        es('Factura F-77' in await z.locator('main').inner_text(), 'zona: el cliente ve su factura con su número')
        await c.evaluate("""(()=>{const N=OFICIO_NEGOCIO,C={rol:'centralita',id:'oficina'},cp=Object.keys(N.zonas.cp)[0];
          for(const dir of ['C/ de la Finca 1','C/ de la Finca 1, bajos','Av. de la Otra Finca 9'])Oficio.hacer({tipo:'pedir',av:'atasco',origen:'llamada',cli:{nombre:'Fincas',apellidos:'Puig',tel:'611000009',dir,cp}},C)})()""")
        z2 = oye(await ctx.new_page(), 'administrador'); await z2.goto(B + 'cliente.html#/entra/611000009/2468-1357'); await z2.wait_for_selector('#salir')
        fincas = await z2.locator('h3.finca').all_inner_texts()
        es(len(fincas) == 2 and 'Av. de la Otra Finca 9' in fincas and any('Finca 1' in x for x in fincas), f'zona del administrador: sus avisos, agrupados por finca ({fincas})')

        # ---------- 6. quién va, en la página del aviso ----------
        r = await c.evaluate(CREA + "('grifo',false,'611000003','C/ Verdi 9')"); qid, qtec = r.get('id'), r.get('tec')
        k = oye(await ctx.new_page(), 'aviso del cliente'); await k.goto(B + f'cita.html#/aviso/{qid}'); await k.wait_for_selector('.quien')
        n = await c.evaluate(f"OFICIO_NEGOCIO.tecnicos.find(x=>x.id==='{qtec}').n"); q = await texto(k, '.quien')
        es(n in q and 'Furgoneta' in q and await k.locator('.quien .ava').count() == 1, f'quién va: su nombre, su furgoneta y sus iniciales ({q!r})')
        await c.evaluate(f"Oficio.hacer({{tipo:'noacepta',id:'{qid}',modo:'efectivo'}},{{rol:'tecnico',id:'{qtec}'}})")
        await k.reload(); await k.wait_for_selector('.doc'); await k.wait_for_timeout(300)
        es(await k.locator('.quien').count() == 0, 'quién va: acabado el aviso, ya no se enseña')

        # ---------- 7. el material que falta: lo apunta el técnico, la oficina lo ve en su día y lo manda por WhatsApp ----------
        r = await c.evaluate(CREA + "('grifo',true,'611000004','C/ Verdi 11')"); mid, mtec = r.get('id'), r.get('tec')
        es('id' in r, f'se crea otra cita, para el material ({r})')
        t3 = oye(await ctx.new_page(), 'técnico, material'); await t3.goto(B + f'app.html?papel=tecnico&tec={mtec}#/aviso/{mid}'); await t3.wait_for_selector('#falta')
        await t3.click('#falta [data-a=falta]'); await t3.wait_for_selector('#faF')
        primero = await t3.locator('[data-fk]').first.get_attribute('data-fk')
        await t3.locator('[data-fk]').first.click(); await t3.click('[data-fq="1"]'); await t3.click('button[form=faF]')
        es(await toast(t3, 'Apuntado') and '2 ×' in await texto(t3, '#falta'), 'el técnico apunta material del catálogo, con cuántos')
        await t3.click('#falta [data-a=falta]'); await t3.wait_for_selector('#faF'); await t3.fill('#fa_t', 'Latiguillo de 40 cm'); await t3.click('button[form=faF]')
        es(await toast(t3, 'Apuntado') and 'Latiguillo de 40 cm' in await texto(t3, '#falta'), 'y lo que no está en el catálogo, escrito a mano')
        A = await c.evaluate(AV + f"('{mid}')"); es(A and len(A.get('falta', [])) == 2 and A['falta'][0]['k'] == primero and A['falta'][0]['q'] == 2, 'queda guardado en el aviso')
        await t3.goto(B + f'app.html?papel=tecnico&tec={mtec}#/hoy'); await t3.wait_for_selector('#mHoy')
        es('Material que te falta' in await t3.locator('main').inner_text() and 'Latiguillo de 40 cm' in await texto(t3, '#mHoy'), 'en «Hoy», el técnico ve lo que le falta, por día')
        dia = A['cita']['dia']
        await c.goto(B + f'app.html#/equipo/{dia}'); await c.wait_for_selector('.tecds')
        caja = c.locator(f'.tecd[data-tec="{mtec}"] .mat')
        href = (await caja.locator('a[href^="https://wa.me/?text="]').get_attribute('href')) if await caja.count() else ''
        es(await caja.count() == 1 and 'Latiguillo de 40 cm' in await caja.inner_text() and mid in await caja.inner_text(), 'en «Equipo», ese día, el material de cada técnico con sus avisos')
        es(bool(href) and 'Material para el' in unquote(href) and f'Latiguillo de 40 cm ({mid})' in unquote(href), 'y el WhatsApp ya escrito, para mandarlo a quien haga falta')
        await c.goto(B + f'app.html#/aviso/{mid}'); await c.wait_for_selector('#falta [data-a=faltaListo]')
        await c.click('#falta [data-a=faltaListo]')
        es(await toast(c, 'ya no falta nada') and 'falta' not in (await c.evaluate(AV + f"('{mid}')")), '«Ya está todo» lo vacía')

        # ---------- 8. los contratos de mantenimiento: el alta, su papel, la zona del cliente, la urgencia sin desplazamiento y la revisión ----------
        cp0 = await c.evaluate("Object.keys(OFICIO_NEGOCIO.zonas.cp)[0]")
        await c.goto(B + 'app.html#/contratos'); await c.wait_for_selector('.cab [data-a=conAlta]')
        es('Contratos' in await texto(c, 'main h1') and 'al año' in await texto(c, 'main'), 'la pantalla de contratos, con lo que vende el negocio')
        await c.click('.cab [data-a=conAlta]'); await c.wait_for_selector('#caF')
        for k, v in (('nombre', 'Clara'), ('apellidos', 'Riu'), ('tel', '611000020'), ('dir', 'C/ Verdi 50, 2.º'), ('cp', cp0)):
            await c.fill('#ca_' + k, v)
        await c.click('button[form=caF]'); await c.wait_for_timeout(200)
        es('Falta la firma' in await texto(c, '#ca_err'), 'sin la firma del cliente no se da de alta')
        await firma(c, '#caFi'); await c.click('#ca_pide'); await c.click('#caM [data-modo=bizum]'); await c.click('button[form=caF]')
        es(await toast(c, 'dado de alta'), 'alta del contrato')
        await c.wait_for_selector('.papel.doc'); pt = await texto(c, '.papel.doc')
        es('Contrato de mantenimiento' in pt and 'Formulario de desistimiento' in pt and 'Pediste que la revisión' in pt and 'Firmado el' in pt and 'Cobrado el' in pt, 'el papel del contrato: el desistimiento, la petición de la revisión, la firma y el cobro')
        con = await c.evaluate("Oficio.estado().contratos.slice(-1)[0].id")
        z3 = oye(await ctx.new_page(), 'cliente con contrato'); await z3.goto(B + 'cliente.html#/entra/611000020/2468-1357'); await z3.wait_for_selector('#cons')
        es('Del ' in await texto(z3, '#cons'), 'en su zona, el cliente ve su contrato')
        await z3.click('#cons a.tj'); await z3.wait_for_selector('.papel.doc')
        es('Formulario de desistimiento' in await texto(z3, '.papel.doc'), 'y su papel, con el formulario')
        r = await c.evaluate(CREA + "('fuga',false,'611000020','C/ Verdi 50, 2.º')"); uc, tc = r.get('id'), r.get('tec')
        A = await c.evaluate(AV + f"('{uc}')"); es(bool(A) and A.get('con', {}).get('id') == con, 'la urgencia de ese cliente lleva su contrato')
        t4 = oye(await ctx.new_page(), 'técnico, contrato'); await t4.goto(B + f'app.html?papel=tecnico&tec={tc}#/aviso/{uc}'); await t4.wait_for_selector('#conB')
        es('no se cobra el desplazamiento' in await texto(t4, '#conB'), 'el técnico ve que en esa urgencia no se cobra el desplazamiento')
        await t4.click('[data-a=voy]'); await t4.wait_for_selector('[data-a=empezar]'); await t4.click('[data-a=empezar]'); await t4.wait_for_selector('#pL'); await t4.wait_for_timeout(250)
        es('incluido en su contrato' in await texto(t4, '#pL'), 'en el presupuesto, el desplazamiento sale incluido')
        await t4.keyboard.press('Escape')
        # el técnico, en casa de un cliente sin contrato: lo ofrece, lo da de alta y queda en su aviso
        r = await c.evaluate(CREA + "('fuga',false,'611000022','C/ Verdi 52, 1.º')"); ut, tt = r.get('id'), r.get('tec')
        t5 = oye(await ctx.new_page(), 'técnico da de alta'); await t5.goto(B + f'app.html?papel=tecnico&tec={tt}#/aviso/{ut}'); await t5.wait_for_selector('[data-a=voy]')
        es(await t5.locator('#conOf').count() == 0, 'antes de llegar, el técnico no ofrece el contrato')
        q5 = "{rol:'tecnico',id:'" + tt + "'}"
        await t5.evaluate(f"Oficio.hacer({{tipo:'voy',id:'{ut}'}},{q5})")
        await t5.evaluate(f"Oficio.hacer({{tipo:'empezar',id:'{ut}',pres:{{lineas:[{{k:Object.keys(OficioNucleo.cfgDe(OFICIO_NEGOCIO).cat)[0],q:1}}],firma:'M1 1L20 20L40 10L60 30L80 12'}}}},{q5})")
        await t5.reload(); await t5.wait_for_selector('#conOf [data-a=conAlta]')
        await t5.click('#conOf [data-a=conAlta]'); await t5.wait_for_selector('#caF')
        es(await t5.input_value('#ca_tel') == '611 00 00 22' or (await t5.input_value('#ca_tel')).replace(' ', '') == '611000022', 'en casa del cliente, el técnico abre el contrato con los datos del aviso')
        await t5.click('[data-ca=mensaje]'); await t5.click('#caM [data-modo=efectivo]'); await t5.click('button[form=caF]')
        es(await toast(t5, 'dado de alta'), 'el técnico da de alta el contrato')
        await t5.wait_for_selector('.papel.doc'); es('Contrato de mantenimiento' in await texto(t5, '.papel.doc') and 'Volver' in await texto(t5, '.atras'), 'y le enseña el papel al cliente, con «Volver» en vez de «Contratos»')
        A = await t5.evaluate(AV + f"('{ut}')"); es(bool(A) and any('dado de alta' in h.get('txt', '') for h in A.get('h', [])), 'en su aviso queda apuntado')
        await c.goto(B + 'app.html#/contratos'); await c.wait_for_selector('#conAl [data-a=conRev]')
        await c.click('#conAl [data-a=conRev]'); es(await toast(c, 'Aviso de la revisión creado'), 'desde «Contratos» se crea el aviso de la revisión')
        await c.wait_for_selector('#conB'); es('la revisión y el desplazamiento van incluidos' in await texto(c, '#conB'), 'y ese aviso lleva la revisión incluida')
        await c.goto(B + 'app.html#/contratos'); await c.wait_for_selector('.cont')
        es(await c.locator(f'.cont[data-c="{con}"] [data-a=conBaja]').count() == 1, 'cada contrato se puede dar de baja')
        await c.click(f'.cont[data-c="{con}"] [data-a=conFac]')
        es(await toast(c, 'Copiado') or await toast(c, 'No se ha podido copiar'), 'copiar los datos para facturar la cuota dice qué ha pasado')

        es(not errores, 'sin errores en la consola ni archivos que falten: ' + '; '.join(errores[:4]))
        await br.close()
    webkit_linux.resumen_rarezas()
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan.' if fallos else '.'))
    sys.exit(1 if fallos else 0)

asyncio.run(main())
