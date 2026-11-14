# Horarios, turnos y ausencias en pantalla: lo que ve el cliente, lo que puede la oficina y lo que no puede nadie.
#  - El cliente solo ve huecos reales y puede marcar otras franjas que también le van bien.
#  - La oficina puede poner una cita en el hueco que se guarda para urgencias y con menos de dos horas, y queda escrito.
#    No puede forzarla donde no trabaja nadie ni donde ya no cabe.
#  - «Equipo»: quién trabaja cada día, qué lleva cada uno, «No viene» y lo que pasa con sus citas.
#  - Los avisos de arriba: sobran citas, por reasignar y pendientes de confirmar.
# Cada cosa que sale en pantalla se compara con lo que dicen las reglas (js/oficio-nucleo.js), no con números escritos aquí.
# Uso: python3 horarios.py [puerto]     (NAVEGADOR=chromium|firefox|webkit)
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json, re
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

def vigila(pg, nombre):
    pg.on('console', lambda m: webkit_linux.consola(m, nombre, errores))
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    pg.on('response', lambda r: errores.append(f'{nombre}: {r.status} {r.url}') if r.status >= 400 and '/assets/img/av-' not in r.url else None)

async def hasta(pg, js, ms=6000):
    try: await pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
async def toast(pg, trozo): return await hasta(pg, f"(()=>{{const e=document.querySelector('#toast');return e&&e.classList.contains('on')&&e.textContent.includes({json.dumps(trozo)})}})()")
async def texto(pg, sel): return (await pg.locator(sel).first.inner_text()) if await pg.locator(sel).count() else ''
async def ir(pg, ruta, espera):
    # Cambia de pantalla y no sigue hasta que la app la ha pintado. La app pinta al oír el cambio de dirección; este oyente se apunta
    # después del suyo, así que cuando salta, la pantalla nueva ya está. Sin esto, si lo que se espera ya estaba en la pantalla
    # anterior (dos avisos seguidos, por ejemplo), se podía leer la vieja.
    await pg.evaluate("r=>new Promise(ok=>{if(location.hash===r)return ok();addEventListener('hashchange',()=>setTimeout(ok,0),{once:true});location.hash=r})", ruta)
    await pg.wait_for_selector(espera)
K = 'OficioNucleo'
# lo que dicen las reglas de las franjas de un día, visto por la oficina
FR = "(d=>" + K + ".franjasDe(Oficio.estado(),Oficio.cfg,d,Date.now()).map(f=>({id:f.id,txt:f.txt,ok:f.ok,okOf:f.okOf,por:f.por,libres:f.libres,libresOf:f.libresOf,tope:f.tope})))"
# el texto pequeño que tiene que llevar cada franja en los formularios de la oficina
def chico(f):
    if f['ok']: return 'queda 1' if f['libres'] == 1 else f"quedan {f['libres']}"
    if f['okOf']: return 'menos de 2 h' if f['por'] == 'margen' else 'hueco de urgencias'
    return 'nadie trabaja' if not f['tope'] else 'llena' if not f['libresOf'] else 'ya ha pasado'

async def nuevo_con_cita(c, dia, fr, n, av=None):
    """La oficina crea un aviso con cita desde su formulario. Devuelve el id, o '' si el botón de esa franja no deja."""
    await ir(c, '#/nuevo', '#fNuevo'); await c.click('[data-b-cu="cita"]'); await c.click(f'[data-b-dia="{dia}"]')
    if av: await c.click(f'[data-b-av="{av}"]')
    b = c.locator(f'[data-b-fr="{fr}"]')
    if await b.is_disabled(): return ''
    await b.click()
    await c.fill('#n_tel', f'6112244{n:02d}'); await c.fill('#n_nombre', f'Prueba Horarios {n}'); await c.fill('#n_apellidos', 'Prueba'); await c.fill('#n_dir', f'C/ de la Prueba {n}, 1.º'); await c.fill('#n_cp', CP)
    await c.click('#fNuevo button[type=submit], #fNuevo .btn.pri'); await c.wait_for_function("location.hash.startsWith('#/aviso/')"); await c.wait_for_selector('[data-a=cita]')
    return (await c.evaluate("location.hash")).split('/')[-1]

async def main():
    global CP
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        movil = dict(viewport={'width': 390, 'height': 844}, is_mobile=(NAV != 'firefox'), has_touch=True, locale='es-ES', timezone_id='Europe/Madrid')
        ctx = await br.new_context(**movil); await pon_hora(ctx)
        c = await ctx.new_page(); vigila(c, 'oficina'); await c.goto(B + 'app.html'); await c.wait_for_selector('#nav a')
        N = await c.evaluate('OFICIO_NEGOCIO'); cfg = await c.evaluate("({conHorario:Oficio.cfg.conHorario,porFranja:Oficio.cfg.porFranja,reserva:Oficio.cfg.reserva})")
        CP = list(N['zonas']['cp'].keys())[0]
        hoy = await c.evaluate(K + ".madrid().date"); dias = await c.evaluate(K + ".diasDe(Oficio.estado(),Oficio.cfg,Date.now(),6,true).map(x=>x.dia)")
        D1 = [d for d in dias if d != hoy][0]; D2 = [d for d in dias if d != hoy][1]
        tecs = [t['id'] for t in N['tecnicos']]
        print(f"Negocio: {N['nombre']} ({N['id']}) · {'con' if cfg['conHorario'] else 'sin'} horarios, {cfg['porFranja']} por franja y {cfg['reserva']} para urgencias · hoy {hoy}, citas el {D1} · motor {NAV}", flush=True)
        es(cfg['conHorario'] and cfg['reserva'] >= 1, 'esta batería necesita un negocio con horarios y con hueco guardado para urgencias (la demo los lleva)')

        # ---------- 1. el cliente: huecos reales y otras franjas que le van bien ----------
        k = await ctx.new_page(); vigila(k, 'cliente'); await k.goto(B + 'cita.html'); await k.wait_for_selector('#f')
        await k.click(f'[data-dia="{D1}"]'); f1 = await c.evaluate(FR + f"('{D1}')")
        vis = await k.evaluate("[...document.querySelectorAll('[data-fr]')].map(b=>({id:b.dataset.fr,no:b.disabled,chico:(b.querySelector('small')||{}).textContent}))")
        es(len(vis) == len(f1) and all(v['no'] == (not f['ok']) for v, f in zip(vis, f1)), f"cliente: solo puede pulsar las franjas que las reglas le ofrecen {[(v['id'], v['no']) for v in vis]}")
        es(all(v['chico'] == (('queda 1' if f['libres'] == 1 else f"quedan {f['libres']}") if f['ok'] else 'ya no da tiempo' if f['libres'] else 'completa') for v, f in zip(vis, f1)), f"cliente: en cada franja pone los huecos que hay de verdad {[v['chico'] for v in vis]}")
        es(any(f['tope'] > f['libres'] for f in f1) and all(f['libres'] < f['tope'] for f in f1 if f['tope']), 'cliente: de lo que cabe, siempre se le ofrece menos: una se guarda para urgencias')
        es(await k.locator('[data-alt]').count() == 0, 'cliente: antes de elegir franja no se le pregunta por otras')
        libre = [f for f in f1 if f['ok']]; await k.locator('input[name=av]').first.check(force=True); await k.click(f"[data-fr=\"{libre[0]['id']}\"]"); await k.wait_for_selector('[data-alt]')
        alts = await k.evaluate("[...document.querySelectorAll('[data-alt]')].map(b=>b.dataset.alt)")
        es(2 <= len(alts) <= 8 and f"{D1}|{libre[0]['id']}" not in alts and all(a.split('|')[0] >= D1 for a in alts), f'cliente: al elegir franja le salen otras libres de ese día y de los siguientes, sin la que ya eligió ({len(alts)})')
        for a in alts[:5]: await k.click(f'[data-alt="{a}"]')
        marc = await k.evaluate("[...document.querySelectorAll('[data-alt][aria-pressed=true]')].map(b=>b.dataset.alt)")
        es(len(marc) == min(4, len(alts)) and (len(alts) < 5 or await toast(k, 'Con cuatro')), f'cliente: puede marcar hasta cuatro; a la quinta se le dice que basta ({len(marc)})')
        await k.click(f'[data-alt="{marc[-1]}"]'); marc = marc[:-1]
        es(await k.locator('[data-alt][aria-pressed=true]').count() == len(marc), 'cliente: y desmarcar una')
        await k.fill('#c_nombre', 'Clara Franjas'); await k.fill('#c_apellidos', 'Prueba'); await k.fill('#c_tel', '611 22 44 90'); await k.fill('#c_dir', 'C/ de la Prueba 9, 2.º'); await k.fill('#c_cp', CP)
        await k.click('button[type=submit]'); await k.wait_for_selector('.doc'); idk = (await k.evaluate("location.hash")).split('/')[-1]
        A = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{idk}')")
        es(A and A['cita']['dia'] == D1 and A['cita']['ok'] is True and [f"{v['dia']}|{v['fr']}" for v in A['vale']] == [f"{D1}|{libre[0]['id']}"] + marc, f"cliente: la cita entra con la franja pedida y las otras que marcó ({len(A['vale']) if A else 0})")
        v = await k.evaluate(f"{K}.vistaCliente(Oficio.estado(),Oficio.cfg,'{idk}')")
        es(sorted(v['cita'].keys()) == ['dia', 'fr', 'ok'], 'cliente: de su cita ve el día y la franja, nada de las notas de la oficina')

        # ---------- 2. la oficina: lo que el cliente no puede ----------
        await ir(c, '#/nuevo', '#fNuevo'); await c.click('[data-b-cu="cita"]')
        # hoy: con la hora de las pruebas hay franjas a menos de dos horas, o ya en marcha
        fh = await c.evaluate(FR + f"('{hoy}')"); margen = [f for f in fh if f['por'] == 'margen']
        if hoy in dias and margen:
            await c.click(f'[data-b-dia="{hoy}"]')
            vis = await c.evaluate("[...document.querySelectorAll('[data-b-fr]')].map(b=>({id:b.dataset.bFr,no:b.disabled,chico:b.querySelector('small').textContent}))")
            es(all(v['no'] == (not f['okOf']) and v['chico'] == chico(f) for v, f in zip(vis, fh)), f"oficina, hoy: cada franja dice lo que las reglas: {[(v['id'], v['chico']) for v in vis]}")
            await k.goto(B + 'cita.html'); await k.wait_for_selector('#f'); hoy_cli = await k.locator(f'[data-dia="{hoy}"]').count()
            if hoy_cli: await k.click(f'[data-dia="{hoy}"]')
            es(not hoy_cli or await k.locator(f"[data-fr=\"{margen[0]['id']}\"]").is_disabled(), 'cliente, hoy: la franja que empieza en menos de dos horas no la puede pedir')
            idm = await nuevo_con_cita(c, hoy, margen[0]['id'], 1)
            Am = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{idm}')")
            es(bool(idm) and Am['cita']['of'] == 'margen' and 'menos de dos horas' in await texto(c, '#v'), 'oficina, hoy: pone una cita a menos de dos horas y queda escrito en el aviso')
        else: print('  (a esta hora no hay ninguna franja de hoy a menos de dos horas: se salta esa parte)')
        # mañana: se llena lo que ve el cliente en la última franja y la oficina usa el hueco de urgencias
        fD = await c.evaluate(FR + f"('{D1}')"); ult = [f for f in fD if f['tope'] > 0][-1]; U = ult['id']
        for i in range(ult['libres']):
            r = await c.evaluate(f"Oficio.hacer({{tipo:'pedir',av:OFICIO_NEGOCIO.averias[0].id,cli:{{nombre:'Cliente Web {i}',apellidos:'Prueba',tel:'61133550{i}',dir:'C/ Web {i + 1}, 1.º',cp:'{CP}'}},cita:{{dia:'{D1}',fr:'{U}'}}}},{{rol:'cliente'}})")
            es(r['ok'], f'preparación: el cliente pide la franja {U} ({i + 1})')
        r = await c.evaluate(f"Oficio.hacer({{tipo:'pedir',av:OFICIO_NEGOCIO.averias[0].id,cli:{{nombre:'Cliente De Más',apellidos:'Prueba',tel:'611335599',dir:'C/ Web 9, 1.º',cp:'{CP}'}},cita:{{dia:'{D1}',fr:'{U}'}}}},{{rol:'cliente'}})")
        es(r['ok'] is False and r['err'] == 'franja', 'reglas: con la franja llena para el cliente, otro cliente ya no entra')
        await k.goto(B + 'cita.html'); await k.wait_for_selector('#f'); await k.click(f'[data-dia="{D1}"]')
        es(await k.locator(f'[data-fr="{U}"]').is_disabled() and 'completa' in await texto(k, f'[data-fr="{U}"]'), 'cliente: esa franja le sale «completa», aunque quede el hueco de urgencias')
        await ir(c, '#/nuevo', '#fNuevo'); await c.click('[data-b-cu="cita"]'); await c.click(f'[data-b-dia="{D1}"]')
        fD = await c.evaluate(FR + f"('{D1}')"); vis = await c.evaluate("[...document.querySelectorAll('[data-b-fr]')].map(b=>({id:b.dataset.bFr,no:b.disabled,chico:b.querySelector('small').textContent}))")
        es(all(v['no'] == (not f['okOf']) and v['chico'] == chico(f) for v, f in zip(vis, fD)), f"oficina: cada franja dice lo que las reglas: {[(v['id'], v['chico']) for v in vis]}")
        fu = next(f for f in fD if f['id'] == U)
        es(fu['por'] == 'reserva' and 'hueco de urgencias' in await texto(c, f'[data-b-fr="{U}"]') and not await c.locator(f'[data-b-fr="{U}"]').is_disabled(), 'oficina: la franja que el cliente ve completa, ella la puede pulsar: «hueco de urgencias»')
        await c.click(f'[data-b-fr="{U}"]'); await c.wait_for_selector('#n_por')
        es('se guarda para urgencias' in await texto(c, '#n_por'), 'oficina: al elegirla, la app explica que usa el hueco de urgencias')
        ido = await nuevo_con_cita(c, D1, U, 2)
        Ao = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{ido}')")
        cu = await texto(c, '#v .blq:has([data-a=cita])')
        es(bool(ido) and Ao['cita'].get('of') == 'reserva' and Ao['cita']['ok'] is True and 'hueco que se guarda para urgencias' in cu, f"oficina: la crea, y en «Cuándo» queda dicho que usó el hueco de urgencias ({ido!r}, {Ao['cita'] if Ao else None}, {cu[:90]!r})")
        await c.click('details.hist summary')
        es('en el hueco que se guarda para urgencias' in await texto(c, 'details.hist'), 'oficina: y también en el historial del aviso')
        fD = await c.evaluate(FR + f"('{D1}')"); fu = next(f for f in fD if f['id'] == U)
        es(fu['libresOf'] == 0 and not fu['okOf'] and await nuevo_con_cita(c, D1, U, 3) == '' and 'llena' in await texto(c, f'[data-b-fr="{U}"]'), 'oficina: una más ya no: la franja sale «llena» y el botón no deja. No se puede forzar')
        r = await c.evaluate(f"Oficio.hacer({{tipo:'pedir',av:OFICIO_NEGOCIO.averias[0].id,origen:'llamada',cli:{{nombre:'Forzada',apellidos:'Prueba',tel:'611335598',dir:'C/ Web 8, 1.º',cp:'{CP}'}},cita:{{dia:'{D1}',fr:'{U}'}}}},{{rol:'centralita',id:'oficina'}})")
        es(r['ok'] is False and r['err'] == 'franja', 'reglas: ni saltándose la pantalla entra')
        es(await c.evaluate(K + ".sobran(Oficio.estado(),Oficio.cfg,Date.now()).length") == 0, 'reglas: usar el hueco de urgencias no cuenta como que sobran citas')

        # ---------- 3. repartir: solo a quien puede ----------
        citasU = await c.evaluate(f"Oficio.estado().avisos.filter(a=>a.cita&&a.cita.dia==='{D1}'&&a.cita.fr==='{U}').map(a=>a.id)")
        pu = await c.evaluate(f"(ids=>OFICIO_NEGOCIO.tecnicos.map(t=>({{id:t.id,no:{K}.puedeIr(Oficio.estado(),Oficio.cfg,Oficio.estado().avisos.find(a=>a.id===ids[0]),t.id,Date.now())}})))({json.dumps(citasU)})")
        nop = [x['id'] for x in pu if x['no'] == 'horario']; sip = [x['id'] for x in pu if x['no'] == '']
        await ir(c, f'#/aviso/{citasU[0]}', '.tec')
        dicho = True
        for t in nop: dicho = dicho and 'no' in (await c.get_attribute(f'.tec[data-tec="{t}"]', 'class')).split() and 'No trabaja en esa franja' in await texto(c, f'.tec[data-tec="{t}"]')
        es(len(sip) >= 2 and dicho, f'repartir: quien no trabaja esa franja lo lleva escrito en su botón ({nop})')
        if nop:
            await c.click(f'.tec[data-tec="{nop[0]}"]')
            es(await toast(c, 'no trabaja') and not (await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{citasU[0]}').tec")), 'repartir: y si se le pulsa, no se asigna y dice por qué')
        await c.click(f'.tec[data-tec="{sip[0]}"]'); await toast(c, 'Asignado')
        await ir(c, f'#/aviso/{citasU[1]}', '.tec')
        es('Ya tiene esa franja ocupada' in await texto(c, f'.tec[data-tec="{sip[0]}"]'), 'repartir: quien ya tiene esa franja ocupada también lo dice')
        await c.click(f'.tec[data-tec="{sip[1]}"]'); await toast(c, 'Asignado')
        es(await c.evaluate(f"Oficio.estado().avisos.filter(a=>a.cita&&a.cita.dia==='{D1}'&&a.cita.fr==='{U}').map(a=>a.tec).sort().join()") == ','.join(sorted(sip[:2])), 'repartir: las dos citas quedan una con cada uno')

        # ---------- 4. Equipo: quién trabaja y qué lleva ----------
        await ir(c, f'#/agenda/{D1}', '.seg.segv')
        es(await c.locator('.seg.segv a').all_inner_texts() == ['Citas', 'Equipo'] and await c.locator('.seg.segv a[aria-current]').inner_text() == 'Citas', 'agenda: arriba se elige entre «Citas» y «Equipo»')
        tA = await texto(c, '#v'); fD = await c.evaluate(FR + f"('{D1}')")
        es('undefined' not in tA and 'NaN' not in tA and all(f"de {f['tope']}" in tA for f in fD), 'agenda: cada franja dice cuántas lleva de las que caben')
        es(('solo para la oficina' in tA) == any(f['okOf'] and f['libresOf'] > (f['libres'] if f['ok'] else 0) for f in fD), 'agenda: los huecos que solo puede usar la oficina van marcados aparte')
        await c.click('.seg.segv a[href^="#/equipo"]'); await c.wait_for_selector('.tecd[data-tec]')
        es(await texto(c, '#v h1') == 'Equipo' and await c.locator('#nav a[href="#/agenda"][aria-current]').count() == 1 and await c.locator('.tecd[data-tec]').count() == len(tecs), 'equipo: una ficha por técnico, dentro de la agenda')
        es(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'equipo: en el móvil no se sale por los lados')
        fichas = await c.evaluate(f"[...document.querySelectorAll('.tecd[data-tec]')].map(s=>({{id:s.dataset.tec,linea:s.querySelector('.ln').textContent,filas:[...s.querySelectorAll('.tfr li')].map(li=>li.innerText.replace(/\\n+/g,' | '))}}))")
        regla = await c.evaluate(f"OFICIO_NEGOCIO.tecnicos.map(t=>({{id:t.id,fr:Oficio.cfg.franjas.map(f=>{K}.trabaja(Oficio.cfg,t.id,'{D1}',f.de,f.a))}}))")
        bien = True
        for fi, rg in zip(fichas, regla):
            for fila, tr in zip(fi['filas'], rg['fr']): bien = bien and (('No trabaja' in fila) == (not tr))
        es(bien and len(fichas) == len(regla), f"equipo: «No trabaja» sale justo en las franjas que el horario no cubre {[(f['id'], [('No trabaja' in x) for x in f['filas']]) for f in fichas]}")
        es(all(re.match(r'^De \d', f['linea']) for f in fichas), f"equipo: cada ficha dice el horario de ese día ({fichas[0]['linea']})")
        es(all(any(N['averias'][0]['c'] in x for x in next(f for f in fichas if f['id'] == t)['filas']) for t in sip[:2]) and 'Libre' in json.dumps(fichas, ensure_ascii=False), 'equipo: cada cita sale en la ficha de quien la lleva, y lo libre, como libre')
        ts = await texto(c, '.tecd:not([data-tec])')
        es(await c.locator('.tecd:not([data-tec]) .cch').count() >= 1 and ('esperan técnico' in ts or 'espera técnico' in ts), 'equipo: las citas sin técnico van arriba, aparte')
        es('todos' in await texto(c, f'.dias a[href="#/equipo/{D1}"]') and 'Nadie tiene bajas' in await texto(c, '#v'), 'equipo: sin ausencias, cada día dice «todos»')

        # ---------- 5. «No viene»: una ausencia y lo que pasa con sus citas ----------
        X = sip[0]; nx = next(t['n'] for t in N['tecnicos'] if t['id'] == X)
        await c.click('.cab [data-a="ausencia"]'); await c.wait_for_selector('#uF')
        es(await c.locator('#uF [aria-pressed=true]').count() == 0 and await c.input_value('#u_de') == D1 and await c.input_value('#u_a') == D1, 'ausencia: desde el botón de arriba, el día viene puesto y hay que elegir a quién')
        await c.click('button[form="uF"]')
        es('Elige quién falta' in await texto(c, '#u_err') and await c.locator('dialog[open]').count() == 1, 'ausencia: sin elegir a nadie no se apunta, y lo dice')
        await c.click('dialog[open] [data-x]'); await c.wait_for_selector('dialog[open]', state='detached')
        await c.click(f'.tecd[data-tec="{X}"] [data-a="ausencia"]'); await c.wait_for_selector('#uF')
        es(await c.get_attribute(f'#uF [data-ut="{X}"]', 'aria-pressed') == 'true', 'ausencia: desde la ficha de un técnico, ya viene elegido')
        await c.evaluate("(()=>{const i=document.querySelector('#u_de');i.removeAttribute('min');i.value='2020-01-01';const j=document.querySelector('#u_a');j.removeAttribute('min');j.value='2020-01-02'})()"); await c.click('button[form="uF"]')
        es('Revisa las fechas' in await texto(c, '#u_err'), 'ausencia: con fechas pasadas no se apunta, y lo dice')
        await c.fill('#u_de', D2); await c.dispatch_event('#u_de', 'change')
        es(await c.input_value('#u_a') == D2, 'ausencia: si el «desde» pasa del «hasta», el «hasta» lo sigue')
        await c.fill('#u_de', D1); await c.fill('#u_a', D1); await c.fill('#u_mo', 'Baja'); await c.click('button[form="uF"]')
        es(await toast(c, 'Apuntado. 1 aviso vuelve') and await hasta(c, f"!!document.querySelector('.tecd.aus[data-tec=\"{X}\"]')"), f'ausencia: al apuntarla, la cita de {nx} vuelve a «sin asignar» y se dice')
        tx = await texto(c, f'.tecd[data-tec="{X}"]')
        es('Ausente: baja' in tx and tx.count('Ausente') >= 1 + len(fD) and 'Quitar la ausencia' in tx, f'equipo: la ficha de {nx} sale como ausente en todas las franjas, con el motivo')
        es('falta 1' in await texto(c, f'.dias a[href="#/equipo/{D1}"]') and 'todos' in await texto(c, f'.dias a[href="#/equipo/{D2}"]'), 'equipo: ese día dice «falta 1»; el siguiente, «todos»')
        es(nx in await texto(c, '.filau') and 'Baja' in await texto(c, '.filau'), 'equipo: la ausencia queda en la lista de abajo')
        al = await c.locator('.alertas li').all_inner_texts(); so = await c.evaluate(K + ".sobran(Oficio.estado(),Oficio.cfg,Date.now())")
        es(any('1 aviso por reasignar' in x for x in al), f'avisos de arriba: «1 aviso por reasignar» {[x[:40] for x in al]}')
        es(len(so) == 1 and so[0]['fr'] == U and any('Sobra 1 cita' in x and 'no hay técnicos para todas' in x for x in al), 'avisos de arriba: con uno menos ya no hay técnicos para las dos de esa franja: «Sobra 1 cita»')
        es(await c.get_attribute('.alertas li a[href^="#/equipo/"]', 'href') == f'#/equipo/{D1}', 'avisos de arriba: el de «sobra» lleva al día en cuestión')
        await ir(c, '#/bandeja', '.alertas')
        es(await c.locator('.alertas li').count() == len(al) and 'Reasignar' in await texto(c, '#v .lista'), 'bandeja: los mismos avisos arriba, y el aviso suelto lleva la etiqueta «Reasignar»')
        suelto = await c.evaluate("Oficio.estado().avisos.find(a=>a.reasignar).id")
        await c.click('.alertas li a[href^="#/aviso/"]'); await c.wait_for_selector('.tec')
        es((await c.evaluate("location.hash")).endswith(suelto) and 'ya no puede ir' in await texto(c, '#v') and 'Ausente ese día' in await texto(c, f'.tec[data-tec="{X}"]'), f'aviso suelto: se abre desde el aviso de arriba, dice que hay que elegir a otro y que {nx} está ausente')
        await c.click(f'.tec[data-tec="{X}"]')
        es(await toast(c, 'ausente') and not await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{suelto}').tec"), 'aviso suelto: a quien está ausente no se le puede asignar')

        # ---------- 6. cambiar la cita: las franjas del cliente y «pendiente de confirmar» ----------
        await ir(c, f'#/aviso/{idk}', '[data-a=cita]')
        es('también le va bien' in await texto(c, '#v') and await c.locator('#porConf').count() == 0, 'cambiar: en el aviso del cliente salen las otras franjas que marcó')
        await c.click('[data-a=cita]'); await c.wait_for_selector('#cB [data-f]')
        d0, f0 = marc[0].split('|'); await c.click(f'#cB [data-d="{d0}"]')
        es('le va bien' in await texto(c, f'#cB [data-f="{f0}"]'), 'cambiar: en la hoja, las franjas que dio el cliente llevan «le va bien»')
        await c.click(f'#cB [data-f="{f0}"]')
        es(await c.locator('#cConf').count() == 0, 'cambiar: a una franja que él dio no hace falta confirmar nada')
        otra = await c.evaluate(f"(()=>{{const A=Oficio.estado().avisos.find(a=>a.id==='{idk}');for(const d of {K}.diasDe(Oficio.estado(),Oficio.cfg,Date.now(),6,true))for(const f of {K}.franjasDe(Oficio.estado(),Oficio.cfg,d.dia,Date.now(),A.id))if(f.okOf&&!A.vale.some(v=>v.dia===d.dia&&v.fr===f.id)&&d.dia>'{hoy}')return[d.dia,f.id];return null}})()")
        await c.click(f'#cB [data-d="{otra[0]}"]'); await c.click(f'#cB [data-f="{otra[1]}"]'); await c.wait_for_selector('#cConf')
        es(not await c.is_checked('#cConf') and 'pendiente de confirmar' in await texto(c, '#cB'), 'cambiar: a una franja que no dio sale la casilla «ya lo he hablado», sin marcar porque la cita la pidió él por la web')
        await c.click('#cOk')
        es(await toast(c, 'pendiente de confirmar') and await hasta(c, "!!document.querySelector('#porConf')"), 'cambiar: guardada sin hablarlo, queda «pendiente de confirmar» en el aviso')
        A = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{idk}')")
        es(A['cita']['ok'] is False and A['cita']['dia'] == otra[0] and A['cita']['fr'] == otra[1], 'reglas: la cita se ha movido y está marcada como no confirmada')
        await ir(c, '#/bandeja', '.alertas')
        es(any('1 cita pendiente de confirmar' in x for x in await c.locator('.alertas li').all_inner_texts()) and 'por confirmar' in await texto(c, '#v .lista'), 'bandeja: sale arriba «1 cita pendiente de confirmar», y en su fila')
        await ir(c, f'#/aviso/{idk}', '#porConf'); await c.click('#porConf [data-a="confirma"]')
        es(await toast(c, 'confirmada') and await hasta(c, "!document.querySelector('#porConf')") and await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{idk}').cita.ok") is True, 'cambiar: con «Ya está hablado» deja de estar pendiente')
        # una cita apuntada por teléfono: la casilla viene marcada
        await ir(c, f'#/aviso/{ido}', '[data-a=cita]'); await c.click('[data-a=cita]'); await c.wait_for_selector('#cB [data-f]')
        await c.click(f'#cB [data-d="{otra[0]}"]'); libre2 = await c.evaluate(f"{K}.franjasDe(Oficio.estado(),Oficio.cfg,'{otra[0]}',Date.now(),'{ido}').filter(f=>f.okOf).map(f=>f.id)")
        await c.click(f'#cB [data-f="{libre2[0]}"]'); await c.wait_for_selector('#cConf')
        es(await c.is_checked('#cConf'), 'cambiar: en un aviso apuntado por teléfono la casilla viene marcada: la oficina está hablando con él')
        await c.click('#cOk'); await toast(c, 'Cita guardada')
        es(await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{ido}').cita.ok") is True and await c.evaluate(K + ".sobran(Oficio.estado(),Oficio.cfg,Date.now()).length") == 0, 'cambiar: queda como buena y, al salir de la franja que sobraba, el aviso de «sobra» desaparece')

        # ---------- 7. quitar la ausencia ----------
        await ir(c, f'#/equipo/{D1}', '.tecd[data-tec]'); await c.click('.filau [data-a="quitaAus"]')
        es(await toast(c, 'Ausencia quitada') and await hasta(c, "!document.querySelector('.tecd.aus')") and 'todos' in await texto(c, f'.dias a[href="#/equipo/{D1}"]'), f'ausencia: al quitarla, {nx} vuelve a salir trabajando')
        await ir(c, f'#/aviso/{suelto}', '.tec'); await c.click(f'.tec[data-tec="{X}"]')
        es(await toast(c, 'Asignado') and await c.evaluate(f"!Oficio.estado().avisos.some(a=>a.reasignar)"), 'ausencia: y ya se le puede volver a asignar; no queda nada por reasignar')
        await ir(c, '#/bandeja', '.cab')
        es(await c.locator('.alertas').count() == 0, 'bandeja: sin nada pendiente, no sale ningún aviso arriba')

        # ---------- 8. el técnico no ve «Equipo»; anchos; ordenador ----------
        t = await ctx.new_page(); vigila(t, 'técnico'); await t.goto(B + f'app.html?papel=tecnico&tec={tecs[0]}#/equipo/{D1}'); await t.wait_for_selector('#nav a')
        es(await t.locator('.tecd').count() == 0 and await t.locator('[data-a="ausencia"]').count() == 0, 'técnico: no tiene la pantalla de equipo ni puede apuntar ausencias')
        r = await t.evaluate(f"Oficio.hacer({{tipo:'ausencia',tec:'{tecs[1]}',de:'{D1}',a:'{D1}'}},{{rol:'tecnico',id:'{tecs[0]}'}})")
        es(r['ok'] is False and r['err'] == 'permiso', 'reglas: y si lo intenta por su cuenta, no tiene permiso')
        await t.close()
        for w in (320, 360):
            await c.set_viewport_size({'width': w, 'height': 740}); await ir(c, f'#/equipo/{D1}', '.tecd[data-tec]')
            a1 = await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'); await ir(c, f'#/agenda/{D1}', '.seg.segv'); a2 = await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            es(a1 and a2, f'ancho {w}: ni «Equipo» ni «Citas» se salen por los lados')
        g = await br.new_context(viewport={'width': 1280, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid'); await pon_hora(g); pg = await g.new_page(); vigila(pg, 'ordenador')
        await pg.goto(B + f'app.html#/equipo/{D1}'); await pg.wait_for_selector('.tecd[data-tec]')
        cols = await pg.evaluate("new Set([...document.querySelectorAll('.tecd')].map(s=>Math.round(s.getBoundingClientRect().left))).size")
        es(cols >= 2 and await pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'ordenador: las fichas del equipo van en columnas ({cols})')
        await pg.goto(B + 'app.html#/agenda'); await pg.wait_for_selector('.sem')
        es(await pg.locator('.seg.segv a').count() == 2 and 'undefined' not in await texto(pg, '#v'), 'ordenador: la agenda de la semana también lleva «Citas | Equipo»')
        await g.close()

        # ---------- 9. un negocio sin horarios: las ausencias valen igual, los huecos son fijos ----------
        s = await br.new_context(**movil); await pon_hora(s)
        async def sin_horarios(route):
            rs = await route.fetch(); cuerpo = await rs.text()
            await route.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=cuerpo + "\n;(function(g){const N=g.OFICIO_NEGOCIO;N.tecnicos.forEach(x=>{delete x.horario;delete x.guardia});delete N.horario;delete N.citas;N.cupo=2})(typeof globalThis!=='undefined'?globalThis:this);")
        await s.route('**/js/oficio-datos.js', sin_horarios)
        ps = await s.new_page(); vigila(ps, 'sin horarios'); await ps.goto(B + f'app.html#/equipo/{D1}'); await ps.wait_for_selector('.tecd[data-tec]')
        es(await ps.evaluate('Oficio.cfg.conHorario') is False and await ps.locator('.tecd .ln', has_text='Sin horario puesto').count() == len(tecs) and 'no tiene horarios puestos' in await texto(ps, '#v'), 'sin horarios: «Equipo» lo dice en cada ficha y explica que los huecos no cambian')
        ra = await ps.evaluate(f"Oficio.hacer({{tipo:'pedir',av:OFICIO_NEGOCIO.averias[0].id,origen:'llamada',cli:{{nombre:'Sin Horario',apellidos:'Prueba',tel:'611335597',dir:'C/ Web 7, 1.º',cp:'{CP}'}},cita:{{dia:'{D1}',fr:Oficio.cfg.franjas[0].id}}}},{{rol:'centralita',id:'oficina'}})")
        await ps.click(f'.tecd[data-tec="{tecs[0]}"] [data-a="ausencia"]'); await ps.wait_for_selector('#uF'); await ps.click('button[form="uF"]'); await toast(ps, 'Apuntado')
        await ir(ps, f"#/aviso/{ra['id']}", '.tec')
        await ps.click(f'.tec[data-tec="{tecs[0]}"]'); no0 = await toast(ps, 'ausente')
        es('Ausente ese día' in await texto(ps, f'.tec[data-tec="{tecs[0]}"]') and no0 and 'no' not in (await ps.get_attribute(f'.tec[data-tec="{tecs[1]}"]', 'class')).split(), 'sin horarios: a quien falta tampoco se le puede asignar; a los demás, sí')
        await ir(ps, f'#/agenda/{D1}', '.seg.segv')
        es('de 2' in await texto(ps, '#v') and 'undefined' not in await texto(ps, '#v') and 'solo para la oficina' not in await texto(ps, '#v'), 'sin horarios: la agenda cuenta sobre el número fijo de citas y no hay hueco de urgencias')
        await s.close()

        es(not errores, f'ninguna pantalla da errores en la consola {errores[:5]}')
        webkit_linux.resumen_rarezas()
        await br.close()
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + '.')
    sys.exit(1 if fallos else 0)

asyncio.run(main())
