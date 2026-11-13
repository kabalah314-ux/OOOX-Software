import asyncio, sys
from playwright.async_api import async_playwright
EST="(()=>{const v=document.querySelector('#v'),s=v.seekable;return{src:v.currentSrc.startsWith('blob:')?'blob':v.currentSrc.split('/').pop(),seek:s.length?+s.end(s.length-1).toFixed(2):0,d:+(v.duration||0).toFixed(2),t:+v.currentTime.toFixed(2),paused:v.paused,rs:v.readyState,y:Math.round(scrollY),ready:document.body.classList.contains('ready')}})()"
TM="document.querySelector('#track').offsetHeight-innerHeight"
fallos=[]
def ok(c,txt):
    print(('  bien  ' if c else '  MAL   ')+txt); 
    if not c: fallos.append(txt)
async def caso(p,port,w,h,mobile,nombre,espera_blob):
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile); pg=await ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto(f'http://127.0.0.1:{port}/index.html'); await pg.wait_for_timeout(1800)
    e=await pg.evaluate(EST); print(nombre,'al cargar',e)
    ok((e['src']=='blob')==espera_blob, f'{nombre}: fuente {"entera (blob)" if espera_blob else "por rangos (http)"}')
    ok(e['seek']>=e['d']-0.1 and e['d']>4, f'{nombre}: se puede saltar por todo el vídeo ({e["seek"]} de {e["d"]})')
    tm=await pg.evaluate(TM); d=e['d']
    await pg.evaluate(f'scrollTo(0,{tm*0.5})'); await pg.wait_for_timeout(900); e=await pg.evaluate(EST)
    ok(abs(e['t']-0.5*(d-.05))<0.2, f'{nombre}: el scroll a la mitad lleva el vídeo a la mitad (t={e["t"]})')
    await pg.evaluate('scrollTo(0,0)'); await pg.wait_for_timeout(900); e=await pg.evaluate(EST)
    ok(e['t']<0.1, f'{nombre}: arriba del todo, vídeo al principio (t={e["t"]})')
    for vuelta in (1,2):
        await pg.mouse.move(w/2,h/2); await pg.mouse.wheel(0,120); await pg.wait_for_timeout(int(d*1000)+1300); e=await pg.evaluate(EST)
        ok(e['ready'] and e['paused'] and abs(e['t']-(d-.05))<0.08, f'{nombre}: entrada {vuelta} acaba en el portal (t={e["t"]}, listo={e["ready"]})')
        await pg.mouse.wheel(0,-120); await pg.wait_for_timeout(2600); e=await pg.evaluate(EST)
        ok(e['y']==0 and e['t']<0.1 and not e['ready'], f'{nombre}: al subir vuelve al principio (t={e["t"]}, y={e["y"]})')
    ok(not errs, f'{nombre}: sin errores de consola {errs[:3]}')
    await b.close()
async def lento(p,port,nombre,modo):
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':1280,'height':800}); pg=await ctx.new_page()
    async def r(route):
        if modo=='corta': await route.abort()
        else:
            await asyncio.sleep(1.6); await route.continue_()
    await pg.route('**/entrada-*.mp4', r)
    await pg.goto(f'http://127.0.0.1:{port}/index.html'); await pg.wait_for_timeout(300)
    await pg.mouse.move(640,400); await pg.mouse.wheel(0,120)
    await pg.wait_for_timeout(10500); e=await pg.evaluate(EST); print(nombre,e)
    ok(e['ready'], f'{nombre}: la página llega a la bienvenida y no se queda atascada (t={e["t"]})')
    await pg.mouse.wheel(0,120); await pg.wait_for_timeout(1900)
    y=await pg.evaluate('scrollY'); tm=await pg.evaluate(TM); ok(y>tm+100, f'{nombre}: el siguiente gesto pasa a la primera sección (y={y})')
    await b.close()
async def main():
    async with async_playwright() as p:
        await caso(p,8765,1440,900,False,'sin rangos, ordenador',True)
        await caso(p,8765,390,844,True,'sin rangos, móvil',True)
        await caso(p,8766,1440,900,False,'con rangos, ordenador',False)
        await caso(p,8766,390,844,True,'con rangos, móvil',False)
        await lento(p,8765,'vídeo lento, sin rangos','lento')
        await lento(p,8766,'vídeo lento, con rangos','lento')
        await lento(p,8765,'vídeo que no llega','corta')
    print('FALLOS:',len(fallos)); [print(' -',f) for f in fallos]
asyncio.run(main())
