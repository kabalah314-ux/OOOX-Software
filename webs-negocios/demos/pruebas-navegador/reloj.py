# La hora de las pruebas de pantallas. La usan app.py, web.py, muestra.py y negocio.py.
#
# Las pruebas no pueden depender de cuándo se lancen: de noche, en fin de semana o en festivo la tarifa es otra.
# Por eso la página ve siempre la misma hora: un martes laborable a las 10:30, hora de Madrid.
# Para probar a otra hora:   AHORA=2026-11-14T23:30:00+01:00 python3 app.py
#
# Cómo se hace: se le suma un desfase fijo al reloj de la página (Date.now y new Date). El tiempo sigue corriendo
# con normalidad desde esa hora, y no se tocan los temporizadores ni las animaciones del navegador.
# No se usa el reloj falso de Playwright (clock.install): cambia también los temporizadores y, en WebKit, hacía
# que a ratos una página no terminase de cargar o que lo tecleado llegase desordenado (13-11-2026).
import os, time
from datetime import datetime

AHORA = os.environ.get('AHORA', '2026-11-17T10:30:00+01:00')

def ms(iso):
    return int(datetime.fromisoformat(iso).timestamp() * 1000)

_JS = """(()=>{const d=%d;if(globalThis.__ponDesfase){globalThis.__ponDesfase(d);return}
const D=Date;let desfase=d;
function F(...a){if(!new.target)return new F().toString();return Reflect.construct(D,a.length?a:[D.now()+desfase],new.target)}
F.prototype=D.prototype;Object.setPrototypeOf(F,D);F.now=()=>D.now()+desfase;
globalThis.Date=F;globalThis.__ponDesfase=x=>{desfase=x}})()"""

async def pon_hora(ctx, iso=None):
    """Pone la hora que ven todas las pestañas y marcos de este contexto. Vale también para cambiarla a mitad de una prueba."""
    js = _JS % (ms(iso or AHORA) - int(time.time() * 1000))
    await ctx.add_init_script(js)
    for pg in ctx.pages:
        for fr in pg.frames:
            try: await fr.evaluate(js)
            except Exception: pass
