# El modo servidor, de pantalla a pantalla: la oficina, dos técnicos y un cliente, cada uno en su navegador, contra el
# servidor local de pruebas (servidor_local.mjs), que lleva el mismo juez que el de verdad. Nada sale a internet.
# No lleva ningún nombre ni precio escrito: lee el negocio del propio servidor de pruebas y vale para cualquier copia.
# Uso: python3 servidor.py [puerto]     (NAVEGADOR=chromium|firefox|webkit)   Antes: node servidor_local.mjs <carpeta> <puerto>
import os
NAV = os.environ.get('NAVEGADOR', 'chromium')
import asyncio, re, sys, json, time, base64, tempfile, urllib.request, urllib.parse
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
        await o.click('#fNuevo [data-b-av]'); await o.click('[data-b-cu="urg"]')
        await o.fill('#n_nomap', 'Marta Prueba'); await o.fill('#n_tel', '612345678'); await o.fill('#n_dir', 'Calle de la Prueba 1'); await o.fill('#n_cp', CP)
        await o.click('#fNuevo [type=submit]'); await pasa(o, "location.hash.startsWith('#/aviso/')")
        A1 = (await o.evaluate('location.hash')).split('/')[-1]
        es(A1 == SER + '-0001' and aviso(A1) is not None and aviso(A1)['cli']['nombre'] == 'Marta' and aviso(A1)['cli']['apellidos'] == 'Prueba', f'la oficina crea un aviso y el servidor le pone el número ({A1})')
        es(await o.evaluate(tiene(A1, 'nuevo')) and await o.locator('.tec[data-tec]').count() == len(N['tecnicos']), 'el aviso se abre recién creado, listo para asignar')
        await o.goto(B + 'app.html#/nuevo'); await o.wait_for_selector('#fNuevo'); await o.click('#fNuevo [data-b-av]'); await o.click('[data-b-cu="urg"]'); await o.fill('#n_nomap', 'Sin Teléfono'); await o.fill('#n_tel', '12'); await o.fill('#n_dir', 'Calle 2'); await o.fill('#n_cp', CP)
        h0 = cuenta()['hacer']; await o.click('#fNuevo [type=submit]'); await pasa(o, "!!document.querySelector('#e_tel')")
        es(await o.locator('#e_tel').count() == 1 and cuenta()['hacer'] == h0 and len(estado()['avisos']) == 1, 'un aviso mal rellenado se corrige en la pantalla: no llega al servidor')

        # ---------- 3. un técnico entra en su móvil ----------
        c2 = await contexto(br); t2 = await pagina(c2, 'técnico 2'); await entra(t2, T2, COD[T2])
        es(await t2.evaluate('Oficio.sesion().rol') == 'tecnico' and await t2.evaluate('Oficio.estado().avisos.length') == 0 and 'No tienes avisos' in await t2.inner_text('#v'), 'el técnico entra con su código y aún no tiene nada')
        es(await t2.locator('#nav a').count() == 3 and await t2.locator('#nav a[href="#/furgo"]').count() == 1 and await t2.locator('#nav a[href="#/bandeja"]').count() == 0, 'el técnico ve su menú (Hoy, Hechos y Furgoneta), no el de la oficina')
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
        es(await pasa(t2, "!/Sin conexión/.test(document.querySelector('#red').textContent)") and aviso(A1)['tec'] == T1 and aviso(A1)['e'] == 'asignado' and len(diario('voy')) == 0, 'en el servidor manda lo que hizo la oficina; el aviso de «sin conexión» se quita')
        # lo que no se pudo guardar no se pierde con el aviso de unos segundos (16-11-2026): queda dicho arriba y en «Tu sesión» hasta que se lee
        es(await pasa(t2, "Oficio.red().rech===1&&!document.querySelector('#red').hidden&&/1 cambio no se pudo guardar/.test(document.querySelector('#red').textContent)"), 'y arriba queda dicho que un cambio no se pudo guardar')
        await t2.click('[data-a=menu]'); await t2.wait_for_selector('#mRech'); tr = await t2.inner_text('#mRech')
        es('No se pudo guardar' in tr and 'Voy' in tr and A1 in tr, f'en «Tu sesión», qué fue y de qué aviso ({tr[:160]})')
        await t2.click('#mRechNo')
        es(await pasa(t2, "Oficio.red().rech===0&&document.querySelector('#red').hidden&&!document.querySelector('dialog[open]')"), 'al leerlo, la lista se borra y el aviso de arriba se quita')
        es(await t2.evaluate("Oficio.red().datos===false") and await o.evaluate("Oficio.red().datos===false"), 'los datos del negocio de la app y los del servidor son los mismos: no sale el aviso de datos distintos')
        # si alguien cambia un precio en el servidor y no en la app (o al revés), «Tu sesión» lo dice
        P10 = api('__prueba/precio', {'mas': 1})['p10']; await o.reload(); await o.wait_for_selector('[data-a=menu]')
        es(await pasa(o, "Oficio.red().datos===true"), 'con un precio distinto en el servidor, la app se da cuenta (al abrirse, y con cada cambio que lee o manda)')
        # y desde el 16-11-2026 hace las cuentas con los datos del servidor, que le da al ver que su huella ha cambiado
        PRIMERO = "(()=>{const c=Oficio.N.catalogo;return c[Object.keys(c)[0]].p10})()"
        es(await pasa(o, f'{PRIMERO}==={P10}') and f'"p10":{P10}' in (await o.evaluate(f"localStorage.getItem('oficio:{N['id']}:datos')") or ''),
           'y hace las cuentas con los datos del servidor, que guarda en el aparato para abrir sin red')
        await o.click('[data-a=menu]'); await o.wait_for_selector('#mSal')
        es(await o.locator('#mDatos').count() == 1 and 'no son los del servidor' in await o.inner_text('#mDatos'), 'y en «Tu sesión» dice que avise a OOOX')
        await o.keyboard.press('Escape'); api('__prueba/precio', {'mas': -1}); await o.reload(); await o.wait_for_selector('[data-a=menu]')
        es(await pasa(o, "Oficio.red().datos===false") and await o.locator('#mDatos').count() == 0, 'vuelve a ser el mismo precio: el aviso se quita')
        es(await pasa(o, f'{PRIMERO}==={P10 - 1}'), 'y vuelve a hacer las cuentas con el precio de siempre')
        await o.click(f'.tec[data-tec={T2}]')
        es(await pasa(t2, tiene(A1, 'asignado')) and await pasa(t1, f"!Oficio.estado().avisos.find(a=>a.id==='{A1}')"), 'la oficina se lo devuelve: vuelve al primero y se le quita al segundo')

        # ---------- 6. el técnico sale y la oficina lo ve ----------
        await t2.goto(B + f'app.html#/aviso/{A1}'); await t2.wait_for_selector('[data-a=voy]'); await t2.click('[data-a=voy]'); await t2.wait_for_selector('[data-a=empezar]')
        es(await pasa(o, tiene(A1, 'camino')) and await pasa(o, "[...document.querySelectorAll('.pill')].some(p=>/De camino/.test(p.textContent))"), '«Voy» del técnico: la oficina lo ve «de camino» sin recargar')

        # ---------- 7. el servidor no contesta: se sigue trabajando y sale cuando vuelve ----------
        api('__prueba/red', {'modo': 'cae'})
        await t2.click('[data-a=empezar]'); await t2.wait_for_selector('#pF'); await t2.wait_for_timeout(250); await firma(t2, '#pF')
        if await t2.locator('#pPide').count(): await t2.click('#pPide')   # con cita, el cliente marca que quiere que se haga ya
        await t2.click('#pOk')
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
        # (los avisos que suenan, 16-11-2026: en la oficina y en el técnico, encendidos; cada aviso que suena se cuenta)
        for pg_ in (o, t1):
            await pg_.evaluate(f"localStorage.setItem('oficio:{N['id']}:avisar','1');window.__pitos=0;document.addEventListener('oficio:avisa',()=>{{window.__pitos++}})")
        ck = await contexto(br); k = await pagina(ck, 'cliente'); h0 = cuenta()['huecos']
        await k.goto(B + 'cita.html'); await k.wait_for_selector('#f')
        es(cuenta()['huecos'] == h0 + 1 and await k.locator('[data-dia]').count() >= 3 and await k.locator('[data-fr]:not([disabled])').count() >= 1, 'el cliente ve los días y las franjas libres que da el servidor')
        es(await k.evaluate('Oficio.sesion()') is None and await k.evaluate('Oficio.estado().avisos.length') == 0 and 'quedan' not in await k.inner_text('#f'), 'sin entrar en ningún sitio, sin datos de nadie y sin cifras de la casa')
        foto = tempfile.NamedTemporaryFile(suffix='.png', delete=False); foto.write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==')); foto.close()
        await k.locator('.avc').nth(1).click(); await k.set_input_files('#c_foto', foto.name); await k.wait_for_selector('.fotoz img')
        await k.locator('[data-fr]:not([disabled])').first.click(); DIA = await k.get_attribute('[data-dia][aria-checked=true]', 'data-dia'); FR = await k.get_attribute('[data-fr][aria-checked=true]', 'data-fr')
        await k.fill('#c_nomap', 'Lucía Cliente'); await k.fill('#c_tel', '698765432'); await k.fill('#c_dir', 'Avenida de la Prueba 9, 2.º'); await k.fill('#c_cp', CP)
        await k.click('#f [type=submit]'); await k.wait_for_selector('#rConfirma'); await k.click('#rConfirma'); await pasa(k, "location.hash.startsWith('#/aviso/')", 9000)
        A2 = (await k.evaluate('location.hash')).split('/')[-1]
        es(A2 == SER + '-0002' and aviso(A2) and aviso(A2)['origen'] == 'cita' and aviso(A2)['cita'] == {'dia': DIA, 'fr': FR, 'ok': True} and aviso(A2)['tec'] == '', f'la cita llega al servidor como cita de la web, sin asignar ({A2})')
        es(await pasa(k, "/Cita pedida/.test(document.querySelector('#v').textContent)") and A2 in await k.inner_text('#v'), 'y el cliente pasa a ver su aviso')
        es(await k.evaluate(f"Oficio.llaveDe('{A2}')") == estado()['llaves'][A2] and len(estado()['llaves'][A2]) == 24, 'su navegador guarda la llave de su aviso')
        await k.reload(); es(await pasa(k, "/Cita pedida/.test(document.querySelector('#v').textContent)"), 'al recargar lo sigue viendo')
        es(await pasa(o, tiene(A2, 'nuevo')), 'a la oficina le aparece la cita nueva sin recargar')
        # suena; y lo dice: con la pantalla a la vista, en un aviso de abajo; en segundo plano, con la cuenta en el título de la pestaña
        DICE = lambda txt: f"window.__pitos===1&&(document.hidden?/^\\(1\\) /.test(document.title):document.querySelector('#toast').textContent.includes({json.dumps(txt)}))"
        es(await pasa(o, DICE('Aviso nuevo: ' + A2)), 'con los avisos encendidos, le suena y lo dice')
        await o.click('[data-a=menu]'); await o.wait_for_selector('#mAvi')
        es('Suena cuando entra un aviso nuevo' in await o.inner_text('#mAvi') and await o.inner_text('#mAviB') == 'Apagar', 'en «Tu sesión» se ve que están encendidos, con el botón para apagarlos')
        await o.keyboard.press('Escape')
        await o.goto(B + f'app.html#/aviso/{A2}'); await o.wait_for_selector(f'.tec[data-tec={T1}]')
        FOTO_VISTA = "[...document.querySelectorAll('#v img')].some(i=>/^data:image\\/(jpeg|png|webp)/.test(i.getAttribute('src')||''))"   # la foto de verdad, no el hueco mientras llega
        es(await pasa(o, FOTO_VISTA), 'con la foto que mandó el cliente (se pide al servidor al verla)')
        await o.reload(); await o.wait_for_selector('#nav a')
        es(await pasa(o, FOTO_VISTA), 'la foto no se guarda en el aparato, pero al recargar vuelve del servidor')
        fo = await o.evaluate(f"(JSON.parse(localStorage.getItem('oficio:{N['id']}:srv')).B.avisos.find(a=>a.id==='{A2}')||{{}}).foto")
        es(bool(re.fullmatch(r'f:[0-9a-f]{16}', fo or '')) and estado()['fotos'] >= 1, f'en el aparato queda solo la referencia de la foto; la foto está en el servidor ({fo})')
        await o.click(f'.tec[data-tec={T1}]')
        es(await pasa(k, "/Cita confirmada/.test(document.querySelector('#v').textContent)", 12000) and N['tecnicos'][0]['n'] in await k.inner_text('#v'), 'la oficina la asigna y la página del cliente se pone al día sola, con el nombre de quien irá')
        es(await pasa(t1, tiene(A2, 'asignado')), 'y al técnico le llega')
        es(await pasa(t1, DICE('Te han asignado ' + A2)), 'y, con los avisos encendidos, le suena y lo dice')
        es(await o.evaluate("window.__pitos===undefined||window.__pitos<=1"), 'a la oficina no le suena lo que hace ella misma')

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

        # ---------- 10 bis. la zona del cliente: la oficina le da su código y el cliente entra con él ----------
        await o.goto(B + f'app.html#/aviso/{A1}'); await o.wait_for_selector('[data-a=zona]'); a0 = cuenta()['acceso']; await o.click('[data-a=zona]')
        es(await pasa(o, "!!document.querySelector('#zWa')") and cuenta()['acceso'] == a0 + 1, 'oficina: «Su zona» pide el código al servidor y prepara el mensaje')
        C1 = (api('__prueba/clientes').get('612345678') or {}).get('codigo', ''); ZONA = f'cliente.html#/entra/612345678/{C1}'
        txt = await o.inner_text('dialog[open] .wa'); wa = await o.get_attribute('#zWa', 'href')
        es(len(C1) == 9 and await o.inner_text('#zCod') == C1 and C1 in txt and ZONA in txt, 'el mensaje lleva el enlace de su zona y su código, el que guarda el servidor')
        es(wa.startswith('https://wa.me/34612345678?text=') and ZONA in urllib.parse.unquote(wa.split('text=', 1)[1]), '«Abrir WhatsApp» lleva ese mensaje al teléfono del cliente')
        await o.click('dialog[open] [data-x]'); await o.wait_for_timeout(250); await o.click('[data-a=zona]'); await pasa(o, "!!document.querySelector('#zCod')")
        es(await o.inner_text('#zCod') == C1 and 'ya tenía' in await o.inner_text('#zNota'), 'si la oficina lo vuelve a abrir, es el mismo código: se lo puede mandar otra vez')
        await o.click('dialog[open] [data-x]'); await o.wait_for_timeout(250)
        # una foto del trabajo en su aviso (16-11-2026: las fotos van aparte y se piden al verlas)
        await o.evaluate(f"Oficio.hacer({{tipo:'anotar',id:'{A1}',foto:'data:image/jpeg;base64,'+'E'.repeat(400)}},{{rol:'centralita',id:'oficina'}})")
        es(await pasa(o, f"Oficio.red().cola===0&&(Oficio.estado().avisos.find(a=>a.id==='{A1}').fotos||[]).some(f=>/^f:[0-9a-f]{{16}}$/.test(f))", 9000), 'la oficina añade una foto del trabajo: al servidor le llega aparte y el aviso lleva su referencia')
        REF = await o.evaluate(f"(Oficio.estado().avisos.find(a=>a.id==='{A1}').fotos||[]).find(f=>/^f:/.test(f))||''")
        cz = await contexto(br); z = await pagina(cz, 'zona del cliente')
        await z.goto(B + ZONA)
        es(await pasa(z, "!!document.querySelector('#salir')", 9000) and z.url.endswith('#/') and C1 not in z.url, 'el cliente abre el enlace del mensaje: entra solo y el código no se queda en la barra')
        t = await z.inner_text('#v')
        es(t.startswith('Hola, Marta') and A1 in t and A2 not in t and 'Lucía' not in t, 'en su zona ve su aviso y nada de otro cliente')
        es(await z.evaluate(f"JSON.parse(localStorage.getItem('oficio:{N['id']}:cliente')).tel") == '612345678', 'la sesión se queda en su navegador')
        await z.evaluate(f"Oficio.fotoSrc('{REF}',{{tel:'612345678',codigo:'{C1}'}})")
        es(REF and await pasa(z, f"/^data:image\\/jpeg/.test(Oficio.fotoSrc('{REF}',{{tel:'612345678',codigo:'{C1}'}}))"), 'en su zona, la foto de su aviso se pide al servidor con su teléfono y su código, y llega')
        LLV = estado()['llaves'][A1]
        es(await z.get_attribute(f"a.tj[href^='cita.html#/aviso/{A1}/']", 'href') == f'cita.html#/aviso/{A1}/{LLV}', 'la tarjeta de su aviso lleva el enlace con su llave')
        await z.click(f"a.tj[href^='cita.html#/aviso/{A1}/']")
        es(await pasa(z, f"location.pathname.endsWith('cita.html')&&document.querySelector('#v').textContent.includes('{A1}')&&!/No encuentro|Buscando/.test(document.querySelector('#v').textContent)", 9000), 'y con ella abre la página de su aviso, en directo')
        await z.goto(B + 'cliente.html'); await z.wait_for_selector('#salir'); await pasa(z, "document.querySelector('#v').textContent.startsWith('Hola')"); await z.wait_for_timeout(3300)
        # lo que pidió su sesión y llega cuando ya ha salido (esa vez el servidor tarda en contestar) no debe valer. Al volver
        # a la página, la zona pide lo suyo otra vez; se sale mientras esa respuesta viene de camino
        api('__prueba/red', {'modo': 'va', 'lento': 2500}); await z.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await z.wait_for_timeout(400); api('__prueba/red', {'modo': 'va', 'lento': 0})
        await z.click('#salir'); await z.wait_for_selector('#fE')
        es(await z.evaluate(f"localStorage.getItem('oficio:{N['id']}:cliente')") is None, 'salir: vuelve a pedir el código y no queda nada guardado')
        await z.fill('#z_tel', '612345678'); await z.fill('#z_cod', 'zzzz-zzzz'); await z.click('#fE [type=submit]')
        es(await pasa(z, "!!document.querySelector('.campo.mal #z_cod')") and 'no van juntos' in await z.inner_text('#fE') and await z.evaluate("document.activeElement.id") == 'z_cod', 'un código que no es: no entra, lo dice en su campo y deja el cursor ahí')
        await z.wait_for_timeout(2600)
        es(await z.evaluate("document.activeElement.id") == 'z_cod' and 'no van juntos' in await z.inner_text('#fE') and await z.input_value('#z_cod') == 'zzzz-zzzz',
           'lo de su sesión que llega tarde, cuando ya ha salido, ni se enseña ni le quita el cursor del campo')
        await z.fill('#z_tel', '612 34 56 78'); await z.fill('#z_cod', ' ' + C1.upper().replace('-', ' ') + ' '); await z.click('#fE [type=submit]')
        es(await pasa(z, "!!document.querySelector('#salir')"), 'con el código en mayúsculas y con espacios, y el teléfono con espacios, entra')
        # la oficina cambia el código: el de antes deja de valer
        await o.click('[data-a=zona]'); await pasa(o, "!!document.querySelector('#zCambia')"); await o.click('#zCambia')
        es('dejará de valer' in await o.inner_text('#zNota') and api('__prueba/clientes')['612345678']['codigo'] == C1, 'cambiar el código pide confirmarlo, y hasta entonces no cambia nada')
        await o.click('#zCambia'); await pasa(o, f"!!document.querySelector('#zCod')&&document.querySelector('#zCod').textContent!=='{C1}'")
        C2 = api('__prueba/clientes')['612345678']['codigo']
        es(C2 != C1 and await o.inner_text('#zCod') == C2 and 'Código cambiado' in await o.inner_text('#zNota'), 'cambiado: la oficina ve el código nuevo, listo para mandarlo')
        await o.click('dialog[open] [data-x]'); await o.wait_for_timeout(250)
        await z.wait_for_timeout(3200); await z.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        es(await pasa(z, "!!document.querySelector('#fE')&&/ha dejado de valer/.test(document.querySelector('#fE').textContent)", 8000) and await z.evaluate(f"localStorage.getItem('oficio:{N['id']}:cliente')") is None, 'al cliente, al volver a su zona, el código viejo ya no le vale: sale y se le dice por qué')
        await z.goto(B + ZONA)
        es(await pasa(z, "/no van juntos/.test(document.querySelector('#fE').textContent)") and await z.locator('#salir').count() == 0, 'el enlace viejo tampoco entra')
        await z.goto(B + f'cliente.html#/entra/612345678/{C2}')
        es(await pasa(z, "!!document.querySelector('#salir')"), 'con el código nuevo, sí')
        # ---------- 10 ter. los contratos con servidor: la oficina los da de alta; los técnicos no los reciben; el cliente los ve ----------
        if await o.evaluate('Object.keys(Oficio.cfg.planes||{}).length>0'):
            await o.goto(B + 'app.html#/contratos'); await o.wait_for_selector('.cab [data-a=conAlta]')
            await o.click('.cab [data-a=conAlta]'); await o.wait_for_selector('#caF')
            for cam, val in (('nomap', 'Marta Prueba'), ('tel', '612345678'), ('dir', 'C/ del Contrato 1'), ('cp', list(N['zonas']['cp'].keys())[0])):
                await o.fill('#ca_' + cam, val)
            await o.click('[data-ca=mensaje]'); await o.click('#caM [data-modo=tarjeta]'); await o.click('button[form=caF]')
            es(await pasa(o, "!!document.querySelector('.papel.doc')&&/Contrato de mantenimiento/.test(document.querySelector('.papel.doc').textContent)", 9000), 'la oficina da de alta un contrato por el servidor y ve su papel')
            st = estado(); cs = st['cab'].get('contratos') or []
            es(len(cs) == 1 and cs[0]['cli']['tel'] == '612345678' and cs[0]['per'][0]['pago']['cobrado'] and st['cab'].get('vc') == st['v'], 'el servidor lo guarda con lo de la oficina')
            es(await pasa(t1, "Oficio.estado().contratos.length===0") and await pasa(t2, "Oficio.estado().contratos.length===0"), 'los técnicos no reciben los contratos')
            await z.reload(); es(await pasa(z, "!!document.querySelector('#cons a.tj')", 9000), 'el cliente lo ve en su zona')
        # ---------- 10 quater. la furgoneta con servidor (16-11-2026): el técnico lleva la cuenta en su móvil; le llega a la oficina, y al otro técnico, no ----------
        mat = await t1.evaluate("Object.keys(Oficio.cfg.cat).find(k=>Oficio.cfg.cat[k].mat)||''")
        if mat:
            await t1.goto(B + 'app.html#/furgo'); await t1.wait_for_selector('#fgNo [data-a=fSi]')
            await t1.click('#fgNo [data-a=fSi]'); await t1.wait_for_selector('#fzF')
            await t1.fill('#fz_' + mat, '5'); await t1.click('button[form=fzF]')
            es(await pasa(t1, f"(()=>{{const F=(Oficio.estado().furgos||{{}})['{T1}'];return !!F&&F.on&&F.st['{mat}']===5}})()"), 'el técnico lleva la cuenta de su furgoneta en el móvil y lo ve al momento')
            ok_srv = False
            for _ in range(40):
                F = (estado()['cab'].get('furgos') or {}).get(T1)
                if F and F.get('on') and F['st'].get(mat) == 5 and len(diario('furgo')) >= 2: ok_srv = True; break
                await asyncio.sleep(0.25)
            es(ok_srv, 'el servidor la guarda, con lo que contó')
            es(await pasa(o, f"(()=>{{const F=(Oficio.estado().furgos||{{}})['{T1}'];return !!F&&F.st['{mat}']===5}})()", 9000), 'a la oficina le llega sola')
            await o.goto(B + f'app.html#/furgo/{T1}'); await o.wait_for_selector('#fgSt')
            es('5' in await o.inner_text('#fgSt') and await o.locator('#fgSt [data-a=fCargar]').count() == 1, 'la oficina abre su furgoneta y puede apuntar lo que carga')
            await t2.wait_for_timeout(900)
            es(await t2.evaluate(f"!(Oficio.estado().furgos||{{}})['{T1}']"), 'al otro técnico no le llega la furgoneta de su compañero')
        # un técnico no da códigos
        await t1.goto(B + f'app.html#/aviso/{A2}'); await t1.wait_for_selector('#nav a', state='attached'); await pasa(t1, f"document.querySelector('#v').textContent.includes('{A2}')")
        es(await t1.locator('[data-a=zona]').count() == 0 and await t1.evaluate("Oficio.acceso('698765432').then(r=>r.err)") == 'permiso', 'un técnico no tiene «Su zona» y, si lo pide igualmente, el servidor no le da el código')
        # el freno: diez códigos fallados con un teléfono
        cz2 = await contexto(br); z2 = await pagina(cz2, 'zona, intentos'); await z2.goto(B + 'cliente.html'); await z2.wait_for_selector('#fE')
        for i in range(10): await z2.evaluate(f"Oficio.perfil('698765432','zzzz-zz{'abcdefghjk'[i]}a')")
        await z2.fill('#z_tel', '698765432'); await z2.fill('#z_cod', 'zzzz-zzzz'); await z2.click('#fE [type=submit]')
        es(await pasa(z2, "/Demasiados intentos/.test(document.querySelector('#fE').textContent)"), 'tras diez códigos fallados con un teléfono, se dice que espere')
        await cz2.close()

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

        # ---------- 13 bis. el equipo y sus accesos, desde la app (la oficina o el técnico que es el dueño) ----------
        async def abre_equipo(pg):
            # sin recargar la página: un goto a la misma dirección la recarga y WebKit da por error lo que estaba pidiendo
            await pg.evaluate("location.hash='#/'"); await pg.wait_for_selector('[data-a=menu]'); await pg.click('[data-a=menu]'); await pg.wait_for_selector('#mEq'); await pg.wait_for_timeout(250); await pg.click('#mEq')
            return await pasa(pg, "document.querySelectorAll('.eqf').length>0", 8000)
        fila = lambda p: f".eqf[data-p='{p}']"
        es(await abre_equipo(o) and await o.locator('.eqf').count() == len(N['tecnicos']) + 1, 'la oficina abre «Equipo y accesos» y ve a la centralita y a cada técnico')
        es('Puede entrar' in await o.inner_text(fila(T2)) and await o.locator(fila('oficina') + ' [data-hace=baja]').count() == 0, 'cada uno con su estado; la oficina no tiene cómo quitarse el acceso a sí misma')
        await o.click(fila(T2) + ' [data-hace=codigo]'); es('Sí, darle un código nuevo' in await o.inner_text(fila(T2)), 'dar un código nuevo pide confirmarlo')
        await o.click(fila(T2) + ' [data-hace=codigo]')
        es(await pasa(o, "!!document.querySelector('#eqCod')"), 'el código nuevo sale en pantalla, una sola vez')
        nuevo = (await o.inner_text('#eqCod')).strip()
        es(re.fullmatch(r'[a-z0-9]{4}(-[a-z0-9]{4}){3}', nuevo) is not None, 'con la forma de siempre: cuatro grupos de cuatro')
        es(await pasa(t2, "!!document.querySelector('#fEntra')&&Oficio.sesion()===null", 8000), 'el móvil del técnico vuelve solo a la pantalla de entrar: el código de antes ya no vale')
        await t2.fill('#e_cod', nuevo); await t2.click('#fEntra [type=submit]')
        es(await pasa(t2, "!!Oficio.sesion()&&!!document.querySelector('#nav a')", 8000), 'y entra con el código nuevo')
        await o.click('#eqCopia') if await o.locator('#eqCopia').count() else None
        await o.locator('dialog[open] [data-x]').last.click()
        es(await abre_equipo(o), 'se vuelve a abrir el equipo')
        await o.click(fila(T2) + ' [data-hace=baja]'); await o.click(fila(T2) + ' [data-hace=baja]')
        es(await pasa(o, f"/Acceso quitado/.test((document.querySelector(\"{fila(T2)}\")||{{}}).textContent||'')", 8000), 'quitar el acceso: se ve quitado')
        es(await pasa(t2, "!!document.querySelector('#fEntra')&&Oficio.sesion()===null", 8000), 'y la app del técnico se cierra sola')
        await t2.fill('#e_cod', nuevo); await t2.click('#fEntra [type=submit]'); await pasa(t2, "!!document.querySelector('#e_ecod')")
        es(await t2.evaluate('Oficio.sesion()===null'), 'ya no puede entrar ni con su último código')
        es('quitó el acceso' in await o.inner_text('.eqh') and 'dio un código' in await o.inner_text('.eqh'), 'queda apuntado en «Lo último», sin ningún código')
        es(nuevo not in await o.inner_text('#eqB'), 'el código no vuelve a salir en el equipo')
        await o.locator('dialog[open] [data-x]').last.click()
        # el dueño, aunque entre como técnico, también lleva el equipo; un técnico que no es el dueño, no
        jefe = next((t['id'] for t in N['tecnicos'] if t.get('jefe')), None)
        if jefe:
            cj = await contexto(br); j = await pagina(cj, 'dueño'); await entra(j, jefe, COD[jefe])
            es(await abre_equipo(j) and await j.locator(fila(jefe) + ' [data-hace=baja]').count() == 0, 'el técnico que es el dueño también lleva el equipo (y tampoco puede quitarse el acceso a sí mismo)')
            await cj.close()
        api('__prueba/persona', {'persona': T2, 'codigo': COD[T2]})
        await t2.fill('#e_cod', COD[T2]); await t2.click('#fEntra [type=submit]'); await pasa(t2, "Oficio.sesion()&&document.querySelector('#nav a')", 8000)
        await t2.click('[data-a=menu]'); await t2.wait_for_selector('#mSal')
        es(await t2.locator('#mEq').count() == (1 if T2 == jefe else 0), 'un técnico que no es el dueño no ve «Equipo y accesos»')
        await t2.locator('dialog[open] [data-x]').last.click()
        es(await pasa(t2, tiene(A1, 'curso')), 'el técnico, con su código de vuelta, recupera lo suyo')

        # ---------- 14. cerrar la sesión ----------
        await o.goto(B + 'app.html#/bandeja'); await o.wait_for_selector('[data-a=menu]'); await o.click('[data-a=menu]'); await o.wait_for_selector('#mSal'); await o.wait_for_timeout(250); await o.click('#mSal')
        es(await pasa(o, "!!document.querySelector('#fEntra')") and await o.evaluate(f"localStorage.getItem('oficio:{N['id']}:sesion')===null&&localStorage.getItem('oficio:{N['id']}:srv')===null"), 'cerrar la sesión: vuelve a la pantalla de entrar y no deja nada guardado en el aparato')
        es('Marta' not in await o.inner_text('body') and await o.evaluate('Oficio.estado().avisos.length') == 0, 'y no queda a la vista ningún dato de clientes')
        es(await o.evaluate(f"localStorage.getItem('oficio:{N['id']}:datos')===null"), 'ni los datos del negocio que le dio el servidor (el equipo es de dentro)')
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
        for pg in (o, t1, t2, k, z): fuera += await pg.evaluate('__n.fuera')
        es(all('/functions/' not in u and 'oficios_v' not in u for u in fuera), f'ninguna pantalla ha intentado hablar con el servidor de verdad {[u for u in fuera if "/functions/" in u][:2]}')
        es(not errores, f'sin errores de consola {errores[:3]}')
        await br.close()
    webkit_linux.resumen_rarezas() if hasattr(webkit_linux, 'resumen_rarezas') else None
    print(('MAL' if fallos else 'BIEN') + f': {ok} comprobaciones pasan' + (f', {len(fallos)} fallan' if fallos else '') + ' · modo servidor, cuatro navegadores a la vez')
    sys.exit(1 if fallos else 0)

asyncio.run(main())
