# TEMPORAL: averigua por qué en WebKit, de noche, no carga la pantalla del técnico al venir de «nuevo aviso». Se borra al saberlo.
import os, asyncio
from datetime import datetime
from playwright.async_api import async_playwright
NAV = os.environ.get('NAVEGADOR', 'chromium'); B = 'http://127.0.0.1:8765/'
async def una(p, h, reloj=True, desde='app.html#/nuevo', a='app.html?papel=tecnico&tec=jordi'):
    br = await getattr(p, NAV).launch(); ctx = await br.new_context(viewport={'width': 320, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
    if reloj: await ctx.clock.install(time=datetime.fromisoformat(h))
    pg = await ctx.new_page(); vivos = {}; errs = []
    pg.on('request', lambda r: vivos.__setitem__(r.url.split('/')[-1], 'sin llegar')); pg.on('requestfinished', lambda r: vivos.pop(r.url.split('/')[-1], None)); pg.on('requestfailed', lambda r: vivos.__setitem__(r.url.split('/')[-1], 'falló ' + str(r.failure)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text[:140]) if m.type in ('error', 'warning') else None); pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:180]))
    t0 = asyncio.get_event_loop().time(); antes = '?'
    try:
        await pg.goto(B + 'app.html'); await pg.wait_for_timeout(250)
        await pg.goto(B + desde); await pg.wait_for_timeout(250)
        antes = await pg.evaluate("(()=>{const m=OficioNucleo.madrid();return m.date+' min '+m.min+' urgente='+OficioNucleo.urgente(Oficio.cfg,Date.now())+' foco='+(document.activeElement?document.activeElement.tagName+'#'+document.activeElement.id:'')})()")
        try:
            await pg.goto(B + a, timeout=8000); res = 'CARGA BIEN'
        except Exception as e:
            res = 'NO CARGA (' + str(e).splitlines()[0][:60] + ')'
            try: st = await asyncio.wait_for(pg.evaluate("({listo:document.readyState,donde:location.href,texto:(document.body?document.body.innerText:'').slice(0,80)})"), 4)
            except Exception as e2: st = 'la página no contesta: ' + type(e2).__name__
            res += f' · estado {st}'
        print(f"DIAG [{h} reloj={reloj} · {desde} → {a}] {res} · {asyncio.get_event_loop().time() - t0:.1f} s · antes {antes} · sin llegar {dict(list(vivos.items())[:5])} · consola {errs[:4]}", flush=True)
    except Exception as e:
        print(f"DIAG [{h} reloj={reloj} · {desde} → {a}] se rompe antes: {str(e).splitlines()[0][:110]} · antes {antes} · sin llegar {dict(list(vivos.items())[:5])} · consola {errs[:4]}", flush=True)
    await br.close()
async def main():
    async with async_playwright() as p:
        for h in ('2026-11-17T10:30:00+01:00', '2026-11-18T16:00:00+01:00', '2026-11-14T23:30:00+01:00', '2026-12-31T23:58:30+01:00', '2026-11-13T20:10:00+01:00', '2026-11-15T11:00:00+01:00', '2026-11-17T03:00:00+01:00'):
            await una(p, h)
        h = '2026-11-14T23:30:00+01:00'
        await una(p, h, desde='app.html#/cobros'); await una(p, h, desde='app.html'); await una(p, h, a='app.html?papel=tecnico&tec=omar'); await una(p, h, a='cita.html'); await una(p, h, a='app.html?x=1')
        await una(p, h, reloj=False)
asyncio.run(main())
