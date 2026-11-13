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
