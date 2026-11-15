# Pruebas de uso real en el navegador (15-11-2026): la demo «en uso», con nueve semanas de trabajo hechas con las reglas.
# Cada pantalla tiene que cuadrar con los datos que hay debajo, y cada persona tiene que poder hacer su trabajo.
# El reloj se fija a un miércoles a mediodía, para que lo que pasa «hoy» sea siempre el mismo día de trabajo.
# Cada comprobación lleva su número de la lista de pruebas (pruebas-uso/LISTA.md).
#
#   python3 uso.py [puerto]     con la carpeta de la copia «en uso» servida en ese puerto (8769 si no se dice)
import asyncio, os, sys, time
import buzon_falso     # el buzón de mejoras no sale a internet en las pruebas: ver buzon_falso.py
from reloj import pon_hora   # la hora de la página es fija: ver reloj.py
from playwright.async_api import async_playwright

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8769
B = f'http://127.0.0.1:{PORT}/'
HORA = '2026-11-18T12:15:00+01:00'   # un miércoles a mediodía
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
ok, mal = 0, []
def es(c, t):
    global ok
    if c: ok += 1
    else: mal.append(t); print('  MAL', t)

async def main():
    async with async_playwright() as p:
        b = await getattr(p, NAV).launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, timezone_id='Europe/Madrid')
        await pon_hora(ctx, HORA)
        c = await ctx.new_page(); errs = []
        c.on('pageerror', lambda e: errs.append(str(e)))
        c.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        ctx.on('requestfailed', lambda r: errs.append('no carga ' + r.url[:90]))
        # U31: abrir la oficina la primera vez (se hace el negocio de nueve semanas) y U42: volver a abrir
        t0 = time.time(); await c.goto(B + 'app.html#/bandeja'); await c.wait_for_selector('#nav a'); t1 = time.time() - t0
        st = await c.evaluate("(()=>{const S=Oficio.estado();return{n:S.avisos.length,t0:S.t0,v:S.v}})()")
        es(st["n"] >= 300, f"U31: la oficina abre con el negocio en marcha ({st['n']} avisos)")
        es(t1 < 5, f'U31: la primera vez abre en menos de 5 segundos ({t1:.1f} s)')
        t0 = time.time(); await c.reload(); await c.wait_for_selector('#nav a'); t2 = time.time() - t0
        st2 = await c.evaluate("(()=>{const S=Oficio.estado();return{n:S.avisos.length,t0:S.t0}})()")
        es(t2 < 2 and st2['n'] == st['n'] and st2['t0'] == st['t0'], f'U42: al volver a abrir, los datos siguen ahí y no se rehacen ({t2:.1f} s)')
        K = "Oficio.K"; CFG = "Oficio.cfg"
        hoy = await c.evaluate(f"{K}.madrid(Date.now()).date")
        man = await c.evaluate(f"(()=>{{let d={K}.masDias('{hoy}',1);while(!{K}.laborable({CFG},d))d={K}.masDias(d,1);return d}})()")
        # U32: la bandeja: la urgencia recién entrada arriba, con quién llegaría antes; los técnicos con la hora a la que quedan libres
        u = await c.evaluate(f"""(()=>{{const S=Oficio.estado(),A=S.avisos.filter(a=>a.e==='nuevo'&&!a.cita&&a.cli.tel).sort((a,b)=>b.t-a.t)[0];if(!A)return null;
          const p={K}.urgenciaAhora(Object.assign({{}},S,{{avisos:S.avisos.filter(x=>x.id!==A.id)}}),{CFG},A.cli.dis,Date.now(),A.av);return{{id:A.id,tec:p&&p.tec,n:p&&{CFG}.tec[p.tec].n,de:p&&p.de}}}})()""")
        es(u is not None, 'U32: hay una urgencia recién entrada sin repartir')
        if u:
            fila = await c.locator(f'a[href="#/aviso/{u["id"]}"]').first.inner_text()
            es(not u['tec'] or (f"antes llega {u['n']}".lower() in fila.lower() and await c.locator(f'a[href="#/aviso/{u["id"]}"] .f3').count() == 1), f"U32: su fila dice, en una línea aparte, quién llegaría antes ({fila.strip()[:120]!r})")
            tira = await c.locator('.tira').first.inner_text() if await c.locator('.tira').count() else ''
            nombres = await c.evaluate("Oficio.N.tecnicos.map(t=>t.n)")
            es(all(n in tira for n in nombres), 'U32: arriba salen los tres técnicos, cada uno con su estado')
            # U33: «¿Quién va?»: el marcado «el que antes llega» es el que propone la bandeja, y dársela funciona
            await c.goto(B + f'app.html#/aviso/{u["id"]}'); await c.wait_for_selector('.tec[data-tec]')
            marca = await c.evaluate("(()=>{const b=[...document.querySelectorAll('.tec[data-tec]')].find(x=>/el que antes llega/.test(x.textContent));return b?b.dataset.tec:''})()")
            es(not u['tec'] or marca == u['tec'], f"U33: «el que antes llega» es {marca or 'nadie'}, el mismo que en la bandeja ({u['tec']})")
            if marca:
                await c.click(f'.tec[data-tec={marca}]'); await c.wait_for_timeout(300)
                A = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{u['id']}')")
                es(A['tec'] == marca and A['e'] == 'asignado', 'U33: con un toque, la urgencia queda para ese técnico')
        # U34: la agenda del próximo día de trabajo: cada cita con su técnico o «sin asignar»
        await c.goto(B + f'app.html#/agenda/{man}'); await c.wait_for_timeout(500)
        cs = await c.evaluate(f"Oficio.estado().avisos.filter(a=>a.cita&&a.cita.dia==='{man}'&&a.e!=='cancelado').map(a=>a.id)")
        vis = await c.evaluate("[...document.querySelectorAll('main a[href^=\"#/aviso/\"]')].map(a=>a.getAttribute('href').split('/').pop())")
        es(len(cs) >= 3 and all(x in vis for x in cs), f'U34: la agenda del {man} enseña sus {len(cs)} citas')
        # U35: el tablero del día: una fila por técnico, y cada cita de hoy con técnico en su fila
        await c.goto(B + f'app.html#/equipo/{hoy}'); await c.wait_for_selector('.tab')
        nt = await c.evaluate("Oficio.N.tecnicos.length")
        es(await c.locator('.tab .tabf').count() == nt + 1, 'U35: el tablero tiene una fila por técnico, con las horas arriba')
        hoyC = await c.evaluate(f"Oficio.estado().avisos.filter(a=>a.cita&&a.cita.dia==='{hoy}'&&a.tec&&!['cancelado','hecho'].includes(a.e)).map(a=>a.id)")
        bl = await c.evaluate("[...document.querySelectorAll('.tab .dj')].map(a=>a.getAttribute('href').split('/').pop())")
        es(all(x in bl for x in hoyC), f'U35: cada cita de hoy por hacer sale en el tablero ({len(hoyC)})')
        hh = await c.evaluate(f"Oficio.estado().avisos.filter(a=>a.e==='hecho'&&a.tec&&a.fin&&Oficio.K.madrid(a.fin).date==='{hoy}').map(a=>a.id)")
        gr = await c.evaluate("[...document.querySelectorAll('.tab .dj.h')].map(a=>a.getAttribute('href').split('/').pop())")
        es(len(hh) >= 1 and all(x in gr for x in hh), f'U35: y lo ya hecho hoy, en gris ({len(hh)})')
        # U36: cobros: lo pendiente y la caja de hoy, como en los datos, y las urgencias del mes
        R = await c.evaluate(f"(()=>{{const R={K}.resumen(Oficio.estado(),{CFG},Date.now());return{{pend:{K}.eur(R.pend.total),caja:{K}.eur(R.caja.total),n:R.pend.n}}}})()")
        await c.goto(B + 'app.html#/cobros'); await c.wait_for_timeout(500); t = await c.locator('main').inner_text()
        es(R['pend'] in t and R['caja'] in t, f"U36: cobros enseña lo pendiente ({R['pend']}) y la caja de hoy ({R['caja']})")
        es('urgencia' in t.lower(), 'U36: y las urgencias del mes')
        # U37: contratos: los de renovar, los de revisión y las cuotas
        P = await c.evaluate(f"{K}.pendientesContratos(Oficio.estado(),{CFG},Date.now())")
        await c.goto(B + 'app.html#/contratos'); await c.wait_for_timeout(500); t = await c.locator('main').inner_text()
        es(P['renovar'] and P['revision'] and P['cobrar'] and 'renovar' in t.lower() and 'revisi' in t.lower() and 'cobrar' in t.lower(), 'U37: contratos enseña los de renovar, los de revisión y las cuotas por cobrar')
        # U38: el parte de un trabajo terminado: abre y su total es el del trabajo
        Hx = await c.evaluate("(()=>{const A=Oficio.estado().avisos.filter(a=>a.e==='hecho'&&a.tot&&a.tot.total>0&&!a.sinTrabajo).slice(-3)[0];return{id:A.id,tot:Oficio.K.eur(A.tot.total)}})()")
        await c.goto(B + f'app.html#/papel/{Hx["id"]}/parte'); await c.wait_for_timeout(500); t = await c.locator('body').inner_text()
        es(Hx['tot'] in t and Hx['id'] in t, f"U38: el parte de {Hx['id']} abre y lleva su total ({Hx['tot']})")
        # U43: ninguna pantalla se sale por los lados, en el móvil y en el ordenador
        anchas = []
        for w in (390, 1280):
            await c.set_viewport_size({'width': w, 'height': 860})
            for r in ['bandeja', f'agenda/{man}', f'equipo/{hoy}', 'cobros', 'contratos', 'nuevo', f'aviso/{Hx["id"]}']:
                await c.goto(B + 'app.html#/' + r); await c.wait_for_timeout(250)
                if not await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'): anchas.append(f'{w}:{r}')
        es(not anchas, f'U43: ninguna pantalla se sale por los lados {anchas}')
        await c.set_viewport_size({'width': 390, 'height': 844})
        # U39: el técnico: «Hoy» enseña sus trabajos; terminar el de ahora y verlo en «Hechos»
        cur = await c.evaluate("(()=>{const A=Oficio.estado().avisos.find(a=>a.e==='curso');return A?{id:A.id,tec:A.tec}:null})()")
        es(cur is not None, 'U39: a mediodía hay un técnico en un trabajo')
        if cur:
            tp = await ctx.new_page(); tp.on('pageerror', lambda e: errs.append(str(e)))
            await tp.goto(B + f'app.html?papel=tecnico&tec={cur["tec"]}#/hoy'); await tp.wait_for_timeout(500)
            mios = await c.evaluate(f"Oficio.estado().avisos.filter(a=>a.tec==='{cur['tec']}'&&['asignado','camino','curso'].includes(a.e)&&(!a.cita||a.cita.dia==='{hoy}')).map(a=>a.id)")
            vis = await tp.evaluate("[...document.querySelectorAll('main a[href^=\"#/aviso/\"]')].map(a=>a.getAttribute('href').split('/').pop())")
            es(all(x in vis for x in mios), f"U39: en «Hoy», {cur['tec']} ve sus {len(mios)} trabajos de hoy")
            r = await tp.evaluate(f"Oficio.hacer({{tipo:'terminar',id:'{cur['id']}',modo:'tarjeta',firma:'M14 78C30 70 44 34 50 14 54 44'}},{{rol:'tecnico',id:'{cur['tec']}'}})")
            await tp.goto(B + f'app.html?papel=tecnico&tec={cur["tec"]}#/hechos'); await tp.wait_for_timeout(500)
            es(r.get('ok') and await tp.locator(f'a[href="#/aviso/{cur["id"]}"]').count() >= 1, 'U39: al terminar, el trabajo pasa a «Hechos»')
            await tp.close()
        # U40: el cliente pide una cita en la web y sale en la agenda de la oficina
        k = await ctx.new_page(); k.on('pageerror', lambda e: errs.append(str(e)))
        await k.goto(B + 'cita.html'); await k.wait_for_selector('input[name=av]')
        await k.locator('input[name=av][value=grifo]').check(force=True); await k.wait_for_timeout(150)
        libres, dia_ok = 0, ''   # el primer día con hueco: mañana puede estar lleno (falta Laia y se guarda un técnico para urgencias)
        for i in range(await k.locator('[data-dia]').count()):
            await k.locator('[data-dia]').nth(i).click(); await k.wait_for_timeout(150)
            libres = await k.locator('[data-fr]:not([disabled])').count()
            if libres: dia_ok = await k.locator('[data-dia]').nth(i).get_attribute('data-dia'); break
        es(libres >= 1, f'U40: con nueve semanas de trabajo, en los próximos días hay franjas para un grifo ({dia_ok or "ninguna"})')
        if libres:
            await k.locator('[data-fr]:not([disabled])').first.click()
            cp = await k.evaluate("Object.keys(Oficio.N.zonas.cp)[0]")
            await k.fill('#c_nombre', 'Clara'); await k.fill('#c_apellidos', 'Prueba Uso'); await k.fill('#c_tel', '611 22 33 99'); await k.fill('#c_dir', 'C/ de la Prueba 12, 3.º'); await k.fill('#c_cp', cp)
            await k.click('button[type=submit]'); await k.wait_for_selector('.doc'); await k.wait_for_timeout(200)
            nueva = await c.evaluate("(()=>{const A=Oficio.estado().avisos.find(a=>a.cli.apellidos==='Prueba Uso');return A?{id:A.id,dia:A.cita.dia}:null})()")
            es(nueva is not None, 'U40: la cita queda apuntada')
            if nueva:
                await c.goto(B + f'app.html#/agenda/{nueva["dia"]}'); await c.wait_for_timeout(500)
                es(await c.locator(f'main a[href="#/aviso/{nueva["id"]}"]').count() >= 1, 'U40: y sale en la agenda de la oficina, ese día')
        # U41: la zona del cliente: entra con su teléfono y ve el estado de su aviso y sus papeles
        cl = await c.evaluate("(()=>{const A=Oficio.estado().avisos.filter(a=>a.e==='hecho'&&a.tot&&a.tot.total>0&&a.cli.tel).slice(-1)[0];return{tel:Oficio.K.tel9(A.cli.tel),id:A.id}})()")
        z = await ctx.new_page(); z.on('pageerror', lambda e: errs.append(str(e)))
        cod = await c.evaluate("Oficio.K.CLIENTE_DEMO")
        await z.goto(B + f'cliente.html#/entra/{cl["tel"]}/{cod}'); await z.wait_for_timeout(600)
        tz = await z.locator('main').inner_text()
        es('Hola' in tz and cl['id'] in tz, f"U41: el cliente entra en su zona y ve su aviso {cl['id']}")
        await z.close(); await k.close()
        # U57: arriba de la bandeja, quien falta hoy no sale «libre» (y la línea de la urgencia no lo propone)
        ta = await c.evaluate(f"(()=>{{const R={K}.resumen(Oficio.estado(),{CFG},Date.now()),L=Object.keys(R.tec).filter(x=>R.tec[x].e==='libre');return L.find(x=>!{K}.ocupacion(Oficio.estado(),{CFG},x,Date.now()))||L[0]||''}})()")
        es(bool(ta), 'U57: a mediodía hay algún técnico sin trabajo en marcha')
        if ta:
            nta = await c.evaluate(f"{CFG}.tec['{ta}'].n")
            r = await c.evaluate(f"Oficio.hacer({{tipo:'ausencia',tec:'{ta}',de:'{hoy}',a:'{hoy}',motivo:'Prueba'}},{{rol:'centralita',id:'oficina'}})")
            await c.goto(B + 'app.html#/bandeja'); await c.wait_for_selector('.tira')
            li = await c.locator('.tira li', has_text=nta).first.inner_text()
            urg = await c.locator('#urgAhora').inner_text()
            es(r.get('ok') and 'hoy no está' in li and 'libre' not in li and await c.locator('.tira li.off', has_text=nta).count() == 1, f'U57: si {nta} falta hoy, arriba dice «hoy no está» ({li.strip()!r})')
            es(nta not in urg, f'U57: y la línea de la urgencia no lo propone ({urg.strip()[:90]!r})')
        # U59: la visita en la que no había nadie sale en el tablero del día, rayada; U60: y antes de darle otra cita, la app
        # avisa de que el mensaje «No había nadie» aún no se ha mandado, y deja mandarlo antes (decidido el 15-11-2026)
        # el que va de camino llega y no hay nadie (o, si nadie va de camino, uno que sale ahora hacia su cita de hoy)
        vi = await c.evaluate(f"""(()=>{{const S=Oficio.estado(),ocup=new Set(S.avisos.filter(a=>['camino','curso'].includes(a.e)).map(a=>a.tec));
          const A=S.avisos.find(a=>a.e==='camino'&&a.tec!=='{ta}')||S.avisos.find(a=>a.e==='asignado'&&a.cita&&a.cita.dia==='{hoy}'&&a.tec&&a.tec!=='{ta}'&&!ocup.has(a.tec));
          return A?{{id:A.id,tec:A.tec,va:A.e==='camino'}}:null}})()""")
        es(vi is not None, 'U59: a mediodía alguien va de camino o tiene una cita de hoy por hacer')
        if vi:
            r1 = {'ok': True} if vi['va'] else await c.evaluate(f"Oficio.hacer({{tipo:'voy',id:'{vi['id']}'}},{{rol:'tecnico',id:'{vi['tec']}'}})")
            await c.wait_for_timeout(1200)
            r2 = await c.evaluate(f"Oficio.hacer({{tipo:'ausente',id:'{vi['id']}'}},{{rol:'tecnico',id:'{vi['tec']}'}})")
            await c.goto(B + f'app.html#/equipo/{hoy}'); await c.wait_for_selector('.tab')
            dj = c.locator(f'.tab .dj.n[href="#/aviso/{vi["id"]}"]')
            lab = await dj.first.get_attribute('aria-label') if await dj.count() else ''
            es(r1.get('ok') and r2.get('ok') and await dj.count() == 1 and 'no había nadie' in lab and await c.locator('.tabl .ln').count() == 1, f'U59: en el tablero, ese rato sale rayado y dice que no había nadie ({lab!r})')
            await c.goto(B + f'app.html#/aviso/{vi["id"]}'); await c.wait_for_selector('[data-a="cita"]')
            await c.click('[data-a="cita"]'); await c.wait_for_selector('#cB')
            hay = await c.locator('#cAus').count(); txa = await c.locator('#cAus').inner_text() if hay else ''
            es(hay == 1 and 'aún no se ha mandado' in txa, f'U60: al ir a darle otra cita, avisa de que el mensaje «No había nadie» aún no se ha mandado ({txa.strip()[:80]!r})')
            if hay:
                await c.click('#cMsg'); await c.wait_for_selector('#mOk'); await c.click('#mOk'); await c.wait_for_timeout(300)
                env = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{vi['id']}').msgs.some(m=>m.k==='ausente'&&m.env)")
                await c.click('[data-a="cita"]'); await c.wait_for_selector('#cB')
                es(env and await c.locator('#cAus').count() == 0, 'U60: «Mandarlo antes» abre el mensaje; mandado, ya no avisa')
                await c.keyboard.press('Escape')
        # U65–U67: el seguimiento (mensajes de después del trabajo): su línea en «Por hacer», su hoja, dejarlo sin mandar y
        # el cliente que no quiere estos mensajes (15-11-2026, noche)
        await c.goto(B + 'app.html#/bandeja'); await c.wait_for_selector('#bResto')
        ns = await c.evaluate(f"{K}.porMandar(Oficio.estado(),Date.now()).filter(x=>{K}.SEGUIR.includes(x.m.k)).length")
        lin = c.locator('.alertas [data-a="seguir"]')
        es(ns >= 2 and await lin.count() == 1 and (f'{ns} clientes para el seguimiento' in await lin.inner_text()), f'U65: en «Por hacer» sale «{ns} clientes para el seguimiento»')
        if ns >= 2 and await lin.count() == 1:
            await lin.click(); await c.wait_for_selector('dialog.hoja .msgs')
            tit = await c.locator('dialog.hoja h2').first.inner_text(); filas = await c.locator('dialog.hoja .msgs li').count()
            es(tit.strip() == f'{ns} clientes para el seguimiento' and filas == ns, f'U65: su hoja tiene una fila por cliente ({filas} de {ns})')
            await c.locator('dialog.hoja .msgs [data-a="msg"]').first.click(); await c.wait_for_selector('#mNo')
            uno = await c.evaluate(f"(()=>{{const x={K}.porMandar(Oficio.estado(),Date.now()).filter(x=>{K}.SEGUIR.includes(x.m.k))[0];return x.a.id+'|'+x.m.k}})()")
            txm = await c.locator('dialog.hoja .wa-b').inner_text()
            es(await c.locator('#mBaja').count() == 1 and 'Si prefieres que no te escribamos para esto, dínoslo.' in txm, 'U66: el mensaje dice cómo dejar de recibirlos y la oficina puede dejarlo sin mandar o apuntar que no los quiere')
            await c.click('#mNo'); await c.wait_for_timeout(300)
            idm, km = uno.split('|')
            dej = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{idm}').msgs.find(m=>m.k==='{km}')")
            ns2 = await c.evaluate(f"{K}.porMandar(Oficio.estado(),Date.now()).filter(x=>{K}.SEGUIR.includes(x.m.k)).length")
            es(dej.get('no') == 1 and dej.get('env') and ns2 == ns - 1, f'U66: «No hace falta mandarlo» lo deja apuntado y ya no sale ({ns} → {ns2})')
            await c.goto(B + 'app.html#/bandeja'); await c.wait_for_selector('.alertas [data-a="seguir"]'); await c.click('.alertas [data-a="seguir"]'); await c.wait_for_selector('dialog.hoja .msgs')
            await c.locator('dialog.hoja .msgs [data-a="msg"]').first.click(); await c.wait_for_selector('#mBaja')
            tel = await c.evaluate(f"{K}.porMandar(Oficio.estado(),Date.now()).filter(x=>{K}.SEGUIR.includes(x.m.k))[0].a.cli.tel")
            await c.click('#mBaja'); await c.wait_for_timeout(300)
            st = await c.evaluate(f"(()=>{{const S=Oficio.estado(),L=S.avisos.filter(a=>a.cli.tel==='{tel}');return{{n:L.length,no:L.every(a=>a.noMsg),pm:{K}.porMandar(S,Date.now()).some(x=>x.a.cli.tel==='{tel}'&&{K}.SEGUIR.includes(x.m.k)),id:L[0].id}}}})()")
            es(st['n'] >= 1 and st['no'] and not st['pm'], f'U67: «No quiere estos mensajes» se apunta en sus {st["n"]} avisos y ya no le sale ninguno de seguimiento')
            await c.goto(B + f"app.html#/aviso/{st['id']}"); await c.wait_for_selector('.nomsg')
            await c.click('.nomsg [data-a="escribirSi"]'); await c.wait_for_timeout(300)
            vuelve = await c.evaluate(f"Oficio.estado().avisos.filter(a=>a.cli.tel==='{tel}').every(a=>!a.noMsg)")
            es(vuelve and await c.locator('.nomsg').count() == 0, 'U67: en la ficha del cliente se ve, y «Volver a escribirle» lo quita')
        # U57: de noche, quien no hace guardias sale «fuera de horario»; los que las hacen, libres para una urgencia
        ctx2 = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, timezone_id='Europe/Madrid')
        await pon_hora(ctx2, '2026-11-18T22:00:00+01:00')
        n = await ctx2.new_page(); n.on('pageerror', lambda e: errs.append(str(e)))
        await n.goto(B + 'app.html#/bandeja'); await n.wait_for_selector('.tira')
        tf = await n.evaluate(f"(()=>{{const R={K}.resumen(Oficio.estado(),{CFG},Date.now()),L=Object.keys(R.tec).filter(x=>R.tec[x].e==='libre'&&!{K}.ocupacion(Oficio.estado(),{CFG},x,Date.now()));if(L.length<2)return '';{CFG}.tec[L[0]].guardia=0;return L[0]+'|'+L[1]}})()")
        es(bool(tf), 'U57: a las diez de la noche hay al menos dos técnicos sin trabajo en marcha')
        if tf:
            sin, con = [await n.evaluate(f"{CFG}.tec['{x}'].n") for x in tf.split('|')]
            await n.evaluate("location.hash='#/cobros'"); await n.wait_for_timeout(200); await n.evaluate("location.hash='#/bandeja'"); await n.wait_for_selector('.tira')
            l1 = await n.locator('.tira li', has_text=sin).first.inner_text(); l2 = await n.locator('.tira li', has_text=con).first.inner_text()
            es('fuera de horario' in l1 and 'libre' in l2, f'U57: de noche, {sin} (sin guardias) sale «fuera de horario» y {con} (de guardia), «libre» ({l1.strip()!r} · {l2.strip()!r})')
        await ctx2.close()
        es(not errs, f'U31: sin errores en la consola {errs[:3]}')
        await b.close()
    print(f"{'MAL' if mal else 'BIEN'}: {ok} comprobaciones pasan" + (f', {len(mal)} fallan' if mal else '') + ' · la demo en uso, en ' + NAV)
    sys.exit(1 if mal else 0)

asyncio.run(main())
