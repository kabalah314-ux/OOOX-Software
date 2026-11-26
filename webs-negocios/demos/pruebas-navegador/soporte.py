# El buzón de mejoras en la app de la oficina: pedir algo a OOOX, ver cómo va, leer la respuesta y las novedades,
# con y sin conexión, en la demo y en la copia de un negocio de verdad.
# El servidor es de mentira (clase Servidor): sigue las reglas del de verdad (webs-negocios/oficios-soporte/esquema.sql)
# y no sale nada a internet. No lleva escrito ningún dato del negocio: vale para cualquier copia.
# Uso: python3 soporte.py <datos-de-otro-negocio.js> [puerto]     (NAVEGADOR=chromium|firefox|webkit)
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json, re
from datetime import datetime, timedelta, timezone
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # el buzón de mejoras no sale a internet en las pruebas: ver buzon_falso.py
from buzon_falso import RUTA, CORS, contesta
buzon_falso.ACTIVO = False   # aquí el servidor de mentira es el de abajo, con memoria, y se pone interceptando la red
from reloj import pon_hora, AHORA   # la hora de las pruebas es fija: ver reloj.py

DATOS = open(sys.argv[1], encoding='utf-8').read() if len(sys.argv) > 1 else ''
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []; de_red = []
def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt, flush=True)

class Servidor:
    """El buzón de OOOX, de mentira y con memoria."""
    def __init__(s):
        s.pet = []; s.nov = []; s.sin_ofertas = {}; s.claves = {}; s.demo = set(); s.n = 0; s.vistas = {}
        s.caido = False; s.err = None; s.llamadas = []; s.ahora = datetime.fromisoformat(AHORA)
    def de(s, fn): return [c for f, c in s.llamadas if f == fn]
    async def __call__(s, route):
        rq = route.request
        if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers=CORS)
        fn = rq.url.split('/')[-1].split('?')[0]
        try: c = rq.post_data_json or {}
        except Exception: c = {}
        s.llamadas.append((fn, c))
        if s.caido: return await route.abort()
        neg = c.get('p_negocio')
        if s.err and (fn == 'oficios_enviar' or s.err == 'bloqueo'): return await contesta(route, {'ok': False, 'err': s.err})
        if neg not in s.claves or s.claves[neg] != c.get('p_clave'): return await contesta(route, {'ok': False, 'err': 'clave'})
        demo = neg in s.demo
        mias = [p for p in s.pet if p['negocio'] == neg and (not demo or p['remitente'] == c.get('p_remitente'))]
        if fn == 'oficios_enviar':
            if c.get('p_tipo') not in ('fallo', 'mejora', 'duda'): return await contesta(route, {'ok': False, 'err': 'tipo'})
            t = (c.get('p_texto') or '').strip()
            if not 10 <= len(t) <= 2000: return await contesta(route, {'ok': False, 'err': 'texto'})
            if demo and not c.get('p_remitente'): return await contesta(route, {'ok': False, 'err': 'remitente'})
            s.n += 1
            s.pet.append({'id': s.n, 'negocio': neg, 'remitente': c.get('p_remitente'), 'tipo': c['p_tipo'], 'texto': t, 'quien': c.get('p_quien'),
                          'estado': 'recibida', 'respuesta': None, 'creada': s.ahora.astimezone(timezone.utc).isoformat()})
            return await contesta(route, {'ok': True, 'id': s.n})
        if fn == 'oficios_buzon':
            if c.get('p_vistas'): s.vistas[neg] = c['p_vistas']
            sin = s.sin_ofertas.get(neg, False)
            return await contesta(route, {'ok': True, 'sin_ofertas': sin, 'demo': demo,
                'peticiones': [{k: p[k] for k in ('id', 'tipo', 'texto', 'quien', 'estado', 'respuesta', 'creada')} for p in reversed(mias)],
                'novedades': [{k: n[k] for k in ('id', 'tipo', 'titulo', 'texto', 'enlace', 'desde')} for n in s.nov if n.get('negocio') in (None, neg) and not (sin and n['tipo'] == 'oferta')]})
        if fn == 'oficios_ofertas':
            if not demo: s.sin_ofertas[neg] = not c.get('p_quiere')
            return await contesta(route, {'ok': True, 'sin_ofertas': s.sin_ofertas.get(neg, False)})
        await contesta(route, {'ok': False, 'err': 'servidor'})

def vigila(pg, nombre):
    def consola(m):
        if m.type != 'error': return
        t = m.text
        # sin conexión, el navegador escribe en la consola que no pudo cargar: eso es lo que se está probando, no un error de la página
        # Firefox, con la red interceptada, a veces deja una fuente a medio bajar al cambiar de pantalla (código 2152398850, «carga cancelada»):
        # lo dice el motor, no la página. Una fuente que de verdad falta da un 404 y eso sí cuenta, más abajo.
        (de_red if re.search(r'Failed to load resource|net::ERR|NetworkError|Load failed|access control checks|CORS|Cross-Origin|downloadable font: download failed.*status=2152398850', t) else errores).append(f'{nombre}: {t}')
    pg.on('console', consola)
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    pg.on('response', lambda r: errores.append(f'{nombre}: {r.status} {r.url}') if r.status >= 400 and '/rest/v1/rpc/' not in r.url and '/assets/img/av-' not in r.url else None)

async def hasta(pg, js, ms=6000):
    try: await pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
async def toast(pg, trozo): return await hasta(pg, f"(()=>{{const e=document.querySelector('#toast');return e&&e.classList.contains('on')&&e.textContent.includes({json.dumps(trozo)})}})()")
async def texto(pg, sel): return (await pg.locator(sel).first.inner_text()) if await pg.locator(sel).count() else ''
async def a_mejoras(pg, pesta=''):
    # Si ya está en «Mejoras», sale y vuelve a entrar. Entre un cambio de dirección y el otro hay que esperar a que la otra pantalla esté
    # pintada: si llegan seguidos, el navegador puede avisar de los dos cuando la dirección ya es la última, y la app, con razón, no ve
    # ninguna entrada nueva y no vuelve a pedir el buzón. Le pasó a WebKit en las pruebas automáticas el 13-11-2026, una vez.
    # Desde el 20-11-2026 «Mejoras» va en pestañas: «Pedir» (#/mejoras), «Tus peticiones» y «Novedades»
    if (await pg.evaluate("location.hash")).startswith('#/mejoras'):
        await pg.evaluate("location.hash='#/bandeja'"); await pg.wait_for_function("!document.querySelector('#fMejora,#fCodigo,#mLista')")
    await pg.evaluate("h=>{location.hash=h}", '#/mejoras' + ('/' + pesta if pesta else '')); await pg.wait_for_selector('#fMejora,#fCodigo,#mLista')
async def pesta(pg, k):
    # espera a la sección de esa pestaña, no a «#mLista», que está en las dos y se queda de la anterior hasta que se vuelve a pintar (21-11-2026)
    await pg.click(f'.pestas [data-pesta={k}]'); await pg.wait_for_selector({'pedir': '#fMejora', 'peticiones': '#mPet', 'novedades': '#mNov'}[k])
async def escribe(pg, tipo, txt):
    # «Pedir» va en dos pasos (20-11-2026): qué es («Continuar») y, luego, cuéntalo
    if not await pg.locator('#fMejora').count(): await pesta(pg, 'pedir')
    if tipo:
        if await pg.locator('#fMejora[data-paso="1"]').count(): await pg.click('#fMejora [data-m-atras]'); await pg.wait_for_selector('#fMejora[data-paso="0"]')
        await pg.click(f'#fMejora [data-m-tipo="{tipo}"]'); await pg.click('#mSig'); await pg.wait_for_selector('#m_texto')
    await pg.fill('#m_texto', txt)
async def envia(pg): await pg.click('#mOk')

async def main():
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch(); srv = Servidor()
        async def avanza(ctx, minutos):
            srv.ahora += timedelta(minutes=minutos); await pon_hora(ctx, srv.ahora.isoformat())
        movil = dict(viewport={'width': 390, 'height': 844}, is_mobile=(NAV != 'firefox'), has_touch=True, locale='es-ES', timezone_id='Europe/Madrid')
        ctx = await br.new_context(**movil); await pon_hora(ctx); await ctx.route(RUTA, srv)
        c = await ctx.new_page(); vigila(c, 'oficina')
        await c.goto(B + 'app.html'); await c.wait_for_selector('#nav a')
        N = await c.evaluate('OFICIO_NEGOCIO'); demo = await c.evaluate('Oficio.DEMO'); ver = await c.evaluate('OficioNucleo.VERSION')
        srv.claves[N['id']] = 'DEMO' if demo else 'CODIGO-DE-LA-COPIA'
        if demo: srv.demo.add(N['id'])
        else: await c.evaluate(f"localStorage.setItem('oficio:{N['id']}:soporte', JSON.stringify('CODIGO-DE-LA-COPIA'))")
        print(f"Negocio: {N['nombre']} ({N['id']}), {'demo' if demo else 'copia de verdad'} · versión {ver} · motor {NAV}", flush=True)

        # ---------- 1. el menú ----------
        nav = await c.locator('#nav a').all_inner_texts()
        con = await c.evaluate('Object.keys(Oficio.cfg.planes||{}).length>0')   # con contratos de mantenimiento, el menú lleva «Contratos»
        es(len(nav) == 3 and any('Más' in x for x in nav), f'menú: Ahora · Agenda · Más {[x.strip() for x in nav]}')
        await c.goto(B + 'app.html#/mas'); await c.wait_for_selector('.lista.mas')
        mas_t = await c.locator('.lista.mas').inner_text()
        es('Mejoras' in mas_t and 'Cobros' in mas_t and (not con or 'Contratos' in mas_t), f'«Más»: lleva Cobros, Mejoras y, con contratos, Contratos ({mas_t!r})')
        es(await c.locator('.lista.mas a[href="#/mejoras"] .n').count() == 0, 'menú: sin nada nuevo, «Mejoras» (dentro de «Más») no lleva número')
        await c.goto(B + 'app.html'); await c.wait_for_selector('#nav a')
        t = await ctx.new_page(); vigila(t, 'técnico'); antes = len(srv.llamadas)
        await t.goto(B + 'app.html?papel=tecnico#/mejoras'); await t.wait_for_selector('#nav a'); await t.wait_for_timeout(2300)
        es(not any('Mejoras' in x for x in await t.locator('#nav a').all_inner_texts()) and await t.locator('#fMejora,#fCodigo').count() == 0, 'menú: el técnico no tiene «Mejoras», ni entrando por la dirección')
        await t.close()

        # ---------- 2. la pantalla ----------
        await c.click('#nav a[href="#/mas"]'); await c.wait_for_selector('.lista.mas'); await c.click('.lista.mas a[href="#/mejoras"]'); await c.wait_for_selector('#fMejora')
        es(await texto(c, '#v h1') == 'Mejoras' and await c.locator('#nav a[href="#/mas"][aria-current]').count() == 1, 'pantalla: se abre desde «Más» y «Más» queda marcado')
        es((await c.locator('.ojo').count() == 1) == demo, 'pantalla: el aviso de «esto es una demo» sale solo en la demo')
        es(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'pantalla: en el móvil no se sale por los lados')
        pes = await c.evaluate("[...document.querySelectorAll('.fija .pestas a')].map(a=>a.firstChild.textContent)")
        es(pes == ['Pedir', 'Tus peticiones', 'Novedades'] and await c.locator('.pestas a[aria-current=page]').inner_text() == 'Pedir', f'pantalla: arriba, fijas, «Pedir», «Tus peticiones» y «Novedades»; se entra a «Pedir» ({pes})')
        altos = await c.evaluate("[...document.querySelectorAll('#fMejora button')].filter(b=>getComputedStyle(b).visibility!=='hidden').map(b=>Math.round(b.getBoundingClientRect().height))")
        es(len(altos) == 4 and min(altos) >= 44, f'pantalla: los botones se pueden tocar con el dedo {altos}')
        es(await c.evaluate("(()=>{const g=document.querySelector('#fMejora [role=radiogroup][aria-labelledby]');return !!g&&document.getElementById(g.getAttribute('aria-labelledby')).textContent==='¿Qué es?'})()"), 'pantalla: el tipo es un grupo con nombre: la pregunta del paso, «¿Qué es?»')
        await pesta(c, 'peticiones'); tPet = await texto(c, '#mPet'); await pesta(c, 'novedades'); tNov = await texto(c, '#mNov'); await pesta(c, 'pedir')
        es('Aún no has pedido nada' in tPet and 'te lo contamos aquí' in tNov, 'pantalla: vacía, cada pestaña dice qué va a aparecer en ella')
        es(await hasta(c, f"{len(srv.de('oficios_buzon'))}>=0") and len(srv.de('oficios_buzon')) >= 1 and srv.de('oficios_buzon')[0]['p_negocio'] == N['id'], 'pantalla: al entrar pide el buzón de este negocio')

        # ---------- 3. lo que no vale no sale ----------
        await c.click('#mSig'); await c.wait_for_selector('#e_mtipo:not([hidden])')
        es(await c.evaluate("document.activeElement&&document.activeElement.dataset.mTipo") == 'fallo' and not srv.de('oficios_enviar'), 'sin elegir qué es: lo dice, deja el foco en la primera opción y no manda nada')
        await c.click('#fMejora [data-m-tipo="mejora"]')
        es(await c.get_attribute('#fMejora [data-m-tipo="mejora"]', 'aria-checked') == 'true' and await c.locator('#e_mtipo:not([hidden])').count() == 0, 'al elegir, se marca y el aviso se quita')
        await c.click('#mSig'); await c.wait_for_selector('#fMejora[data-paso="1"]')
        es(await c.evaluate("['m_texto','m_quien'].every(i=>document.querySelector('label[for='+i+']'))&&document.querySelector('label[for=m_quien]').textContent.includes('Tu nombre')") and 'Una mejora' in await texto(c, '#fMejora .lleva') and 'Paso 2 de 2' in await texto(c, '#fMejora .prog'),
           'paso 2, «Cuéntalo»: arriba lo elegido; cada campo con su rótulo (el nombre, «Tu nombre (opcional)»)')
        await c.fill('#m_texto', 'corto'); await envia(c); await c.wait_for_selector('#e_mtexto')
        es(await c.evaluate("document.activeElement.id") == 'm_texto' and 'al menos 10' in await texto(c, '#e_mtexto') and not srv.de('oficios_enviar'), 'con un texto corto: lo dice, deja el foco en el texto y no manda nada')
        es(await c.input_value('#m_texto') == 'corto' and 'Una mejora' in await texto(c, '#fMejora .lleva'), 'y lo escrito sigue ahí')

        # ---------- 4. enviar ----------
        malo = 'Quiero ver la semana entera de un vistazo.\n<img src=x onerror="window.__colado=1"><script>window.__colado=2</script> "comillas" & más'
        await c.fill('#m_texto', malo); await c.fill('#m_quien', 'Marta'); await envia(c)
        es(await toast(c, 'Enviada'), 'enviar: avisa de que ha salido')
        es(await hasta(c, "document.querySelectorAll('#mPet .pet').length===1") and await c.evaluate("location.hash") == '#/mejoras/peticiones', 'enviar: se abre «Tus peticiones» y la petición está ahí')
        e = srv.de('oficios_enviar')
        es(len(e) == 1 and e[0]['p_negocio'] == N['id'] and e[0]['p_tipo'] == 'mejora' and e[0]['p_texto'] == malo and e[0]['p_quien'] == 'Marta', 'enviar: llegan el negocio, el tipo, el texto tal cual y quién lo pide')
        es(len(e) == 1 and e[0]['p_version'] == ver and bool(re.match(r'^(bandeja|agenda|cobros|nuevo|aviso|papel)( > \w+)* · 390×\d+$', e[0]['p_pantalla'] or '')) and ' · ' in (e[0]['p_aparato'] or '') and len(e[0]['p_remitente'] or '') == 20,
           f"enviar: llegan la versión, la pantalla, el aparato y el remitente ({e[0].get('p_pantalla')!r}, {e[0].get('p_aparato')!r})" if e else 'enviar: llegan la versión, la pantalla, el aparato y el remitente')
        es(len(e) == 1 and sorted(e[0].keys()) == ['p_aparato', 'p_clave', 'p_negocio', 'p_pantalla', 'p_quien', 'p_remitente', 'p_texto', 'p_tipo', 'p_version'], 'enviar: y ningún dato más')
        cli = await c.evaluate("Oficio.estado().avisos.flatMap(a=>[a.cli.nombre,a.cli.tel,a.cli.dir]).filter(x=>x&&x.length>5)")
        todo = json.dumps(srv.llamadas, ensure_ascii=False)
        es((not demo or len(cli) > 5) and not [x for x in cli if x in todo], f'enviar: de los clientes del negocio no viaja nada ({len(cli)} datos mirados)')
        es(await c.evaluate("!window.__colado&&!document.querySelector('#mLista img,#mLista script')") and '<img src=x' in await texto(c, '#mPet .px'), 'enviar: lo escrito se enseña como texto, aunque parezca código')
        es('Recibida' in await texto(c, '#mPet .pill') and 'Una mejora' in await texto(c, '#mPet .pt') and 'Marta' in await texto(c, '#mPet .pm') and 'ahora mismo' in await texto(c, '#mPet .pm'), 'enviar: sale con su tipo, su estado, quién y cuándo')
        await pesta(c, 'pedir'); limpio = await c.locator('#fMejora[data-paso="0"] [aria-checked=true]').count() == 0
        await escribe(c, 'duda', '')
        es(limpio and await c.input_value('#m_texto') == '' and await c.input_value('#m_quien') == 'Marta', 'enviar: el formulario queda limpio para la siguiente y recuerda quién escribe')
        es(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'enviar: con una petición larga, la pantalla sigue sin salirse')

        # ---------- 5. OOOX contesta ----------
        srv.pet[0]['estado'] = 'mirando'; srv.pet[0]['respuesta'] = 'Lo miramos esta semana.\nGracias por avisar.'
        await avanza(ctx, 31); await c.goto(B + 'app.html#/bandeja'); await c.reload(); await c.wait_for_selector('#nav a')
        es(await hasta(c, "!!document.querySelector('#nav a[href=\"#/mas\"] .n')"), 'respuesta: sin entrar, «Más» avisa con un número de que hay algo')
        await c.click('#nav a[href="#/mas"]'); await c.wait_for_selector('.lista.mas')
        es(await hasta(c, "(()=>{const n=document.querySelector('.lista.mas a[href=\"#/mejoras\"] .n');return n&&n.textContent==='1'&&n.getAttribute('aria-label')==='1 sin leer'})()"), 'respuesta: y dentro, «Mejoras» lleva un 1 de que hay algo sin leer')
        await a_mejoras(c); await c.wait_for_selector('#mPet .pet')
        tp = await texto(c, '#mPet .pet')
        es('La estamos mirando' in tp and 'OOOX responde' in tp and 'Lo miramos esta semana.' in tp and 'Gracias por avisar.' in tp, 'respuesta: se lee el estado nuevo y lo que contesta OOOX')
        es(await c.locator('#mPet .pet.nueva').count() == 1 and 'Sin leer' in tp, 'respuesta: lo que no se había leído va marcado')
        await c.click('#nav a[href="#/mas"]'); await c.wait_for_selector('.lista.mas')
        es(await c.locator('.lista.mas a[href="#/mejoras"] .n').count() == 0, 'respuesta: al abrirlo, el número de «Mejoras» desaparece')
        await c.evaluate("location.hash='#/agenda'"); await c.wait_for_selector('#v:not(.estrecha)'); await a_mejoras(c, 'peticiones')
        es(await c.locator('#mPet .pet').count() == 1 and await c.locator('#mPet .pet.nueva').count() == 0 and 'Sin leer' not in await texto(c, '#mPet'), 'respuesta: al volver, ya no va marcada')

        # ---------- 6. novedades y ofertas ----------
        d = srv.ahora.astimezone(timezone.utc).isoformat()
        srv.nov = [{'id': 11, 'tipo': 'novedad', 'titulo': 'Agenda por técnico', 'texto': 'Ya puedes ver la semana de cada uno.', 'enlace': None, 'desde': d, 'negocio': None},
                   {'id': 12, 'tipo': 'oferta', 'titulo': 'Asistente de llamadas', 'texto': 'Pruébalo un mes.', 'enlace': 'https://ooox.es/oficios', 'desde': d, 'negocio': None},
                   {'id': 13, 'tipo': 'aviso', 'titulo': 'Aviso <b>raro</b>', 'texto': 'Con un enlace que no es de fiar.', 'enlace': 'javascript:window.__colado=3', 'desde': d, 'negocio': None},
                   {'id': 14, 'tipo': 'novedad', 'titulo': 'Solo para otro negocio', 'texto': 'No debe verse aquí.', 'enlace': None, 'desde': d, 'negocio': 'otro-negocio'}]
        await avanza(ctx, 2); await a_mejoras(c, 'novedades')
        es(await hasta(c, "document.querySelectorAll('#mNov .pet').length===3"), 'novedades: salen las de todos los negocios y las de este, no las de otro')
        en = await c.evaluate("[...document.querySelectorAll('#mNov a')].map(a=>[a.getAttribute('href'),a.target,a.rel])")
        es(en == [['https://ooox.es/oficios', '_blank', 'noopener noreferrer']], f'novedades: solo se puede pulsar un enlace seguro, y se abre aparte {en}')
        es(await c.evaluate("!document.querySelector('#mNov b')") and 'Aviso <b>raro</b>' in await texto(c, '#mNov'), 'novedades: el título también se enseña como texto')
        es(await c.locator('#mNov .pet.nueva').count() == 3, 'novedades: las tres van marcadas como sin leer')
        await c.click('#mNov [data-a="mOfertas"]'); await toast(c, 'no verás más ofertas')
        es(await hasta(c, "document.querySelectorAll('#mNov .pet').length===2") and 'No recibes ofertas' in await texto(c, '#mNov .mpie'), 'ofertas: al decir que no, la oferta se va y queda dicho')
        es(await c.evaluate("document.activeElement&&document.activeElement.dataset.q") == '1', 'ofertas: el foco se queda en el botón de volver a recibirlas')
        if not demo: es(srv.sin_ofertas.get(N['id']) is True, 'ofertas: la baja queda guardada en el servidor')
        await avanza(ctx, 2); await a_mejoras(c, 'novedades'); await c.wait_for_timeout(400)
        es(await c.locator('#mNov .pet').count() == 2, 'ofertas: al volver a entrar siguen sin salir')
        await c.click('#mNov [data-a="mOfertas"]'); es(await hasta(c, "document.querySelectorAll('#mNov .pet').length===3") or not demo, 'ofertas: y se puede volver a recibirlas')

        # ---------- 7. el servidor dice que no: lo escrito no se pierde ----------
        srv.err = 'limite'; n0 = len(srv.pet); await escribe(c, 'fallo', 'El botón de asignar no hace nada.'); await envia(c)
        es(await toast(c, 'muchas peticiones'), 'tope: si OOOX dice que son demasiadas, lo explica')
        es(await c.input_value('#m_texto') == 'El botón de asignar no hace nada.' and 'Algo falla' in await texto(c, '#fMejora .lleva') and len(srv.pet) == n0, 'tope: y lo escrito se queda en el formulario')
        srv.err = None

        # ---------- 8. sin conexión ----------
        srv.caido = True; await envia(c)
        es(await toast(c, 'Sin conexión'), 'sin conexión: avisa de que queda guardada')
        es(await hasta(c, "document.querySelectorAll('#mPet .pet').length===2") and 'Sin enviar' in await texto(c, '#mPet .pet .pill') and 'Hay 1 petición sin enviar' in await texto(c, '#mPet .mpie'), 'sin conexión: sale en la lista como «sin enviar»')
        await pesta(c, 'pedir'); limpio = await c.locator('#fMejora[data-paso="0"]').count() == 1 and await c.locator('#fMejora [aria-checked=true]').count() == 0
        es(limpio, 'sin conexión: el formulario queda limpio, porque ya está guardada')
        await pesta(c, 'peticiones'); await c.reload(); await c.wait_for_selector('#mPet .pet')
        tl = await texto(c, '#mPet')
        es('Sin enviar' in tl and 'El botón de asignar' in tl and 'Quiero ver la semana' in tl and 'OOOX responde' in tl, 'sin conexión: al recargar sigue lo guardado y lo último que se sabía')
        srv.caido = False; await c.click('[data-a="mReintenta"]')
        es(await hasta(c, "!document.querySelector('#mPet .mpie')&&[...document.querySelectorAll('#mPet .pill')].every(p=>p.textContent!=='Sin enviar')"), 'sin conexión: con «Probar ahora», sale')
        es(len(srv.pet) == n0 + 1 and srv.pet[-1]['texto'] == 'El botón de asignar no hace nada.' and srv.pet[-1]['tipo'] == 'fallo', 'sin conexión: llega una sola vez y entera')
        srv.caido = True; await escribe(c, 'duda', '¿Se puede cambiar el horario de un técnico?'); await envia(c); await toast(c, 'Sin conexión')
        srv.caido = False; await c.evaluate("window.dispatchEvent(new Event('online'))")
        es(await hasta(c, "[...document.querySelectorAll('#mPet .pill')].length===3&&[...document.querySelectorAll('#mPet .pill')].every(p=>p.textContent!=='Sin enviar')") and len(srv.pet) == n0 + 2, 'sin conexión: cuando vuelve la conexión, sale sola')

        # ---------- 9. escribir sin que nada lo interrumpa ----------
        await escribe(c, 'mejora', ''); await c.click('#m_texto'); await c.keyboard.type('Estoy escribiendo y'); c2 = await ctx.new_page(); vigila(c2, 'otra pestaña')
        await c2.goto(B + 'app.html'); await c2.wait_for_selector('#nav a')
        n_antes = await c.evaluate("+((document.querySelector('#nav a[href=\"#/bandeja\"] .n')||{}).textContent||0)")
        hecho = await c2.evaluate("(()=>{const N=OFICIO_NEGOCIO;return Oficio.hacer({tipo:'pedir',av:N.averias[0].id,origen:'llamada',nota:'',cli:{nombre:'Prueba Foco',apellidos:'Prueba',tel:'611 22 33 44',dir:'C/ de la Prueba 1',cp:Object.keys(N.zonas.cp)[0]},cita:null},{rol:'centralita',id:'oficina'})})()")
        llego = await hasta(c, f"+((document.querySelector('#nav a[href=\"#/bandeja\"] .n')||{{}}).textContent||0)==={n_antes + 1}")
        es(hecho.get('ok') and llego, f'escribir: un aviso que entra por otra pestaña sube el número de la bandeja aunque se esté escribiendo ({hecho})')
        await c.bring_to_front(); await c.keyboard.type(' sigo')
        es(await c.evaluate("document.activeElement.id") == 'm_texto' and await c.input_value('#m_texto') == 'Estoy escribiendo y sigo', 'escribir: y no quita el foco ni borra lo escrito')
        await c2.close(); await c.fill('#m_texto', '')

        # ---------- 10. en la demo, cada navegador ve solo lo suyo ----------
        if demo:
            o = await br.new_context(**movil); await pon_hora(o, srv.ahora.isoformat()); await o.route(RUTA, srv); po = await o.new_page(); vigila(po, 'otro navegador')
            await po.goto(B + 'app.html#/mejoras/novedades'); await po.wait_for_selector('#mLista'); await hasta(po, "document.querySelectorAll('#mNov .pet').length>=2")
            es(await po.locator('#mNov .pet').count() == 3, 'demo: las novedades sí las ven todos')
            await pesta(po, 'peticiones')
            es(await po.locator('#mPet .pet').count() == 0 and len(srv.pet) >= 3, 'demo: otro navegador no ve las peticiones de este')
            await o.close()

        # ---------- 11. en el ordenador ----------
        g = await br.new_context(viewport={'width': 1280, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid'); await pon_hora(g, srv.ahora.isoformat()); await g.route(RUTA, srv)
        pg = await g.new_page(); vigila(pg, 'ordenador')
        if not demo: await pg.add_init_script(f"localStorage.setItem('oficio:{N['id']}:soporte', JSON.stringify('CODIGO-DE-LA-COPIA'))")
        await pg.goto(B + 'app.html#/mejoras'); await pg.wait_for_selector('#fMejora')
        caja = await pg.evaluate("(()=>{const m=document.querySelector('#v').getBoundingClientRect(),n=document.querySelector('#nav a[href=\"#/mas\"]').getBoundingClientRect();return{ancho:Math.round(m.width),nav:n.width>0&&n.height>=44,sale:document.documentElement.scrollWidth>innerWidth+1}})()")
        es(caja['nav'] and not caja['sale'] and caja['ancho'] <= 760, f'ordenador: «Más» (con Mejoras) está en el menú del lado y la pantalla va en columna estrecha {caja}')
        await pg.keyboard.press('Tab'); foco = []
        for _ in range(40):
            f = await pg.evaluate("(()=>{const a=document.activeElement;return a?(a.id||a.dataset.mTipo||a.dataset.a||a.tagName):''})()"); foco.append(f)
            if f == 'mSig': break
            await pg.keyboard.press('Tab')
        es(sum(x in foco for x in ('fallo', 'mejora', 'duda')) == 1 and 'mSig' in foco, f'ordenador: con el teclado se llega al tipo y a «Continuar»; el tipo es un grupo de una sola opción: una parada {foco[-6:]}')
        await pg.focus('#fMejora [data-m-tipo="fallo"]'); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(100)
        es(await pg.evaluate("document.activeElement.dataset.mTipo") == 'mejora' and await pg.get_attribute('#fMejora [data-m-tipo="mejora"]', 'aria-checked') == 'true', 'ordenador: dentro del grupo, con las flechas se elige otro tipo')
        await pg.focus('#fMejora [data-m-tipo="duda"]'); await pg.keyboard.press('Enter'); await pg.focus('#mSig'); await pg.keyboard.press('Enter'); await pg.wait_for_selector('#m_texto')
        foco2 = []
        for _ in range(12):
            await pg.keyboard.press('Tab'); f = await pg.evaluate("(()=>{const a=document.activeElement;return a?(a.id||a.dataset.a||a.tagName):''})()"); foco2.append(f)
            if f == 'mOk': break
        es(foco2[-3:] == ['m_texto', 'm_quien', 'mOk'] and await pg.evaluate("document.activeElement&&document.activeElement.id") == 'mOk', f'ordenador: en el segundo paso, el texto, el nombre y «Enviar», en su orden {foco2[-4:]}')
        await pg.focus('#m_texto'); await pg.keyboard.type('Petición hecha solo con el teclado.')
        await pg.focus('#m_quien'); antes = len(srv.de('oficios_enviar')); await pg.keyboard.press('Enter')
        es(await hasta(pg, "document.querySelector('#toast').textContent.includes('Enviada')") and len(srv.de('oficios_enviar')) == antes + 1 and srv.de('oficios_enviar')[-1]['p_tipo'] == 'duda', 'ordenador: se puede elegir y enviar sin ratón')
        es(bool(re.search(r' · 1280×\d+$', srv.de('oficios_enviar')[-1]['p_pantalla'])), 'ordenador: el tamaño de pantalla que viaja es el de este aparato')
        await g.close()

        # ---------- 12. la copia de un negocio de verdad: pide el código de soporte ----------
        if DATOS:
            r = await br.new_context(**movil); await pon_hora(r, srv.ahora.isoformat()); await r.route(RUTA, srv)
            await r.route('**/js/oficio-datos.js', lambda x: x.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=DATOS))
            pr = await r.new_page(); vigila(pr, 'copia'); await pr.goto(B + 'app.html'); await pr.wait_for_selector('#nav a')
            N2 = await pr.evaluate('OFICIO_NEGOCIO'); d2 = await pr.evaluate('Oficio.DEMO')
            if d2 or N2['id'] == N['id']: print('  (el archivo de datos pasado es una demo o el mismo negocio: se salta la parte del código de soporte)')
            else:
                srv.claves[N2['id']] = 'Codigo-Bueno-2026'; k = len(srv.llamadas); await pr.wait_for_timeout(2300)
                es(not [1 for f, x in srv.llamadas[k:] if x.get('p_negocio') == N2['id']], 'copia: sin código de soporte, la app no llama a OOOX')
                await a_mejoras(pr); await pr.wait_for_selector('#fCodigo')
                es(await pr.locator('#fMejora').count() == 0 and await pr.locator('.ojo').count() == 0 and await pr.locator('label[for=m_cod]').count() == 1, 'copia: lo primero que pide es el código, y no dice que sea una demo')
                await pr.click('#mCodOk'); await pr.wait_for_selector('#e_mcod')
                es('Escribe el código' in await texto(pr, '#e_mcod') and await pr.evaluate("document.activeElement.id") == 'm_cod', 'copia: sin escribir nada, lo pide')
                await pr.fill('#m_cod', 'codigo-malo'); await pr.click('#mCodOk')
                es(await hasta(pr, "(document.querySelector('#e_mcod')||{}).textContent==='Ese código de soporte no vale. Revísalo.'") and await pr.locator('#fMejora').count() == 0, 'copia: con un código malo, lo dice y no deja pasar')
                es(await pr.evaluate(f"JSON.parse(localStorage.getItem('oficio:{N2['id']}:soporte')||'\"\"')") == '', 'copia: el código malo no se queda guardado')
                await pr.fill('#m_cod', '  Codigo-Bueno-2026 '); await pr.click('#mCodOk')
                es(await hasta(pr, "!!document.querySelector('#fMejora')") and await toast(pr, 'Código guardado'), 'copia: con el bueno, entra y lo dice')
                await escribe(pr, 'mejora', 'Queremos ver los avisos por barrio.'); await envia(pr); await toast(pr, 'Enviada')
                u = srv.de('oficios_enviar')[-1]
                es(u['p_negocio'] == N2['id'] and u['p_clave'] == 'Codigo-Bueno-2026' and await hasta(pr, "document.querySelectorAll('#mPet .pet').length===1"), 'copia: la petición sale con el negocio y el código de esta copia')
                await pr.reload(); await pr.wait_for_selector('#mLista')   # enviada, se queda en «Tus peticiones»
                np = await pr.locator('#mPet .pet').count()
                es(np == 1 and await pr.locator('#fCodigo').count() == 0, 'copia: al volver a abrir no vuelve a pedir el código')
                await pesta(pr, 'novedades'); await hasta(pr, "document.querySelectorAll('#mNov .pet').length===3")
                es(await pr.locator('#mNov .pet').count() == 3 and np == 1, 'copia: ve las novedades generales y solo sus peticiones')
                await pr.click('#mNov [data-a="mOfertas"]')
                es(await hasta(pr, "document.querySelectorAll('#mNov .pet').length===2") and srv.sin_ofertas.get(N2['id']) is True, 'copia: «no quiero ofertas» queda guardado en el servidor')
                await pr.click('[data-a="mCambia"]'); await pr.wait_for_selector('#fCodigo')
                es(await pr.locator('[data-a="mCancela"]').count() == 1, 'copia: se puede cambiar el código, o dejarlo como está')
                await pr.click('[data-a="mCancela"]'); await pr.wait_for_selector('#fMejora,#mLista')
                srv.claves[N2['id']] = 'Codigo-Nuevo-2027'; await avanza(r, 2); await a_mejoras(pr)
                es(await hasta(pr, "!!document.querySelector('#fCodigo')&&(document.querySelector('#e_mcod')||{}).textContent==='Ese código de soporte no vale. Revísalo.'"), 'copia: si OOOX cambia el código, la app lo vuelve a pedir')
                srv.err = 'bloqueo'; await pr.fill('#m_cod', 'Codigo-Nuevo-2027'); await pr.click('#mCodOk')
                es(await hasta(pr, "(document.querySelector('#e_mcod')||{}).textContent.includes('Espera diez minutos')"), 'copia: tras muchos intentos fallidos, dice que hay que esperar')
                srv.err = None; await pr.fill('#m_cod', 'Codigo-Nuevo-2027'); await pr.click('#mCodOk')
                es(await hasta(pr, "!!document.querySelector('#fMejora')"), 'copia: pasado el bloqueo, el código nuevo entra')
            await r.close()

        es(not errores, f'ninguna pantalla da errores en la consola {errores[:5]}')
        webkit_linux.resumen_rarezas()
        await br.close()
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + '.')
    sys.exit(1 if fallos else 0)

asyncio.run(main())
