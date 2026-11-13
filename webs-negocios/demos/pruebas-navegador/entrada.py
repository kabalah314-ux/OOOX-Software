import os
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, sys
from playwright.async_api import async_playwright
# El vídeo de entrada, con un servidor que da el vídeo por trozos (8766) y con otro que no (8765), en ordenador y en móvil.
# No hay esperas fijas: cada paso espera a que la página llegue a su estado, con un tope. Una máquina lenta tarda más y no por eso falla.
# En móvil el gesto es un dedo (así entra un teléfono de verdad) y, donde el motor lo deja, también la rueda.
EST="(()=>{const v=document.querySelector('#v'),s=v.seekable;return{src:v.currentSrc.startsWith('blob:')?'blob':v.currentSrc.split('/').pop(),seek:s.length?+s.end(s.length-1).toFixed(2):0,d:+(v.duration||0).toFixed(2),t:+v.currentTime.toFixed(2),paused:v.paused,seeking:v.seeking,rs:v.readyState,y:Math.round(scrollY),ready:document.body.classList.contains('ready')}})()"
TM="document.querySelector('#track').offsetHeight-innerHeight"
V="document.querySelector('#v')"
LISTO="document.body.classList.contains('ready')"
fallos=[]; avisos=[]
def ok(c,txt):
    print(('  bien  ' if c else '  MAL   ')+txt)
    if not c: fallos.append(txt)
def aviso(txt):
    if txt not in avisos: avisos.append(txt)
async def hasta(pg,cond,ms=8000):
    try:
        await pg.wait_for_function(cond,timeout=ms); return True
    except Exception: return False
async def dedo(pg,dy):
    # un dedo que recorre dy píxeles por el centro de la pantalla (negativo = hacia arriba)
    x=await pg.evaluate('Math.round(innerWidth/2)'); y0=await pg.evaluate('Math.round(innerHeight*%s)' % ('0.72' if dy<0 else '0.28'))
    t=lambda y:[{'identifier':0,'clientX':x,'clientY':y}]
    await pg.dispatch_event('body','touchstart',{'touches':t(y0),'changedTouches':t(y0),'targetTouches':t(y0)})
    for k in (0.5,1):
        y=round(y0+dy*k); await pg.dispatch_event('body','touchmove',{'touches':t(y),'changedTouches':t(y),'targetTouches':t(y)})
    await pg.dispatch_event('body','touchend',{'touches':[],'changedTouches':t(y0+dy),'targetTouches':[]})
async def gesto(pg,baja,con,w,h):
    # baja=True: el gesto de entrar. baja=False: el de volver arriba
    if con=='dedo':
        try:
            await dedo(pg,-140 if baja else 140); return
        except Exception as x:
            aviso(f'el motor {NAV} no deja simular el dedo ({str(x).splitlines()[0][:90]}); se usa la rueda')
    await pg.mouse.move(w/2,h/2); await pg.mouse.wheel(0,120 if baja else -120)
def con_que(mobile,vuelta):
    # WebKit no tiene rueda en modo móvil. En los otros dos motores el móvil se prueba con el dedo y también con la rueda
    return 'dedo' if mobile and (vuelta==1 or NAV=='webkit') else 'rueda'
async def sin_video(pg,nombre,w,h,mobile):
    # Este motor no ha podido leer el vídeo en esta máquina. Lo que se comprueba entonces es que la página no se queda atascada
    aviso(f'{nombre}: el motor {NAV} no ha leído el vídeo en esta máquina; se ha comprobado solo que la página no se atasca')
    await gesto(pg,True,con_que(mobile,1),w,h); await hasta(pg,LISTO,16000); e=await pg.evaluate(EST)
    ok(e['ready'], f'{nombre}: sin poder leer el vídeo, la página llega a la bienvenida ({e})')
    await pg.wait_for_timeout(1400); tm=await pg.evaluate(TM)
    await gesto(pg,True,con_que(mobile,1),w,h); await hasta(pg,f'scrollY>{tm}+100',7000)
    y=await pg.evaluate('scrollY'); ok(y>tm+100, f'{nombre}: y el siguiente gesto pasa a la primera sección (y={y})')
async def caso(p,port,w,h,mobile,nombre,espera_blob):
    b=await getattr(p, NAV).launch(); ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile); pg=await ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto(f'http://127.0.0.1:{port}/index.html')
    await hasta(pg,f"(()=>{{const v={V},s=v.seekable;return v.readyState>=1&&v.duration>0&&s.length>0&&s.end(s.length-1)>=v.duration-.1}})()",20000); await pg.wait_for_timeout(500)
    e=await pg.evaluate(EST); print(nombre,'al cargar',e)
    if not e['d']:
        await sin_video(pg,nombre,w,h,mobile); await b.close(); return
    ok((e['src']=='blob')==espera_blob, f'{nombre}: fuente {"entera (blob)" if espera_blob else "por rangos (http)"}')
    ok(e['seek']>=e['d']-0.1 and e['d']>4, f'{nombre}: se puede saltar por todo el vídeo ({e["seek"]} de {e["d"]})')
    tm=await pg.evaluate(TM); d=e['d']; mitad=0.5*(d-.05); fin=d-.05
    await pg.evaluate(f'scrollTo(0,{tm*0.5})'); await hasta(pg,f"Math.abs({V}.currentTime-{mitad})<0.2&&!{V}.seeking"); await pg.wait_for_timeout(300); e=await pg.evaluate(EST)
    ok(abs(e['t']-mitad)<0.2, f'{nombre}: el scroll a la mitad lleva el vídeo a la mitad (t={e["t"]})')
    await pg.evaluate('scrollTo(0,0)'); await hasta(pg,f"{V}.currentTime<0.1&&!{V}.seeking"); await pg.wait_for_timeout(300); e=await pg.evaluate(EST)
    ok(e['t']<0.1, f'{nombre}: arriba del todo, vídeo al principio (t={e["t"]}, saltando={e["seeking"]})')
    for vuelta in (1,2):
        con=con_que(mobile,vuelta)
        await gesto(pg,True,con,w,h)
        await hasta(pg,f"{LISTO}&&{V}.paused&&Math.abs({V}.currentTime-{fin})<0.08",int(d*1000)+10000); await pg.wait_for_timeout(300); e=await pg.evaluate(EST)
        ok(e['ready'] and e['paused'] and abs(e['t']-fin)<0.08, f'{nombre}: entrada {vuelta}, con {"el dedo" if con=="dedo" else "la rueda"}, acaba en el portal (t={e["t"]}, listo={e["ready"]})')
        await pg.wait_for_timeout(1400)   # al llegar, la página no hace caso de gestos durante 1,2 s
        await gesto(pg,False,con,w,h)
        await hasta(pg,f"scrollY===0&&{V}.currentTime<0.1&&!{LISTO}",10000); await pg.wait_for_timeout(600); e=await pg.evaluate(EST)
        ok(e['y']==0 and e['t']<0.1 and not e['ready'], f'{nombre}: al subir vuelve al principio (t={e["t"]}, y={e["y"]})')
    ok(not errs, f'{nombre}: sin errores de consola {errs[:3]}')
    await b.close()
async def lento(p,port,nombre,modo):
    b=await getattr(p, NAV).launch(); ctx=await b.new_context(viewport={'width':1280,'height':800}); pg=await ctx.new_page()
    async def r(route):
        if modo=='corta': await route.abort()
        else:
            await asyncio.sleep(1.6); await route.continue_()
    await pg.route('**/entrada-*.mp4', r)
    await pg.goto(f'http://127.0.0.1:{port}/index.html'); await pg.wait_for_timeout(300)
    await gesto(pg,True,'rueda',1280,800)
    await hasta(pg,LISTO,22000); await pg.wait_for_timeout(300); e=await pg.evaluate(EST); print(nombre,e)
    ok(e['ready'], f'{nombre}: la página llega a la bienvenida y no se queda atascada (t={e["t"]})')
    await pg.wait_for_timeout(1400); tm=await pg.evaluate(TM)
    await gesto(pg,True,'rueda',1280,800); await hasta(pg,f'scrollY>{tm}+100',7000)
    y=await pg.evaluate('scrollY'); ok(y>tm+100, f'{nombre}: el siguiente gesto pasa a la primera sección (y={y})')
    await b.close()
async def main():
    print('Motor:',NAV)
    async with async_playwright() as p:
        await caso(p,8765,1440,900,False,'sin rangos, ordenador',True)
        await caso(p,8765,390,844,True,'sin rangos, móvil',True)
        await caso(p,8766,1440,900,False,'con rangos, ordenador',False)
        await caso(p,8766,390,844,True,'con rangos, móvil',False)
        await lento(p,8765,'vídeo lento, sin rangos','lento')
        await lento(p,8766,'vídeo lento, con rangos','lento')
        await lento(p,8765,'vídeo que no llega','corta')
    for a in avisos: print('  aviso:',a)
    print('FALLOS:',len(fallos)); [print(' -',f) for f in fallos]
    sys.exit(1 if fallos else 0)
asyncio.run(main())
