# El buzón de mejoras (js/oficio-soporte.js) habla con el servidor de OOOX. En las pruebas no sale nada a internet:
# todo navegador que abren las baterías nace con un servidor de mentira que contesta «no hay nada». Lo cargan todas.
# Lo mismo con el servidor de los avisos (fase 2): ninguna batería llega al de verdad. La del modo servidor (servidor.py)
# usa uno local, con el mismo juez.
#
# Cómo: no se intercepta la red (en Firefox eso frena todas las cargas de la página y, al cambiar de pantalla deprisa,
# deja fuentes a medio bajar que salen como errores de consola; visto el 13-11-2026). Se cambia, dentro de cada página,
# la función con la que la app llama al buzón: si la dirección es la del buzón, contesta ella; lo demás sigue igual.
#
# La batería soporte.py apaga esto (ACTIVO = False) y pone su propio servidor, con memoria, que sigue las reglas del de
# verdad (webs-negocios/oficios-soporte/esquema.sql).
import json
from playwright.async_api import Browser

ACTIVO = True
RUTA = '**/rest/v1/rpc/**'
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS'}
VACIO = {'ok': True, 'peticiones': [], 'novedades': [], 'sin_ofertas': False, 'demo': True}

_JS = """(()=>{if(window.__buzonFalso)return;const f=window.fetch;window.__buzonFalso=[];
window.fetch=function(u,o){const s=String(u&&u.url||u);
 /* tampoco sale nada hacia el servidor de los avisos (fase 2): si una copia lo lleva en sus datos, aquí es como si no hubiera red */
 if(s.indexOf('/functions/v1/')>=0){window.__buzonFalso.push('juez');return Promise.resolve(new Response(JSON.stringify({ok:false,err:'red'}),{status:200,headers:{'content-type':'application/json'}}))}
 if(s.indexOf('/rest/v1/rpc/')<0)return f.apply(this,arguments);
 const fn=s.split('/').pop().split('?')[0];window.__buzonFalso.push(fn);
 return Promise.resolve(new Response(JSON.stringify(fn==='oficios_buzon'?%s:{ok:false,err:'servidor'}),{status:200,headers:{'content-type':'application/json'}}))}})()""" % json.dumps(VACIO)

async def contesta(route, datos, estado=200):
    """Para quien pone su propio servidor de mentira interceptando la red (soporte.py)."""
    await route.fulfill(status=estado, headers={**CORS, 'content-type': 'application/json; charset=utf-8'}, body=json.dumps(datos))

_original = Browser.new_context
async def _nuevo(self, *a, **kw):
    ctx = await _original(self, *a, **kw)
    if ACTIVO: await ctx.add_init_script(_JS)
    return ctx
Browser.new_context = _nuevo
