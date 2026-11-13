# El buzón de mejoras (js/oficio-soporte.js) habla con el servidor de OOOX. En las pruebas no sale nada a internet:
# todo navegador que abren las baterías nace con un servidor de mentira que contesta «no hay nada». Lo cargan todas.
# La batería soporte.py pone encima el suyo, con memoria, que sigue las reglas del servidor de verdad
# (webs-negocios/oficios-soporte/esquema.sql).
import json
from playwright.async_api import Browser

RUTA = '**/rest/v1/rpc/**'
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS'}
VACIO = {'ok': True, 'peticiones': [], 'novedades': [], 'sin_ofertas': False, 'demo': True}
llamadas = []   # (función, cuerpo) de todo lo que la app ha intentado mandar: lo puede mirar quien quiera

async def contesta(route, datos, estado=200):
    await route.fulfill(status=estado, headers={**CORS, 'content-type': 'application/json; charset=utf-8'}, body=json.dumps(datos))

async def _nada(route):
    rq = route.request
    if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers=CORS)
    fn = rq.url.split('/')[-1].split('?')[0]
    try: cuerpo = rq.post_data_json
    except Exception: cuerpo = None
    llamadas.append((fn, cuerpo))
    await contesta(route, VACIO if fn == 'oficios_buzon' else {'ok': False, 'err': 'servidor'})

_original = Browser.new_context
async def _nuevo(self, *a, **kw):
    ctx = await _original(self, *a, **kw)
    await ctx.route(RUTA, _nada)
    return ctx
Browser.new_context = _nuevo
