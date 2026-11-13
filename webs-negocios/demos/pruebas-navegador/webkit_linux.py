# Rarezas del WebKit de Linux, el motor de Safari que corre en GitHub. Lo cargan todas las baterías de pantallas.
#
# No es Safari. A ratos (una vez de cada varios cientos) una página se queda pintada y funcionando, pero el navegador no da
# la carga por terminada: se queda esperando algo que ya no llega. Visto el 13-11-2026 en pantallas distintas cada vez,
# con y sin la hora cambiada, y solo en ese motor. Aquí se le espera un poco y, si no llega, la prueba sigue y lo avisa
# diciendo qué faltaba. En Chromium y Firefox no se toca nada.
import os
from playwright.async_api import Page

NAV = os.environ.get('NAVEGADOR', 'chromium')
_QUE = "({fuentes:document.fonts?document.fonts.status:'?',imagenes:[...document.images].filter(i=>!i.complete).map(i=>i.src.split('/').pop()).slice(0,4),hojas:[...document.querySelectorAll('link[rel=stylesheet]')].filter(l=>!l.sheet).map(l=>l.href.split('/').pop())})"

def _con_espera(original, que):
    async def envuelta(self, *a, **kw):
        if NAV != 'webkit' or 'wait_until' in kw: return await original(self, *a, **kw)
        r = await original(self, *a, wait_until='domcontentloaded', **kw)
        try: await self.wait_for_load_state('load', timeout=2500)
        except Exception:
            try: falta = await self.evaluate(_QUE)
            except Exception: falta = '?'
            print(f'  aviso: en WebKit, {que} {self.url.split("/")[-1][:70]}: la página se pintó pero no dio la carga por terminada ({falta})', flush=True)
        return r
    return envuelta

Page.goto = _con_espera(Page.goto, 'al ir a')
Page.reload = _con_espera(Page.reload, 'al recargar')

# Lo mismo con la consola: cuando a ese motor se le atraganta una carga, escribe «Failed to load resource: WebKit encountered
# an internal error» (o el mensaje a secas). Lo dice el motor, no la página, y no hay petición rota detrás. Se apunta como
# rareza, con la dirección del recurso, y se enseña al final. Un archivo que de verdad falta da un 404 y eso sí es un fallo.
rarezas = []

def es_rareza(texto):
    t = texto.strip()
    return NAV == 'webkit' and 'Failed to load resource' in t and ('WebKit encountered an internal error' in t or t.endswith('Failed to load resource'))

def consola(m, nombre, errores):
    """Oyente de consola común: los errores de la página van a `errores`; las rarezas del motor, aparte."""
    if m.type != 'error': return
    try: donde = (m.location or {}).get('url', '')
    except Exception: donde = ''
    txt = f'{nombre}: {m.text}' + (f' [{donde.split("/")[-1][:70]}]' if donde else '')
    (rarezas if es_rareza(m.text) else errores).append(txt)

def resumen_rarezas():
    if rarezas: print(f'  aviso: el motor WebKit dio {len(rarezas)} errores suyos al cargar, que no son de la página: {sorted(set(rarezas))[:6]}', flush=True)
