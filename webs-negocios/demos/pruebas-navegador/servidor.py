# El modo servidor, de pantalla a pantalla: la oficina, dos técnicos y un cliente, cada uno en su navegador, contra el
# servidor local de pruebas (servidor_local.mjs), que lleva el mismo juez que el de verdad. Nada sale a internet.
# No lleva ningún nombre ni precio escrito: lee el negocio del propio servidor de pruebas y vale para cualquier copia.
# Uso: python3 servidor.py [puerto]     (NAVEGADOR=chromium|firefox|webkit)   Antes: node servidor_local.mjs <carpeta> <puerto>
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, sys, json, time, base64, tempfile, urllib.request
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso
from reloj import pon_hora, ms, AHORA

buzon_falso.ACTIVO = False   # aquí /rest/v1/rpc/ es el servidor local; lo que no puede salir es nada hacia el de verdad
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8768
B = f'http://127.0.0.1:{PORT}/'
ok = 0; fallos = []; errores = []

def es(c, txt):
    global ok
    if c: ok += 1
    else: fallos.append(txt); print('  MAL ', txt, flush=True)

def api(ruta, datos=None):
    r = urllib.request.Request(B + ruta, data=None if datos is None else json.dumps(datos).encode(), headers={'content-type': 'application/json'}, method='GET' if datos is None else 'POST')
    return json.load(urllib.request.urlopen(r, timeout=10))
estado = lambda: api('__prueba/estado')
cuenta = lambda: api('__prueba/cuenta')
aviso = lambda i: next((a for a in estado()['avisos'] if a['id'] == i), None)
diario = lambda tipo: [x for x in estado()['diario'] if x['tipo'] == tipo]

# Cada página cuenta sus llamadas al servidor y, si algo intenta salir al servidor de verdad, lo para y lo apunta.
GUARDA = """(()=>{if(window.__n)return;const f=window.fetch;window.__n={v:0,juez:0,fuera:[]};
window.fetch=function(u,o){const s=String(u&&u.url||u);
 if(s.indexOf('supabase.co')>=0){window.__n.fuera.push(s);const fn=s.split('/').pop().split('?')[0];
  return Promise.resolve(new Response(JSON.stringify(fn==='oficios_buzon'?%s:{ok:false,err:'servidor'}),{status:200,headers:{'content-type':'application/json'}}))}
 if(s.indexOf('/rest/v1/rpc/oficios_v')>=0&&s.indexOf('oficios_vista')<0)window.__n.v++;if(s.indexOf('/functions/v1/')>=0)window.__n.juez++;
 return f.apply(this,arguments)}})()""" % json.dumps(buzon_falso.VACIO)

async def contexto(br, movil=True):
    kw = dict(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=(NAV != 'firefox')) if movil else dict(viewport={'width': 1280, 'height': 800})
    ctx = await br.new_context(locale='es-ES', timezone_id='Europe/Madrid', **kw)
    await ctx.add_init_script(GUARDA); await pon_hora(ctx)
    return ctx

async def pagina(ctx, nombre):
    pg = await ctx.new_page()
    pg.on('console', lambda m: errores.append(f'{nombre}: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text and not webkit_linux.es_rareza(m.text) else None)
    pg.on('pageerror', lambda e: errores.append(f'{nombre}! {e}'))
    return pg

async def entra(pg, persona, codigo):
    await pg.goto(B + 'app.html'); await pg.wait_for_selector('#fEntra')
    await pg.select_option('#e_quien', persona); await pg.fill('#e_cod', codigo); await pg.click('#fEntra [type=submit]')
    await pg.wait_for_selector('#nav a')

async def pasa(pg, js, ms_=6000):
    """Espera a que algo sea verdad en la página. Devuelve si llegó a serlo."""
    try: await pg.wait_for_function(js, timeout=ms_); return True
    except Exception: return False

async def firma(pg, sel):
    await pg.locator(sel).scroll_into_view_if_needed()
    bb = await pg.locator(sel).bounding_box(); x, y, w, h = bb['x'], bb['y'], bb['width'], bb['height']
    await pg.mouse.move(x + 20, y + h * .6); await pg.mouse.down()
    for i in range(1, 16): await pg.mouse.move(x + 20 + i * (w - 40) / 16, y + h * (.65 if i % 2 else .3), steps=2)
    await pg.mouse.up(); await pg.wait_for_timeout(150)

ESTA = "id=>!!Oficio.estado().avisos.find(a=>a.id===id)"
def tiene(i, e=None): return f"(()=>{{const a=Oficio.estado().avisos.find(a=>a.id==='{i}');return !!a{'' if e is None else f'&&a.e===' + json.dumps(e)}}})()"

async def main():
    N = api('__prueba/negocio'); COD = api('__prueba/codigos'); T1, T2 = N['tecnicos'][0]['id'], N['tecnicos'][1]['id']
    CP = list(N['zonas']['cp'].keys())[0]; SER = N['serie']
    api('__prueba/reloj', {'desfase': ms(AHORA) - int(time.time() * 1000)})
    print(f"Negocio: {N['nombre']} ({N['id']}), con servidor local · motor {NAV}", flush=True)
    async with async_playwright() as p:
        br = await getattr(p, NAV).launch()
        co = await contexto(br, False); o = await pagina(co, 'oficina')

        # ---------- 1. entrar ----------
        await o.goto(B + 'app.html'); await o.wait_for_selector('#fEntra')
        es(await o.evaluate('Oficio.SRV&&!Oficio.DEMO&&Oficio.sesion()===null'), 'sin haber entrado: la app sabe que va con servidor y no hay sesión')
        es(await o.locator('#nav a').count() == 0 and await o.locator('#quien *').count() == 0 and await o.evaluate('Oficio.estado().avisos.length') == 0, 'sin haber entrado: ni menú ni avisos, solo la pantalla de entrar')
        es(await o.locator('#e_quien option').count() == len(N['tecnicos']) + 1 and 'Entrar' in await o.title(), 'entrar: se elige entre la centralita y cada técnico del negocio')
        c0 = cuenta()['entrar']; await o.click('#fEntra [type=submit]'); await o.wait_for_selector('#e_ecod')
        es('Escribe tu código' in await o.inner_text('#e_ecod') and cuenta()['entrar'] == c0, 'entrar sin código: lo dice sin llamar al servidor')
        await o.fill('#e_cod', 'zzzz-zzzz-zzzz-zzzz'); await o.click('#fEntra [type=submit]'); await pasa(o, "document.querySelector('#e_ecod')&&/no es el de esa persona/.test(document.querySelector('#e_ecod').textContent)")
        es('no es el de esa persona' in await o.inner_text('#e_ecod') and await o.evaluate('Oficio.sesion()===null') and await o.input_value('#e_cod') == 'zzzz-zzzz-zzzz-zzzz', 'código malo: lo dice, no entra y deja lo escrito para corregirlo')
        es(await o.evaluate("document.activeElement.id") == 'e_cod' and await o.get_attribute('#e_cod', 'aria-invalid') == 'true', 'código malo: el cursor vuelve al código y queda marcado para quien no ve la pantalla')
        await o.select_option('#e_quien', T1); await o.fill('#e_cod', COD['oficina']); await o.click('#fEntra [type=submit]'); await pasa(o, "!document.querySelector('#fEntra [type=submit]').disabled&&!!document.querySelector('#e_ecod')")
        es(await o.evaluate('Oficio.sesion()===null') and await o.input_value('#e_quien') == T1, 'el código de la oficina no vale para entrar como técnico')
        await o.fill('#e_cod', 'abcd'); await o.click('#eVer')
        es(await o.get_attribute('#e_cod', 'type') == 'text' and await o.input_value('#e_cod') == 'abcd' and await o.get_attribute('#eVer', 'aria-pressed') == 'true', '«Ver el código» lo enseña sin borrar lo escrito')
        await o.click('#eVer'); es(await o.get_attribute('#e_cod', 'type') == 'password' and await o.input_value('#e_cod') == 'abcd', 'y lo vuelve a ocultar')
        await o.select_option('#e_quien', 'oficina'); await o.fill('#e_cod', '  ' + COD['oficina'].upper().replace('-', ' ') + ' '); await o.click('#fEntra [type=submit]'); await o.wait_for_selector('#nav a')
        es(await o.evaluate("JSON.stringify(Oficio.sesion())") == json.dumps({'rol': 'centralita', 'id': 'oficina', 'persona': 'oficina'}, separators=(',', ':')), 'entrar: el código vale con mayúsculas, espacios y sin guiones')
        es(await o.locator('#nav a').count() >= 2 and 'Centralita' in await o.inner_text('#quien'), 'dentro: el menú de la oficina y arriba, quién ha entrado')
        await o.reload(); await o.wait_for_selector('#nav a')
        es(await o.locator('#fEntra').count() == 0 and await o.evaluate('Oficio.sesion().rol') == 'centralita', 'al recargar sigue dentro: no vuelve a pedir el código')
        await o.click('[data-a=menu]'); await o.wait_for_selector('#mSal'); t = await o.inner_text('dialog[open]')
        es('Tu sesión' in t and 'guardado en el servidor' in t and await o.locator('dialog[open] [data-rol]').count() == 0, 'el menú de arriba es la sesión: no se puede cambiar de papel como en la demo')
        await o.click('dialog[open] [data-x]'); await o.wait_for_timeout(250)

        # ---------- 2. la oficina crea un aviso: el número lo pone el servidor ----------
        await o.goto(B + 'app.html#/nuevo'); await o.wait_for_selector('#fNuevo')
        await o.fill('#n_nombre', 'Marta Prueba'); await o.fill('#n_apellidos', 'Prueba'); await o.fill('#n_tel', '612345678'); await o.fill('#n_dir', 'Calle de la Prueba 1'); await o.fill('#n_cp', CP)
        await o.click('#fNuevo [type=submit]'); await pasa(o, "location.hash.startsWith('#/aviso/')")
        A1 = (await o.evaluate('location.hash')).split('/')[-1]
        es(A1 == SER + '-0001' and aviso(A1) is not None and aviso(A1)['cli']['nombre'] == 'Marta Prueba', f'la oficina crea un aviso y el servidor le pone el número ({A1})')
        es(await o.evaluate(tiene(A1, 'nuevo')) and await o.locator('.tec[data-tec]').count() == len(N['tecnicos']), 'el aviso se abre recién creado, listo para asignar')
        await o.goto(B + 'app.html#/nuevo'); await o.wait_for_selector('#fNuevo'); await o.fill('#n_nombre', 'Sin Teléfono'); await o.fill('#n_apellidos', 'Prueba'); await o.fill('#n_tel', '12'); await o.fill('#n_dir', 'Calle 2'); await o.fill('#n_cp', CP)
        h0 = cuenta()['hacer']; await o.click('#fNuevo [type=submit]'); await pasa(o, "!!document.querySelector('#e_tel')")
        es(await o.locator('#e_tel').count() == 1 and cuenta()['hacer'] == h0 and len(estado()['avisos']) == 1, 'un aviso mal rellenado se corrige en la pantalla: no llega al servidor')

        # ---------- 3. un técnico entra en su móvil ----------
        c2 = await contexto(br); t2 = await pagina(c2, 'técnico 2'); await entra(t2, T2, COD[T2])
        es(await t2.evaluate('Oficio.sesion().rol') == 'tecnico' and await t2.evaluate('Oficio.estado().avisos.length') == 0 and 'No tienes avisos' in await t2.inner_text('#v'), 'el técnico entra con su código y aún no tiene nada')
        es(await t2.locator('#nav a').count() == 2 and await t2.locator('#nav a[href="#/bandeja"]').count() == 0, 'el técnico ve su menú (Hoy y Hechos), no el de la oficina')
        c1 = await contexto(br); t1 = await pagina(c1, 'técnico 1'); await entra(t1, T1, COD[T1])

        # ---------- 4. la oficina asigna y al técnico le llega solo ----------
        await o.goto(B + f'app.html#/aviso/{A1}'); await o.wait_for_selector(f'.tec[data-tec={T2}]'); await o.click(f'.tec[data-tec={T2}]')
        es(await o.evaluate(tiene(A1, 'asignado')), 'asignar se ve al momento en la oficina')
        es(await pasa(t2, tiene(A1, 'asignado')) and await pasa(t2, f"!!document.querySelector('[data-a=voy][data-id=\"{A1}\"]')"), 'al técnico le aparece el aviso sin tocar nada, con su botón «Voy»')
        es(aviso(A1)['tec'] == T2 and await t2.evaluate(f"JSON.stringify(Oficio.estado().avisos.find(a=>a.id==='{A1}').cli)") == json.dumps(aviso(A1)['cli'], separators=(',', ':'), ensure_ascii=False), 'y lo que ve es lo que hay en el servidor')
        await t1.wait_for_timeout(900)
        es(await t1.evaluate('Oficio.estado().avisos.length') == 0 and A1 not in await t1.inner_text('#v'), 'al otro técnico no le llega nada: no es suyo')

        # ---------- 5. sin cobertura y con un cambio de planes: el servidor dice que no, y se avisa ----------
        await c2.set_offline(True)
        await t2.click(f'[data-a=voy][data-id="{A1}"]')
        es(await pasa(t2, tiene(A1, 'camino')) and aviso(A1)['e'] == 'asignado', 'sin cobertura, «Voy» se ve hecho en el móvil aunque no ha llegado al servidor')
        es(await pasa(t2, "Oficio.red().cola===1&&Oficio.red().sinRed&&!document.querySelector('#red').hidden&&/Sin conexión/.test(document.querySelector('#red').textContent)&&/1 cambio por enviar/.test(document.querySelector('#red').textContent)"), 'y la app lo dice: sin conexión, un cambio por enviar')
        await o.goto(B + f'app.html#/aviso/{A1}'); await o.wait_for_selector(f'.tec[data-tec={T1}]'); await o.click(f'.tec[data-tec={T1}]')
        es(await pasa(t1, tiene(A1, 'asignado')), 'mientras, la oficina se lo pasa al otro técnico, y a ese le llega')
        await c2.set_offline(False)
        es(await pasa(t2, f"!Oficio.estado().avisos.find(a=>a.id==='{A1}')&&Oficio.red().cola===0"), 'al volver la cobertura, el servidor rechaza el «Voy» y el aviso desaparece de su móvil')
        es(await pasa(t2, "/No se ha guardado/.test(document.querySelector('#toast').textContent)", 3000) and 'no es tuyo' in await t2.inner_text('#toast'), 'y la app le dice que no se ha guardado y por qué')
        es(await pasa(t2, "document.querySelector('#red').hidden") and aviso(A1)['tec'] == T1 and aviso(A1)['e'] == 'asignado' and len(diario('voy')) == 0, 'en el servidor manda lo que hizo la oficina; el aviso de «sin conexión» se quita')
        await o.click(f'.tec[data-tec={T2}]')
        es(await pasa(t2, tiene(A1, 'asignado')) and await pasa(t1, f"!Oficio.estado().avisos.find(a=>a.id==='{A1}')"), 'la oficina se lo devuelve: vuelve al primero y se le quita al segundo')

        # ---------- 6. el técnico sale y la oficina lo ve ----------
        await t2.goto(B + f'app.html#/aviso/{A1}'); await t2.wait_for_selector('[data-a=voy]'); await t2.click('[data-a=voy]'); await t2.wait_for_selector('[data-a=empezar]')
        es(await pasa(o, tiene(A1, 'camino')) and await pasa(o, "[...document.querySelectorAll('.pill')].some(p=>/De camino/.test(p.textContent))"), '«Voy» del técnico: la oficina lo ve «de camino» sin recargar')

        # ---------- 7. el servidor no contesta: se sigue trabajando y sale cuando vuelve ----------
        api('__prueba/red', {'modo': 'cae'})
        await t2.click('[data-a=empezar]'); await t2.wait_for_selector('#pF'); await t2.wait_for_timeout(250); await firma(t2, '#pF'); await t2.click('#pOk')
        es(await pasa(t2, tiene(A1, 'curso')) and aviso(A1)['e'] == 'camino', 'con el servidor caído, el técnico firma el presupuesto y empieza: en su móvil ya está «trabajando»')
        es(await pasa(t2, "Oficio.red().cola>=1&&!document.querySelector('#red').hidden"), 'y la app avisa de que queda por enviar')
        await t2.reload(); await t2.wait_for_selector('#nav a', state='attached')
        es(await t2.evaluate(tiene(A1, 'curso')) and await t2.evaluate('Oficio.red().cola') >= 1 and await t2.locator('#fEntra').count() == 0, 'recarga la app con el servidor caído: sigue dentro, sigue viendo su trabajo y lo pendiente no se ha perdido')
        api('__prueba/red', {'modo': 'va'})
        es(await pasa(t2, "Oficio.red().cola===0&&document.querySelector('#red').hidden", 14000) and aviso(A1)['e'] == 'curso' and len(diario('empezar')) == 1, 'cuando el servidor vuelve, sale solo, una sola vez, y el aviso se quita')
        es(await pasa(o, tiene(A1, 'curso')), 'y la oficina lo ve trabajando')

        # ---------- 8. la respuesta se pierde por el camino: no se hace dos veces ----------
        await t2.goto(B + f'app.html#/aviso/{A1}'); await t2.wait_for_selector('[data-a=pausa]')
        api('__prueba/pierde', {'n': 1}); await t2.click('[data-a=pausa]')
        es(await pasa(t2, "Oficio.red().cola===0", 14000) and cuenta()['perdidas'] == 1 and len(diario('pausa')) == 1, 'una respuesta perdida: el móvil lo repite y el servidor lo hace una sola vez')
        es(await pasa(o, f"(()=>{{const a=Oficio.estado().avisos.find(a=>a.id==='{A1}');return a&&OficioNucleo.enPausa(a)}})()"), 'la oficina ve la pausa')

        # ---------- 9. el cliente pide cita desde la web ----------
        ck = await contexto(br); k = await pagina(ck, 'cliente'); h0 = cuenta()['huecos']
        await k.goto(B + 'cita.html'); await k.wait_for_selector('#f')
        es(cuenta()['huecos'] == h0 + 1 and await k.locator('[data-dia]').count() >= 3 and await k.locator('[data-fr]:not([disabled])').count() >= 1, 'el cliente ve los días y las franjas libres que da el servidor')
        es(await k.evaluate('Oficio.sesion()') is None and await k.evaluate('Oficio.estado().avisos.length') == 0 and 'quedan' not in await k.inner_text('#f'), 'sin entrar en ningún sitio, sin datos de nadie y sin cifras de la casa')
        foto = tempfile.NamedTemporaryFile(suffix='.png', delete=False); foto.write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==')); foto.close()
        await k.locator('.avc').nth(1).click(); await k.set_input_files('#c_foto', foto.name); await k.wait_for_selector('.fotoz img')
        await k.locator('[data-fr]:not([disabled])').first.click(); DIA = await k.get_attribute('[data-dia][aria-pressed=true]', 'data-dia'); FR = await k.get_attribute('[data-fr][aria-pressed=true]', 'data-fr')
        await k.fill('#c_nombre', 'Lucía Cliente'); await k.fill('#c_apellidos', 'Prueba'); await k.fill('#c_tel', '698765432'); await k.fill('#c_dir', 'Avenida de la Prueba 9, 2.º'); await k.fill('#c_cp', CP)
        await k.click('#f [type=submit]'); await pasa(k, "location.hash.startsWith('#/aviso/')", 9000)
        A2 = (await k.evaluate('location.hash')).split('/')[-1]
        es(A2 == SER + '-0002' and aviso(A2) and aviso(A2)['origen'] == 'cita' and aviso(A2)['cita'] == {'dia': DIA, 'fr': FR, 'ok': True} and aviso(A2)['tec'] == '', f'la cita llega al servidor como cita de la web, sin asignar ({A2})')
        es(await pasa(k, "/Cita pedida/.test(document.querySelector('#v').textContent)") and A2 in await k.inner_text('#v'), 'y el cliente pasa a ver su aviso')
        es(await k.evaluate(f"Oficio.llaveDe('{A2}')") == estado()['llaves'][A2] and len(estado()['llaves'][A2]) == 24, 'su navegador guarda la llave de su aviso')
        await k.reload(); es(await pasa(k, "/Cita pedida/.test(document.querySelector('#v').textContent)"), 'al recargar lo sigue viendo')
        es(await pasa(o, tiene(A2, 'nuevo')), 'a la oficina le aparece la cita nueva sin recargar')
        await o.goto(B + f'app.html#/aviso/{A2}'); await o.wait_for_selector(f'.tec[data-tec={T1}]')
        es(await pasa(o, "!!document.querySelector('#v img[src^=\"data:image\"]')"), 'con la foto que mandó el cliente')
        await o.reload(); await o.wait_for_selector('#nav a')
        es(await pasa(o, "!!document.querySelector('#v img[src^=\"data:image\"]')"), 'la foto no se guarda en el aparato, pero al recargar vuelve del servidor')
        es(await o.evaluate(f"(JSON.parse(localStorage.getItem('oficio:{N['id']}:srv')).B.avisos.find(a=>a.id==='{A2}')||{{}}).foto") == '', 'en el aparato queda el aviso sin la foto')
        await o.click(f'.tec[data-tec={T1}]')
        es(await pasa(k, "/Cita confirmada/.test(document.querySelector('#v').textContent)", 12000) and N['tecnicos'][0]['n'] in await k.inner_text('#v'), 'la oficina la asigna y la página del cliente se pone al día sola, con el nombre de quien irá')
        es(await pasa(t1, tiene(A2, 'asignado')), 'y al técnico le llega')

        # ---------- 10. el enlace del cliente: con la llave se ve; sin ella o con otra, no ----------
        cx = await contexto(br); x = await pagina(cx, 'enlace'); LL = estado()['llaves']
        await x.goto(B + f'cita.html#/aviso/{A2}/{LL[A2]}')
        es(await pasa(x, "/Cita confirmada/.test(document.querySelector('#v').textContent)"), 'con el enlace completo, el aviso se ve en cualquier navegador')
        await x.goto(B + 'cita.html'); await x.wait_for_selector('#f'); await x.goto(B + f'cita.html#/aviso/{A1}/{LL[A2]}')
        es(await pasa(x, "/No encuentro ese aviso/.test(document.querySelector('#v').textContent)") and 'Marta' not in await x.inner_text('body'), 'la llave de un aviso no abre otro')
        cy = await contexto(br); y = await pagina(cy, 'curioso'); await y.goto(B + f'cita.html#/aviso/{A1}')
        es(await pasa(y, "/No encuentro ese aviso/.test(document.querySelector('#v').textContent)") and cuenta()['oficios_vista'] >= 1, 'y sin llave, con solo el número, no se ve nada')
        await y.goto(B + f'cita.html#/aviso/{A1}/' + 'a' * 24); es(await pasa(y, "/No encuentro ese aviso/.test(document.querySelector('#v').textContent)"), 'ni con una llave inventada')
        await cy.close(); await cx.close()

        # ---------- 11. dos pestañas de la oficina ----------
        o2 = await pagina(co, 'oficina, otra pestaña'); await o2.goto(B + 'app.html#/bandeja'); await o2.wait_for_selector('#nav a')
        es(await o2.locator('#fEntra').count() == 0 and await pasa(o2, tiene(A2, 'asignado')), 'otra pestaña del mismo navegador: ya está dentro y al día')
        await o.goto(B + f'app.html#/aviso/{A2}'); await o.wait_for_selector('[data-a=cancelar]'); n0 = len(estado()['diario'])
        await o.click('[data-a=cancelar]'); await o.wait_for_selector('#xOk'); await o.wait_for_timeout(250); await o.click('#xOk')
        es(await pasa(o, tiene(A2, 'cancelado')) and await pasa(o2, tiene(A2, 'cancelado')), 'lo que se hace en una pestaña sale en la otra')
        await o.wait_for_timeout(700)
        es(len(estado()['diario']) == n0 + 1 and aviso(A2)['e'] == 'cancelado', 'y al servidor llega una sola vez')
        es(await pasa(k, "/Cita cancelada/.test(document.querySelector('#v').textContent)", 12000), 'el cliente ve su cita cancelada')
        es(await pasa(t1, f"!Oficio.estado().avisos.find(a=>a.id==='{A2}'&&a.e!=='cancelado')"), 'y al técnico se le quita de pendientes')
        await o2.close()

        # ---------- 12. con la app en segundo plano no se pregunta; al volver, sí ----------
        await t1.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
        await t1.wait_for_timeout(700); v0 = await t1.evaluate('__n.v'); await t1.wait_for_timeout(1500)
        es(await t1.evaluate('__n.v') == v0, 'con la app en segundo plano no se pregunta al servidor')
        await t1.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
        es(await pasa(t1, f'__n.v>{v0}', 3000), 'y al volver a primer plano pregunta enseguida')
        j0 = await o.evaluate('__n.juez'); l0 = cuenta()['leer']; await o.wait_for_timeout(1500)
        es(await o.evaluate('__n.juez') == j0 and await o.evaluate('__n.v') > 0, 'si no ha cambiado nada, solo se pregunta la versión: no se piden los avisos otra vez')

        # ---------- 13. el código se retira ----------
        api('__prueba/persona', {'persona': T2, 'codigo': 'retirado-0000-0000'})
        es(await pasa(t2, "!!document.querySelector('#fEntra')&&Oficio.sesion()===null", 5000) and 'ha dejado de valer' in await t2.inner_text('#v'), 'al retirar el código de un técnico, su app vuelve sola a la pantalla de entrar y dice por qué')
        es(await t2.evaluate(f"localStorage.getItem('oficio:{N['id']}:sesion')") is None and A1 not in await t2.inner_text('body'), 'en su móvil ya no hay sesión ni se ve ningún aviso')
        es(await t2.input_value('#e_quien') == T2, 'la pantalla de entrar recuerda quién usaba este aparato')
        await t2.fill('#e_cod', COD[T2]); await t2.click('#fEntra [type=submit]'); await pasa(t2, "!!document.querySelector('#e_ecod')")
        es(await t2.evaluate('Oficio.sesion()===null') and 'no es el de esa persona' in await t2.inner_text('#e_ecod'), 'el código viejo ya no entra')
        api('__prueba/persona', {'persona': T2, 'codigo': COD[T2]})
        await t2.fill('#e_cod', COD[T2]); await t2.click('#fEntra [type=submit]'); await pasa(t2, "Oficio.sesion()&&document.querySelector('#nav a')", 6000)
        es(await pasa(t2, tiene(A1, 'curso')), 'con un código bueno vuelve a entrar y recupera lo suyo')

        # ---------- 14. cerrar la sesión ----------
        await o.goto(B + 'app.html#/bandeja'); await o.wait_for_selector('[data-a=menu]'); await o.click('[data-a=menu]'); await o.wait_for_selector('#mSal'); await o.wait_for_timeout(250); await o.click('#mSal')
        es(await pasa(o, "!!document.querySelector('#fEntra')") and await o.evaluate(f"localStorage.getItem('oficio:{N['id']}:sesion')===null&&localStorage.getItem('oficio:{N['id']}:srv')===null"), 'cerrar la sesión: vuelve a la pantalla de entrar y no deja nada guardado en el aparato')
        es('Marta' not in await o.inner_text('body') and await o.evaluate('Oficio.estado().avisos.length') == 0, 'y no queda a la vista ningún dato de clientes')
        es(await o.input_value('#e_cod') == '' and await o.input_value('#e_quien') == 'oficina', 'la pantalla de entrar sale limpia: sin el código anterior y con quien usó este aparato')
        # la pantalla se vuelve a pintar sola (cambia la dirección, pasa un minuto): lo elegido y lo escrito no se pueden perder
        await o.select_option('#e_quien', T1); await o.locator('#e_cod').press_sequentially(COD[T1][:9]); await o.locator('h1').first.click()
        await o.evaluate("dispatchEvent(new HashChangeEvent('hashchange'))"); await o.wait_for_timeout(200)
        es(await o.input_value('#e_quien') == T1 and await o.input_value('#e_cod') == COD[T1][:9], 'si la pantalla de entrar se repinta a medias, no se pierde ni quién eres ni lo que llevabas escrito')
        await o.locator('#e_cod').press('End'); await o.locator('#e_cod').press_sequentially(COD[T1][9:]); await o.evaluate("dispatchEvent(new HashChangeEvent('hashchange'))")
        es(await o.input_value('#e_cod') == COD[T1] and await o.evaluate("document.activeElement.id") != '', 'ni con el código entero ya escrito')
        await o.click('#fEntra [type=submit]'); await pasa(o, "Oficio.sesion()&&document.querySelector('#nav a')", 8000)
        pista = await o.evaluate("JSON.stringify({sesion:Oficio.sesion(),quien:(document.querySelector('#e_quien')||{}).value,error:(document.querySelector('#e_ecod')||{}).textContent,red:Oficio.red()})")
        es(await o.evaluate('!!Oficio.sesion()') and await o.evaluate(f"Oficio.estado().avisos.every(a=>a.tec==='{T1}')") and await o.evaluate('Oficio.sesion().rol') == 'tecnico', f'en ese mismo navegador entra un técnico y solo recibe lo suyo {pista}')

        # ---------- 15. al final, todo cuadra ----------
        E = estado()
        es([x['v'] for x in E['diario']] == list(range(1, len(E['diario']) + 1)) and E['v'] == len(E['diario']), 'el diario del servidor tiene las versiones seguidas, sin huecos ni repetidas')
        marcas = [x['clave'] for x in E['diario'] if x['clave']]
        es(len(set(marcas)) == len(marcas) and len(marcas) >= 8, 'ninguna acción está dos veces en el diario')
        suyo = await t2.evaluate("JSON.stringify(Oficio.estado().avisos.map(a=>a.id+':'+a.e+':'+a.v))")
        es(json.loads(suyo) == [f"{a['id']}:{a['e']}:{a['v']}" for a in E['avisos'] if a['tec'] == T2], 'lo que ve el técnico es exactamente lo suyo en el servidor')
        fuera = []
        for pg in (o, t1, t2, k): fuera += await pg.evaluate('__n.fuera')
        es(all('/functions/' not in u and 'oficios_v' not in u for u in fuera), f'ninguna pantalla ha intentado hablar con el servidor de verdad {[u for u in fuera if "/functions/" in u][:2]}')
        es(not errores, f'sin errores de consola {errores[:3]}')
        await br.close()
    webkit_linux.resumen_rarezas() if hasattr(webkit_linux, 'resumen_rarezas') else None
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + ' · modo servidor, cuatro navegadores a la vez')
    sys.exit(1 if fallos else 0)

asyncio.run(main())
