# Los iconos de la app de un negocio (para tenerla como app en el móvil): la primera letra de su marca, en amarillo sobre
# asfalto, como las señales de la app. Saca assets/icono-180.png (iPhone), icono-192.png e icono-512.png (Android y Chrome).
# El dibujo cabe en el círculo central, así que vale también para los iconos «maskable» (Android los recorta en redondo).
# Uso: python3 iconos.py <carpeta del sitio> [...]   (lee la marca de js/oficio-datos.js; necesita Pillow)
# Sin Python, la app usa assets/icono.svg, que pone copias.mjs.
import sys, os, re, json, subprocess
from PIL import Image, ImageDraw, ImageFont

ASFALTO, SENAL = (0x14, 0x17, 0x1a), (0xff, 0xc4, 0x00)
FUENTES = ['/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
           'C:/Windows/Fonts/arialbd.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf']

def letra(carpeta):
    datos = os.path.join(carpeta, 'js', 'oficio-datos.js')
    js = "globalThis.window=globalThis;require(process.argv[1]);const N=globalThis.OFICIO_NEGOCIO;console.log(JSON.stringify({m:N.marca,n:N.nombre}))"
    try:
        r = json.loads(subprocess.run(['node', '-e', js, os.path.abspath(datos)], capture_output=True, text=True, check=True).stdout)
        t = (r.get('m') or [r.get('n') or '?'])[0]
    except Exception:
        s = open(datos, encoding='utf-8').read(); m = re.search(r"marca:\['([^']+)'", s); t = m.group(1) if m else '?'
    return (t.strip()[:1] or '?').upper()

def dibuja(L, lado):
    k = 4; n = lado * k   # se dibuja grande y se reduce: bordes suaves
    im = Image.new('RGB', (n, n), ASFALTO); d = ImageDraw.Draw(im)
    f = next((x for x in FUENTES if os.path.exists(x)), None)
    fuente = ImageFont.truetype(f, int(n * .5)) if f else ImageFont.load_default()
    x0, y0, x1, y1 = d.textbbox((0, 0), L, font=fuente)
    w, h = x1 - x0, y1 - y0
    d.text(((n - w) / 2 - x0, n * .44 - h / 2 - y0), L, font=fuente, fill=SENAL)
    bw, bh = n * .3, n * .045; by = n * .72
    d.rounded_rectangle([(n - bw) / 2, by, (n + bw) / 2, by + bh], radius=bh / 2, fill=SENAL)
    return im.resize((lado, lado), Image.LANCZOS)

for carpeta in sys.argv[1:]:
    L = letra(carpeta); os.makedirs(os.path.join(carpeta, 'assets'), exist_ok=True)
    for lado in (180, 192, 512):
        dibuja(L, lado).save(os.path.join(carpeta, 'assets', f'icono-{lado}.png'), optimize=True)
    print(carpeta, '· letra', L, '· iconos de 180, 192 y 512')
