# Las pantallas de la app para el vídeo de venta (uso: python3 captura.py <carpeta de trabajo>, con la demo servida en SITIO_URL): la demo de Ramírez a una hora fija (martes 10:30), en un móvil de 390×844 a 3x.
import asyncio, json, sys, os
AQUI=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(AQUI,'..','pruebas-navegador'))
from playwright.async_api import async_playwright
from reloj import pon_hora
import buzon_falso
B=os.environ.get('SITIO_URL','http://127.0.0.1:8790/'); OUT=os.path.join(sys.argv[1],'cap')+'/'; os.makedirs(OUT,exist_ok=True)
CAJAS={}
async def caja(pg, nombre, sel):
    b=await pg.locator(sel).first.bounding_box(); CAJAS[nombre]=b; return b
async def foto(pg, nombre):
    await pg.wait_for_timeout(500)
    await pg.screenshot(path=OUT+nombre+'.jpg', type='jpeg', quality=92)
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch()
        ctx=await br.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
        await pon_hora(ctx)
        await ctx.add_init_script("window.FIRMA='M14 78C30 70 44 34 50 14 54 44 44 86 26 96M52 62C64 66 80 58 90 48 84 66 86 80 98 76 108 72 114 54 118 46 118 62 122 72 132 70 144 68 150 50 156 38 156 52 156 66 166 66 178 66 188 42 194 26'")
        cen=await ctx.new_page(); await cen.goto(B+'app.html?fijo'); await cen.wait_for_selector('.fila')
        await cen.evaluate("localStorage.removeItem('ramirez:av');localStorage.removeItem('oficio:ramirez:mio');Oficio.reiniciar()")
        await cen.reload(); await cen.wait_for_selector('.fila')
        U=await cen.evaluate("Oficio.estado().avisos.filter(a=>a.e==='nuevo'&&!a.cita).sort((a,b)=>b.t-a.t)[0].id")
        # el cliente pide su cita
        cli=await ctx.new_page(); await cli.goto(B+'cita.html'); await cli.wait_for_selector('.avc')
        await cli.evaluate("document.querySelector('#av').scrollIntoView({block:'start'});scrollBy(0,-70)")
        await foto(cli,'cita-0'); await caja(cli,'cita-grifo','.avc:has(input[value=grifo])')
        await cli.locator('.avc:has(input[value=grifo])').click(); await cli.wait_for_timeout(400)
        await cli.evaluate("document.querySelector('#fr').scrollIntoView({block:'start'});scrollBy(0,-70)")
        await foto(cli,'cita-1a')
        fr=cli.locator('[data-fr]:not([disabled])').nth(1); await fr.click(); await cli.wait_for_timeout(300)
        await cli.evaluate("document.querySelector('#fr').scrollIntoView({block:'start'});scrollBy(0,-70)")
        await caja(cli,'cita-franja','[data-fr][aria-checked=true]'); await foto(cli,'cita-1')
        for i,v in (('c_nomap','Laura Gómez Prat'),('c_tel','600 123 456'),('c_dir','C/ de Mallorca 200, 3.º 1.ª'),('c_cp','08036')):
            await cli.fill('#'+i, v)
        await cli.locator('#f button[type=submit]').click(); await cli.wait_for_selector('#rConfirma')
        await cli.evaluate("scrollTo(0,document.body.scrollHeight)"); await caja(cli,'cita-confirma','#rConfirma'); await foto(cli,'cita-2')
        await cli.locator('#rConfirma').click(); await cli.wait_for_timeout(700); await cli.evaluate('scrollTo(0,0)'); await foto(cli,'cita-3')
        C=await cli.evaluate("location.hash.split('/').pop()")
        # la oficina: la cita nueva y la urgencia
        await cen.goto(B+'app.html?fijo#/'); await cen.wait_for_selector('.fila'); await cen.wait_for_timeout(600)
        await cen.evaluate('scrollTo(0,0)'); await foto(cen,'cen-0')
        await cen.evaluate(f"document.querySelector('a.fila[href=\"#/aviso/{C}\"]').scrollIntoView({{block:'center'}})")
        await caja(cen,'cen-cita',f'a.fila[href="#/aviso/{C}"]'); await foto(cen,'cen-1')
        await cen.evaluate(f"document.querySelector('a.fila[href=\"#/aviso/{U}\"]').scrollIntoView({{block:'center'}})")
        await caja(cen,'cen-urg',f'a.fila[href="#/aviso/{U}"]'); await caja(cen,'cen-asignar',f'button.dar[data-id="{U}"]'); await foto(cen,'cen-2')
        await pon_hora(ctx,'2026-11-17T10:31:00+01:00')
        T=await cen.evaluate(f"document.querySelector('button.dar[data-id=\"{U}\"]').dataset.tec")
        await cen.locator(f'button.dar[data-id="{U}"]').click(); await cen.wait_for_timeout(500); await foto(cen,'cen-3')
        # el técnico
        tec=await ctx.new_page(); await tec.goto(B+f'app.html?papel=tecnico&tec={T}&fijo'); await tec.wait_for_selector(f'[data-a=voy][data-id="{U}"]')
        await caja(tec,'tec-voy',f'[data-a=voy][data-id="{U}"]'); await foto(tec,'tec-0')
        await pon_hora(ctx,'2026-11-17T10:32:00+01:00')
        await tec.locator(f'[data-a=voy][data-id="{U}"]').click(); await tec.wait_for_timeout(900)
        await tec.evaluate('scrollTo(0,0)'); await foto(tec,'tec-1a')
        await tec.evaluate('scrollTo(0,document.body.scrollHeight)'); await caja(tec,'tec-empezar',f'[data-a=empezar][data-id="{U}"]'); await foto(tec,'tec-1')
        # el cliente de la urgencia, mientras va de camino
        await cli.goto(B+f'cita.html#/aviso/{U}'); await cli.wait_for_selector('.quien'); await cli.evaluate('scrollTo(0,0)')
        await caja(cli,'cli-quien','.quien'); await foto(cli,'cli-camino')
        # el precio firmado
        await tec.locator(f'[data-a=empezar][data-id="{U}"]').click(); await tec.wait_for_selector('dialog[open] #pF'); await tec.wait_for_timeout(500)
        await tec.evaluate("(()=>{const d=document.querySelector('dialog[open]');const b=d.querySelector('.hb');if(b)b.scrollTop=b.scrollHeight})()")
        await tec.wait_for_timeout(300)
        await caja(tec,'tec-firma','dialog[open] #pF'); await caja(tec,'tec-pok','dialog[open] #pOk'); await caja(tec,'tec-total','dialog[open] .ptot'); await foto(tec,'tec-2')
        await pon_hora(ctx,'2026-11-17T11:04:00+01:00')
        # firmado con una firma de verdad (la de la muestra), para que el parte la lleve bonita
        await tec.evaluate(f"""(()=>{{document.querySelectorAll('dialog[open]').forEach(d=>d.close());const K=OficioNucleo,cfg=K.cfgDe(OFICIO_NEGOCIO),A=Oficio.estado().avisos.find(a=>a.id==='{U}');
          const lin=K.iniDe(cfg,A).map(l=>({{k:l.k,q:l.q||cfg.cat[l.k].min}}));return Oficio.hacer({{tipo:'empezar',id:'{U}',pres:{{lineas:lin,local:false,firma:FIRMA,pide:true}}}},{{rol:'tecnico',id:'{T}'}}).ok}})()""")
        await tec.wait_for_timeout(800)
        await tec.evaluate('scrollTo(0,document.body.scrollHeight)'); await caja(tec,'tec-terminar',f'[data-a=terminar][data-id="{U}"]'); await foto(tec,'tec-4')
        await pon_hora(ctx,'2026-11-17T11:51:00+01:00')
        await tec.locator(f'[data-a=terminar][data-id="{U}"]').click(); await tec.wait_for_selector('dialog[open] #tM'); await tec.wait_for_timeout(400)
        await tec.locator('dialog[open] [data-modo=tarjeta]').click(); await tec.wait_for_timeout(300)
        await caja(tec,'tec-tarjeta','dialog[open] [data-modo=tarjeta]'); await caja(tec,'tec-tok','dialog[open] #tOk'); await foto(tec,'tec-5')
        await tec.evaluate(f"""(()=>{{document.querySelectorAll('dialog[open]').forEach(d=>d.close());return Oficio.hacer({{tipo:'terminar',id:'{U}',modo:'tarjeta',firma:FIRMA}},{{rol:'tecnico',id:'{T}'}}).ok}})()""")
        await tec.evaluate(f"location.hash='#/papel/{U}/parte'"); await tec.wait_for_timeout(900); await tec.evaluate('scrollTo(0,0)'); await foto(tec,'tec-6')
        # los cobros
        await cen.goto(B+'app.html?fijo#/cobros'); await cen.wait_for_selector('.resumen.pest'); await cen.wait_for_timeout(500)
        await caja(cen,'cen-cobros','.resumen.pest'); await foto(cen,'cen-4')
        # los papeles, en grande
        pp=await br.new_context(viewport={'width':760,'height':1000},device_scale_factor=2)
        await pon_hora(pp)
        st=await ctx.storage_state(); 
        hj=await ctx.new_page(); await hj.set_viewport_size({'width':760,'height':1000})
        for k in ('parte','garantia','presupuesto'):
            await hj.goto(B+f'app.html?fijo&solo#/papel/{U}/{k}'); await hj.wait_for_timeout(900)
            await hj.locator('article.papel.doc').screenshot(path=OUT+f'papel-{k}.jpg', type='jpeg', quality=92)
        await pp.close()
        # la web del negocio, en un ordenador
        wb=await br.new_context(viewport={'width':1440,'height':900},device_scale_factor=1.5); await pon_hora(wb)
        w=await wb.new_page(); await w.goto(B+'index.html')
        try: await w.wait_for_function("document.body.classList.contains('ready')", timeout=15000)
        except Exception: pass
        await w.wait_for_timeout(2500); await w.screenshot(path=OUT+'web.jpg', type='jpeg', quality=92)
        json.dump({'U':U,'C':C,'T':T,'cajas':CAJAS}, open(OUT+'cajas.json','w'), indent=1)
        print('U',U,'C',C,'T',T, len(CAJAS),'cajas')
        await br.close()
asyncio.run(main())
