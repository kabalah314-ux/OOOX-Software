# La demo vacía y su recorrido (26-11-2026). La demo pública arranca sin avisos: quien la ve crea el suyo, lo reparte, lo cierra
# y ve en cada pantalla lo que él ha escrito. Uso: python3 recorrido.py [puerto]   (con «?vacia» en la dirección)
import os, sys, asyncio
NAV = os.environ.get('NAVEGADOR', 'chromium')
from playwright.async_api import async_playwright
import webkit_linux
from reloj import pon_hora
from cita_pasos import nuevo_aviso

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
B = f'http://127.0.0.1:{PORT}/app.html?vacia'
ok = 0; fallos = []; errores = []
def es(c, t):
    global ok
    if c: ok += 1
    else: fallos.append(t); print('  MAL ', t)

FI = "'M14 78C30 70 44 34 50 14 54 44 44 86 26 96M52 62C64 66 80 58 90 48'"

async def main():
    async with async_playwright() as p:
        b = await getattr(p, NAV).launch(); ctx = await b.new_context(viewport={'width': 420, 'height': 860}); await pon_hora(ctx)
        c = await ctx.new_page()
        c.on('console', lambda m: webkit_linux.consola(m, 'recorrido', errores)); c.on('pageerror', lambda e: errores.append(str(e)))
        await c.goto(B); await c.wait_for_selector('#rec:not([hidden])')
        es(await c.evaluate("Oficio.estado().avisos.length") == 0, 'vacía: no hay ningún aviso de ejemplo')
        tx = await c.locator('main').inner_text()
        es('Empieza por aquí' in tx and 'Todavía no hay ningún aviso' in tx, 'vacía: Ahora dice qué hacer primero')
        nav = await c.locator('#nav').inner_text()
        es('Ahora' in nav and 'Más' in nav and 'Cobros' not in nav and 'Bandeja' not in nav, 'menú: Ahora · Agenda · Más (sin Cobros suelto)')
        es('1/6' in await c.locator('#rec').inner_text(), 'guía: paso 1 de 6')
        # paso 1: crear el aviso, con portal, piso, puerta y timbre aparte
        await c.click('#rec'); await c.click('[data-go="0"]')
        await nuevo_aviso(c, av='fuga', urg=True, tel='611 22 33 44', nomap='Visitante Prueba', dir='C/ Mayor 5', cp='08011', por='B', pis='3', pue='2ª', tim='Prueba', origen='llamada')
        await c.wait_for_url('**#/aviso/*'); id1 = c.url.split('/')[-1]
        d = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{id1}').cli.dir")
        es('C/ Mayor 5' in d and 'portal B' in d and 'piso 3' in d and 'puerta 2ª' in d and 'timbre Prueba' in d, f'aviso: la dirección lleva portal, piso, puerta y timbre ({d})')
        es('Visitante Prueba' in await c.locator('main').inner_text(), 'aviso: se ve el nombre que ha escrito el visitante')
        es('2/6' in await c.locator('#rec').inner_text(), 'guía: pasa sola al paso 2')
        # lo urgente sin técnico sale arriba en Ahora
        await c.goto(B + '#/bandeja'); await c.wait_for_selector('.fila')
        es('Visitante Prueba' in await c.locator('#sUrg').inner_text(), 'Ahora: el aviso urgente está arriba, en «Urgente y por completar»')
        # paso 2: asignar
        await c.click('#rec'); await c.click('[data-go="1"]'); await c.wait_for_selector('.tec[data-tec]')
        await c.locator('.tec[data-tec]').first.click(); await c.wait_for_timeout(300)
        A = await c.evaluate(f"Oficio.estado().avisos.find(a=>a.id==='{id1}')")
        es(A['e'] == 'asignado', 'asignar: queda asignado'); tec = A['tec']
        es('3/6' in await c.locator('#rec').inner_text(), 'guía: paso 3 de 6')
        # paso 3: el técnico, desde la guía
        await c.click('#rec'); await c.click('[data-go="2"]'); await c.wait_for_selector('[data-a=voy]')
        es('papel=tecnico' in c.url and 'vacia' in c.url, 'técnico: cambia de papel sin perder la demo vacía')
        es('Visitante' in await c.locator('main').inner_text(), 'técnico: ve el aviso que ha creado el visitante')
        await c.click('[data-a=voy]'); await c.wait_for_selector('[data-a=empezar]')
        es('4/6' in await c.locator('#rec').inner_text(), 'guía: paso 4 de 6 tras «Voy»')
        r = await c.evaluate(f"Oficio.hacer({{tipo:'empezar',id:'{id1}',pres:{{lineas:[{{k:'desp'}},{{k:'mo',q:1}}],firma:{FI}}}}},{{rol:'tecnico',id:'{tec}'}}).ok")
        es(r, 'empezar: presupuesto firmado'); await c.wait_for_timeout(300)
        es('5/6' in await c.locator('#rec').inner_text(), 'guía: paso 5 de 6')
        r = await c.evaluate(f"Oficio.hacer({{tipo:'terminar',id:'{id1}',modo:'efectivo',firma:{FI}}},{{rol:'tecnico',id:'{tec}'}}).ok")
        es(r, 'terminar: cobrado'); await c.wait_for_timeout(300)
        es('6/6' in await c.locator('#rec').inner_text(), 'guía: paso 6 de 6')
        await c.click('#rec'); await c.click('[data-go="5"]'); await c.wait_for_function("location.hash.includes('/aviso/')"); await c.wait_for_timeout(400)
        es('papel=tecnico' not in c.url and 'vacia' in c.url, 'centralita: vuelve de técnico sin perder la demo vacía')
        es('Visitante' in await c.locator('main').inner_text(), 'centralita: ve el aviso terminado del visitante')
        await c.wait_for_timeout(200)
        es('completo' in (await c.locator('#rec').inner_text()).lower() or '✓' in await c.locator('#rec').inner_text(), 'guía: recorrido completo')
        # recargar: sigue siendo su demo (con sus datos)
        await c.reload(); await c.wait_for_selector('#rec:not([hidden])')
        es(await c.evaluate("Oficio.estado().avisos.length") == 1, 'recargar: sus datos siguen ahí')
        # «Más»: Cobros, Contratos y Mejoras
        await c.goto(B + '#/mas'); await c.wait_for_selector('.lista.mas')
        mt = await c.locator('main').inner_text()
        es('Cobros' in mt, '«Más»: sale Cobros')
        # borde neutro de las franjas
        await b.close()
    print(f'\n{ok} bien, {len(fallos)} mal'); 
    errs = [e for e in errores if 'ERR_TUNNEL' not in e and 'favicon' not in e]
    if errs: print('Errores de consola:', errs[:5])
    sys.exit(1 if fallos or errs else 0)
asyncio.run(main())
