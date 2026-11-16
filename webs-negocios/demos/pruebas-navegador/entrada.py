import os
NAV = os.environ.get('NAVEGADOR', 'chromium')   # chromium, firefox o webkit
import asyncio, sys
from playwright.async_api import async_playwright
import webkit_linux   # el WebKit de Linux a veces no da una página por cargada: ver webkit_linux.py
import buzon_falso     # el buzón de mejoras no sale a internet en las pruebas: ver buzon_falso.py
# La entrada (16-11-2026): al abrir la web el vídeo arranca solo (la furgoneta llega, el técnico baja y se planta delante,
# unos 3,4 s) y acaba en la portada, con la bienvenida encima. Un gesto mientras corre se la salta. Se prueba con un servidor
# que da el vídeo por trozos (8766) y con otro que no (8765), en ordenador y en móvil, con el vídeo lento, sin vídeo y con
# movimiento reducido. No hay esperas fijas: cada paso espera a que la página llegue a su estado, con un tope.
# src: el atributo (sin él, el vídeo enseña su póster). currentSrc no sirve: Chrome lo deja con el último vídeo aunque ya no esté
EST="(()=>{const v=document.querySelector('#v'),a=v.getAttribute('src')||'';return{src:a.startsWith('blob:')?'blob':a.split('/').pop(),rs:v.readyState,poster:v.poster.split('/').pop(),d:+(v.duration||0).toFixed(2),t:+v.currentTime.toFixed(2),paused:v.paused,ended:v.ended,y:Math.round(scrollY),ready:document.body.classList.contains('ready'),op:+getComputedStyle(document.querySelector('#index')).opacity}})()"
V="document.querySelector('#v')"
LISTO="document.body.classList.contains('ready')"
VISTO="getComputedStyle(document.querySelector('#index')).opacity==='1'"   # la bienvenida, ya del todo (entra con un fundido)
CORRE=f"!{V}.paused&&{V}.currentTime>0.3"
fallos=[]; avisos=[]
def aviso(txt):
    if txt not in avisos: avisos.append(txt)
# El WebKit de Linux lee el vídeo con otras piezas que el Safari de verdad y a ratos no lo consigue. En ese motor, lo que
# depende de que el vídeo se reproduzca avisa y no cuenta como fallo. Lo que cuenta en los tres es que la página llegue a la
# portada con la bienvenida, que se pueda seguir y que no se atasque. El vídeo en Safari se da por bueno en un iPhone de verdad.
BLANDO = NAV=='webkit'
def ok(c,txt,video=False):
    if not c and video and BLANDO:
        print('  aviso '+txt); aviso('vídeo en '+NAV+': '+txt); return
    print(('  bien  ' if c else '  MAL   ')+txt)
    if not c: fallos.append(txt)
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
    # baja=True: hacia abajo (seguir). baja=False: hacia arriba
    if con=='dedo':
        try:
            await dedo(pg,-140 if baja else 140); return
        except Exception as x:
            aviso(f'el motor {NAV} no deja simular el dedo ({str(x).splitlines()[0][:90]}); se usa la rueda')
    await pg.mouse.move(w/2,h/2); await pg.mouse.wheel(0,120 if baja else -120)
def con_que(mobile):
    # WebKit no tiene rueda en modo móvil; en móvil se prueba con el dedo
    return 'dedo' if mobile else 'rueda'
async def nuevo(p,w,h,mobile,rm=False):
    b=await getattr(p, NAV).launch(); ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,reduced_motion='reduce' if rm else 'no-preference')
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    return b,pg,errs
async def caso(p,port,w,h,mobile,nombre,espera_blob):
    o='h' if w>=h else 'v'; con=con_que(mobile)
    b,pg,errs=await nuevo(p,w,h,mobile)
    await pg.goto(f'http://127.0.0.1:{port}/index.html')
    # 1. arranca solo, sin tocar nada, y mientras corre no hay bienvenida
    corre=await hasta(pg,CORRE,9000); e=await pg.evaluate(EST); print(nombre,'al arrancar',e)
    ok(corre and not e['ready'] and e['op']<0.05, f'{nombre}: el vídeo arranca solo al abrir, sin bienvenida encima ({e})',video=True)
    if corre:
        ok((e['src']=='blob')==espera_blob, f'{nombre}: fuente {"entera (blob)" if espera_blob else "por rangos (http)"} ({e["src"]})',video=True)
        ok(e['src'] in ('blob',f'entrada-{o}.mp4'), f'{nombre}: el vídeo de su orientación ({o}, {e["src"]})',video=True)
    # 2. acaba solo en la portada, con la bienvenida, y sin moverse de arriba
    llega=await hasta(pg,f'{LISTO}&&{VISTO}',14000); await pg.wait_for_timeout(300); e=await pg.evaluate(EST); print(nombre,'al acabar',e)
    ok(llega and e['y']==0 and e['op']>0.95, f'{nombre}: acaba en la portada con la bienvenida, arriba del todo ({e})')
    fin_video=e['ended'] or (e['paused'] and e['d']>0 and e['t']>=e['d']-0.1)
    ok(fin_video or (e['src']=='' and e['poster']==f'fin-{o}.webp'), f'{nombre}: se queda en el último fotograma (o en su foto) ({e})',video=True)
    if corre: ok(2.6<=e['d']<=4.5, f'{nombre}: la entrada es corta ({e["d"]} s)',video=True)
    vis=await pg.evaluate("(()=>{const r=document.querySelector('#h1').getBoundingClientRect(),c=document.querySelector('#index .espera').getBoundingClientRect();return r.height>0&&r.top>=0&&r.bottom<=innerHeight&&c.bottom<=innerHeight})()")
    ok(vis, f'{nombre}: «Fontaneros 24 horas.» y «Pedir cita», a la vista')
    # 3. el siguiente gesto pasa a la primera sección; y hacia arriba vuelve a la portada, que no se repite
    await pg.wait_for_timeout(1000); await gesto(pg,True,con,w,h)
    pasa=await hasta(pg,"scrollY>innerHeight*.6",7000); y=await pg.evaluate('scrollY')
    ok(pasa, f'{nombre}: con un gesto, a la primera sección (y={y})')
    await pg.wait_for_timeout(1300); await gesto(pg,False,con,w,h)
    sube=await hasta(pg,"scrollY<4",7000); await pg.wait_for_timeout(500); e=await pg.evaluate(EST)
    ok(sube and e['ready'] and (e['paused'] or e['src']==''), f'{nombre}: al subir, la portada quieta con la bienvenida; el vídeo no vuelve a empezar ({e})')
    # 4. saltársela: al recargar, un gesto mientras corre lleva a la portada al momento y sin moverse; el siguiente ya sigue
    await pg.reload(); corre=await hasta(pg,CORRE,9000)
    if corre:
        await gesto(pg,True,con,w,h); salta=await hasta(pg,LISTO,1500); await pg.wait_for_timeout(300); e=await pg.evaluate(EST)
        ok(salta and e['y']==0 and (e['src']=='' or e['ended']) and (e['poster']==f'fin-{o}.webp' or e['ended']), f'{nombre}: un gesto mientras corre se salta la entrada, sin moverse ({e})',video=True)
    else:   # si este motor no reproduce el vídeo, la entrada ya ha acabado sola: no hay nada que saltar
        aviso(f'{nombre}: el motor {NAV} no ha reproducido el vídeo; no se prueba saltárselo'); await hasta(pg,LISTO,9000)
    await pg.wait_for_timeout(1200); await gesto(pg,True,con,w,h)
    pasa=await hasta(pg,"scrollY>innerHeight*.6",7000); ok(pasa, f'{nombre}: y el siguiente gesto ya pasa a la primera sección')
    ok(not errs, f'{nombre}: sin errores de consola {errs[:3]}')
    await b.close()
async def lento(p,port,nombre,modo):
    b,pg,errs=await nuevo(p,1280,800,False)
    async def r(route):
        if modo=='corta': await route.abort()
        else:
            await asyncio.sleep(6); await route.continue_()
    await pg.route('**/entrada-*.mp4', r)
    await pg.goto(f'http://127.0.0.1:{port}/index.html')
    llega=await hasta(pg,LISTO,7000); await pg.wait_for_timeout(300); e=await pg.evaluate(EST); print(nombre,e)
    ok(llega and e['poster']=='fin-h.webp' and e['src']=='', f'{nombre}: sin esperar al vídeo, a los 3,5 s la portada en foto con la bienvenida ({e})')
    await pg.wait_for_timeout(7000); e=await pg.evaluate(EST)
    ok(e['src']=='' and e['ready'], f'{nombre}: y si el vídeo llega después, no se pone encima ({e})')
    await gesto(pg,True,'rueda',1280,800); pasa=await hasta(pg,"scrollY>innerHeight*.6",7000)
    ok(pasa, f'{nombre}: el siguiente gesto pasa a la primera sección')
    await b.close()
async def quieto(p,port):
    # con movimiento reducido no hay vídeo: la portada en foto y la bienvenida, desde el principio
    for w,h,mobile in ((1440,900,False),(390,844,True)):
        o='h' if w>=h else 'v'; b,pg,errs=await nuevo(p,w,h,mobile,rm=True)
        await pg.goto(f'http://127.0.0.1:{port}/index.html'); listo=await hasta(pg,f'{LISTO}&&{VISTO}',3000); e=await pg.evaluate(EST)
        ok(listo and e['src']=='' and e['poster']==f'fin-{o}.webp' and e['op']>0.95, f'movimiento reducido {w}×{h}: la portada quieta y la bienvenida, sin vídeo ({e})')
        await gesto(pg,True,con_que(mobile),w,h); pasa=await hasta(pg,"scrollY>innerHeight*.6",7000)
        ok(pasa, f'movimiento reducido {w}×{h}: un gesto pasa a la primera sección')
        ok(not errs, f'movimiento reducido {w}×{h}: sin errores de consola {errs[:3]}')
        await b.close()
async def gira(p,port):
    # acabada la entrada, si la pantalla gira se pone la portada de la otra orientación
    b,pg,errs=await nuevo(p,1440,900,False)
    await pg.goto(f'http://127.0.0.1:{port}/index.html'); await hasta(pg,LISTO,14000)
    await pg.set_viewport_size({'width':390,'height':844}); await pg.wait_for_timeout(600); e=await pg.evaluate(EST)
    ok(e['poster']=='fin-v.webp' and e['src']=='' and e['ready'], f'al girar, la portada vertical ({e})')
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
        await quieto(p,8766)
        await gira(p,8766)
    for a in avisos: print('  aviso:',a)
    print('FALLOS:',len(fallos)); [print(' -',f) for f in fallos]
    sys.exit(1 if fallos else 0)
asyncio.run(main())
