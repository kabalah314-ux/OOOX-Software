import os
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, json
from reloj import pon_hora   # la hora de las pruebas es fija: ver reloj.py
from playwright.async_api import async_playwright
B='http://127.0.0.1:8765/'
async def main():
    ok=0; mal=[]
    def es(c,t):
        nonlocal ok
        if c: ok+=1
        else: mal.append(t); print('  MAL',t)
    async with async_playwright() as p:
        b=await getattr(p, NAV).launch(); ctx=await b.new_context(viewport={'width':390,'height':844},timezone_id='Europe/Madrid'); await pon_hora(ctx)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(B+'app.html'); await pg.wait_for_selector('.fila')
        s=await pg.evaluate("JSON.parse(localStorage.getItem('oficio:ramirez'))")
        es(s.get('t0') and abs(s['t0']-await pg.evaluate('Date.now()'))<60000,'la muestra nueva lleva su hora')
        idp=await pg.evaluate("Oficio.hacer({tipo:'pedir',av:'fuga',cli:{nombre:'Hoy Mismo',tel:'655000111',dir:'C/ Aragó 10, 1.º',cp:'08015'}},{rol:'cliente'}).id")
        await pg.reload(); await pg.wait_for_selector('.fila')
        es('Hoy Mismo' in await pg.locator('main').inner_text(),'lo probado hoy sigue ahí al recargar')
        await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('oficio:ramirez'));s.t0=Date.now()-9*3600*1000;localStorage.setItem('oficio:ramirez',JSON.stringify(s))})()")
        await pg.reload(); await pg.wait_for_selector('.fila')
        s=await pg.evaluate("JSON.parse(localStorage.getItem('oficio:ramirez'))")
        es('Hoy Mismo' not in await pg.locator('main').inner_text() and len(s['avisos'])==6,'una muestra de hace 9 horas se rehace sola')
        t=await pg.locator('main').inner_text()
        es('hace 9 h' not in t,'y ya no dice «hace 9 h»')
        await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('oficio:ramirez'));delete s.t0;localStorage.setItem('oficio:ramirez',JSON.stringify(s))})()")
        await pg.reload(); await pg.wait_for_selector('.fila')
        s=await pg.evaluate("JSON.parse(localStorage.getItem('oficio:ramirez'))")
        es(s.get('t0'),'una muestra antigua sin hora también se rehace')
        p2=await ctx.new_page(); await p2.goto(B+'app.html?papel=tecnico&tec=omar'); await p2.wait_for_timeout(500)
        await pg.evaluate("Oficio.reiniciar()"); await pg.wait_for_timeout(400)
        s=await pg.evaluate("JSON.parse(localStorage.getItem('oficio:ramirez'))")
        es(s.get('t0'),'«Reiniciar» también pone la hora')
        es(not errs,f'sin errores {errs[:2]}')
        await b.close()
    print(('BIEN' if not mal else 'MAL')+f': {ok} comprobaciones pasan')
    raise SystemExit(1 if mal else 0)
asyncio.run(main())
