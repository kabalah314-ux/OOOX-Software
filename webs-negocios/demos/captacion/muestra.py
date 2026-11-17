# La muestra de un negocio (17-11-2026): su imagen para el correo y el WhatsApp, y sus textos.
#
#   python3 muestra.py --negocio "Fontanería Serra" [--categoria Fontanería] [--persona Jordi] [--zona Sants]
#                      [--enlace URL] [--hasta "domingo 30"] [--whatsapp "600 00 00 00"] --out CARPETA
#
# Saca de la demo de Ramírez, con el nombre del negocio puesto, tres pantallas (su web de citas, la oficina y el
# técnico), las pone en portada.html y deja en CARPETA:
#   portada.jpg   la imagen (1200×630; en el correo se ve a 560 de ancho)
#   correo.html   el correo, listo para copiar y pegar en Gmail (con la imagen al lado: portada.jpg)
#   correo.jpg    cómo se ve el correo, para mirarlo de un vistazo
#   textos.txt    los asuntos, el guion de la llamada, el WhatsApp, el correo en texto y los dos seguimientos
#
# Los datos de los negocios de verdad (la lista) no entran nunca en este repositorio, que es público: se leen de la
# carpeta de Oscar y lo que sale se queda allí.
import argparse, asyncio, html, json, os, shutil, socket, subprocess, sys, time
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'pruebas-navegador'))
from playwright.async_api import async_playwright
from reloj import pon_hora
import buzon_falso   # nada sale al buzón de verdad
import textos as T

DEMO = os.path.normpath(os.path.join(AQUI, '..', '..', '..', 'frontend', 'public', 'demos', 'ramirez-24h'))

def partir(n):
    """La marca de la cabecera: lo último va en la etiqueta amarilla («Fontanería» + «Serra»)."""
    w = n.split()
    return [n, ''] if len(w) < 2 else [' '.join(w[:-1]), w[-1]]

def datos_con(txt, d):
    """El archivo de datos de la demo con el nombre del negocio en lugar del de Ramírez."""
    m = partir(d['negocio']); j = lambda s: json.dumps(s, ensure_ascii=False)
    for a, b in (("nombre:'Ramírez 24 h'", f"nombre:{j(d['negocio'])}"), ("marca:['Ramírez','24 h']", f"marca:[{j(m[0])},{j(m[1])}]"),
                 ("razon:'Ramírez Fontaneros, S. L.'", f"razon:{j(d['negocio'])}"), ("dir:'Taller en Sants, Barcelona'", f"dir:{j(d.get('zona') or 'Barcelona')}")):
        assert txt.count(a) == 1, a
        txt = txt.replace(a, b)
    return txt.replace('con el logo de Ramírez', 'con el logo de ' + (m[1] or m[0]))

def libre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

async def pantallas(d, cap):
    os.makedirs(cap, exist_ok=True)
    port = libre(); srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=DEMO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    B = f'http://127.0.0.1:{port}/'
    try:
        for _ in range(50):
            try: socket.create_connection(('127.0.0.1', port), .2).close(); break
            except OSError: time.sleep(.1)
        async with async_playwright() as p:
            br = await p.chromium.launch()
            ctx = await br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='es-ES', timezone_id='Europe/Madrid', service_workers='block')
            await pon_hora(ctx)
            async def sirve(route):
                r = await route.fetch(); await route.fulfill(response=r, body=datos_con(await r.text(), d))
            await ctx.route('**/js/oficio-datos.js', sirve)
            cen = await ctx.new_page(); await cen.goto(B + 'app.html?fijo'); await cen.wait_for_selector('.fila')
            await cen.evaluate("localStorage.removeItem('ramirez:av');localStorage.removeItem('oficio:ramirez:mio');Oficio.reiniciar()")
            await cen.reload(); await cen.wait_for_selector('.fila'); await cen.wait_for_timeout(700)
            await cen.screenshot(path=os.path.join(cap, 'cen.jpg'), type='jpeg', quality=90)
            tec = await ctx.new_page(); await tec.goto(B + 'app.html?papel=tecnico&tec=laia&fijo'); await tec.wait_for_selector('#nav a', state='attached'); await tec.wait_for_timeout(900)
            await tec.screenshot(path=os.path.join(cap, 'tec.jpg'), type='jpeg', quality=90)
            cli = await ctx.new_page(); await cli.goto(B + 'cita.html'); await cli.wait_for_selector('.avc'); await cli.wait_for_timeout(700)
            await cli.screenshot(path=os.path.join(cap, 'cita.jpg'), type='jpeg', quality=90)
            await br.close()
    finally:
        srv.terminate()

async def portada(d, out):
    shutil.copy(os.path.join(AQUI, 'portada.html'), out)
    os.makedirs(os.path.join(out, 'fuentes'), exist_ok=True)
    for f in ('barlow-500', 'barlow-600', 'barlow-condensed-700', 'barlow-condensed-800'):
        shutil.copy(os.path.join(DEMO, 'assets', 'fuentes', f + '.woff2'), os.path.join(out, 'fuentes'))
    D = {'negocio': d['negocio'], 'linea': 'Tu web de citas y tu oficina, en el móvil.', 'toca': 'Ábrela y toca · 3 minutos',
         'cap': ['cap/cita.jpg', 'cap/cen.jpg', 'cap/tec.jpg']}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        await pg.add_init_script('window.DATOS=' + json.dumps(D, ensure_ascii=False))
        await pg.goto('file://' + os.path.join(out, 'portada.html')); await pg.evaluate('listo'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=os.path.join(out, 'portada.jpg'), type='jpeg', quality=88)
        # el correo, como se verá
        c = os.path.join(out, 'correo.html')
        with open(c, 'w', encoding='utf-8') as f:
            f.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
                    f'<title>Correo para {html.escape(d["negocio"])}</title></head><body style="margin:0;padding:28px 24px;background:#fff">'
                    f'<!-- Asunto: {html.escape(T.asuntos(d)[0])} -->' + T.correo_html(d, 'portada.jpg') + '</body></html>')
        pg2 = await br.new_page(viewport={'width': 640, 'height': 900}, device_scale_factor=2)
        await pg2.goto('file://' + c); await pg2.wait_for_timeout(300)
        await pg2.screenshot(path=os.path.join(out, 'correo.jpg'), type='jpeg', quality=85, full_page=True)
        await br.close()

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--negocio', required=True); a.add_argument('--categoria', default=''); a.add_argument('--persona', default='')
    a.add_argument('--zona', default=''); a.add_argument('--enlace', default='https://ooox.es/'); a.add_argument('--hasta', default='domingo')
    a.add_argument('--whatsapp', default=''); a.add_argument('--fuente', default='Google Maps'); a.add_argument('--out', required=True)
    # para los correos en frío: lo que dice su ficha (de la lista) y de dónde salió su correo
    a.add_argument('--nota', default=''); a.add_argument('--resenas', default=''); a.add_argument('--h24', default='')
    a.add_argument('--web', default=''); a.add_argument('--fuente-correo', default='vuestra web')
    x = a.parse_args()
    d = {'negocio': T.corto(x.negocio), 'oficio': T.oficio_de(x.categoria, x.negocio), 'persona': x.persona, 'zona': x.zona,
         'enlace': x.enlace, 'hasta': x.hasta, 'whatsapp': x.whatsapp, 'fuente': x.fuente,
         'nota': x.nota, 'resenas': x.resenas, 'h24': x.h24.lower() in ('si', 'sí', '1', 'true'),
         'web': None if not x.web else x.web.lower() in ('si', 'sí', '1', 'true'), 'fuente_correo': x.fuente_correo}
    out = os.path.abspath(x.out); os.makedirs(out, exist_ok=True)
    asyncio.run(pantallas(d, os.path.join(out, 'cap')))
    asyncio.run(portada(d, out))
    with open(os.path.join(out, 'textos.txt'), 'w', encoding='utf-8') as f:
        f.write(f"MUESTRA PARA {d['negocio'].upper()} ({d['oficio']})\n\nASUNTOS DEL CORREO\n" + '\n'.join('- ' + s for s in T.asuntos(d))
                + '\n\nCARTA EN PAPEL (el primer contacto en frío; con el QR de su muestra)\n' + T.carta(d)
                + '\n\nLLAMADA (30 segundos; solo si el abogado lo ve bien)\n' + T.llamada(d)
                + '\n\nRESPUESTA (cuando te escribe él, desde su muestra o por la carta)\n' + T.respuesta(d)
                + '\n\nWHATSAPP (después de la llamada, si dijo que sí; con la imagen portada.jpg)\n' + T.whatsapp(d)
                + '\n\nCORREO EN TEXTO (si lo prefiere por correo)\n' + T.correo_texto(d) + '\n\nSEGUIMIENTO 1 (a los 2 o 3 días)\n' + T.seguimiento_1(d)
                + '\n\nSEGUIMIENTO 2 (el último)\n' + T.seguimiento_2(d)
                + '\n\n========== CORREOS EN FRÍO (sin contacto previo: leer antes la guía, pestaña «Captación») ==========\n'
                + 'ASUNTOS\n' + '\n'.join('- ' + s for s in T.asuntos_frio(d))
                + '\n\nFRÍO 1 (día 1: sin enlace ni imagen)\n' + T.frio_1(d)
                + '\n\nFRÍO 2 (día 4, en el mismo hilo)\n' + T.frio_2(d)
                + '\n\nFRÍO 3 (día 10, en el mismo hilo; después, nada más)\n' + T.frio_3(d)
                + '\n\nSI CONTESTA «SÍ»: el correo con la imagen y el enlace (correo.html), que empieza por «Lo prometido».'
                + '\n\nRESPUESTAS CORTAS\n' + '\n'.join(f'- {k}: {v}' for k, v in T.RESPUESTAS.items()) + '\n')
    print('Listo:', out)

if __name__ == '__main__':
    main()
