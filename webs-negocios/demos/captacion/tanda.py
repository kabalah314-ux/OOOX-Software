# La tanda de cartas de captación de OOOX Oficios (19-11-2026): de la lista de negocios (que nunca entra en este
# repositorio, que es público) saca, para los primeros de cada zona de Barcelona:
#   cartas.pdf    una carta A4 por negocio, «al estilo tradicional» (19-11-2026, noche): su nombre, la foto de su web de
#                 citas con su nombre en un móvil, y GRATIS junto al código QR de su muestra: la demo con sus datos dentro
#                 del enlace (regalo.html?m=…, ver «muestraDe» en js/oficio-estado.js). Cada carta son dos páginas: la carta y,
#                 detrás, el sobre de la misma hoja (20-11-2026): se imprime a doble cara por el lado largo y se dobla en
#                 tres, primero la franja de abajo hacia arriba y luego la de arriba hacia abajo (las marcas del borde)
#   sobres-C5.pdf (solo con --sobre-c5) el sobre C5 de antes, para la carta doblada por la mitad
#   hoja.csv    una fila por negocio, en el orden de las cartas, para apuntar la visita, el permiso y los seguimientos
# Antes de mandarlas: pasar la lista por la Lista Robinson (las de autónomos) y publicar la demo (el enlace es de ooox.es).
# Uso: python3 tanda.py --lista <lista-larga.csv> --contactos <contactos.csv> --out <carpeta> [--max 40] [--hasta 2026-12-20]
import argparse, base64, csv, datetime, hashlib, html, json, os, re, sys, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textos
from reportlab.graphics.barcode import qrencoder as Q

URL = 'https://ooox.es/demos/ramirez-24h/regalo.html'   # la carta en web: su regalo, y desde ahí su web y el programa (20-11-2026)
GRANJA = ('93694',)   # una misma centralita con decenas de fichas «Fontanero <barrio>»: no son negocios de barrio
METRO = ['barcelona', 'badalona', 'hospitalet', 'santa coloma', 'sant adrià', 'sant adria', 'cornellà', 'cornella', 'esplugues', 'sant just', 'sant joan despí', 'el prat', 'montcada']
ZONAS = {'Centro': '08001 08002 08003 08007 08008 08009 08010 08011 08012 08013 08015 08036 08037 08024 08025 08029 08006 08023',
         'Este': '08005 08018 08019 08020 08026 08039 08930 08911 08912 08913 08914 08915 08916 08917 08918',
         'Norte': '08027 08030 08031 08032 08033 08035 08041 08042 08016 08110 08921 08922 08923 08924',
         'Oeste': '08004 08014 08017 08021 08022 08028 08034 08038 08040 08940 08950 08960 08970 08820 08901 08902 08903 08904 08905 08906 08907 08908'}
NOM_ZONA = {'Centro': 'Centro (Eixample, Gràcia, Ciutat Vella)', 'Este': 'Este (Sant Martí, Poblenou, Badalona)', 'Norte': 'Norte (Sant Andreu, Nou Barris, Horta)', 'Oeste': 'Oeste (Sants, Les Corts, Sarrià, L\'Hospitalet)'}
CENTRO = {'Centro': (41.392, 2.162), 'Este': (41.412, 2.205), 'Norte': (41.435, 2.172), 'Oeste': (41.383, 2.118)}
BARRIO = {'08001': 'Raval', '08002': 'Gòtic', '08003': 'Born', '08004': 'Poble-sec', '08005': 'Poblenou', '08006': 'Sant Gervasi', '08007': 'Eixample', '08008': 'Eixample',
          '08009': 'Eixample', '08010': 'Eixample', '08011': 'Eixample', '08012': 'Gràcia', '08013': 'Eixample', '08014': 'Sants', '08015': 'Eixample', '08016': 'Nou Barris',
          '08017': 'Sarrià', '08018': 'Sant Martí', '08019': 'Sant Martí', '08020': 'Sant Martí', '08021': 'Sant Gervasi', '08022': 'Sant Gervasi', '08023': 'Vallcarca',
          '08024': 'Gràcia', '08025': 'Sagrada Família', '08026': 'Camp de l\'Arpa', '08027': 'Sant Andreu', '08028': 'Les Corts', '08029': 'Eixample', '08030': 'Sant Andreu',
          '08031': 'Nou Barris', '08032': 'Horta', '08033': 'Nou Barris', '08034': 'Pedralbes', '08035': 'Horta', '08036': 'Eixample', '08037': 'Gràcia', '08038': 'Sants-Montjuïc',
          '08039': 'Barceloneta', '08040': 'Zona Franca', '08041': 'Guinardó', '08042': 'Nou Barris'}
GENERICO = set(('fontanero fontaneros fontanería fontaneria lampista lampisteria lampistería electricista electricistas cerrajero cerrajeros cerrajería urgente urgentes urgencias urgencia '
                 'barcelona bcn 24h 24 h hs 7 desatascos de del en y i la el reparaciones servicio servicios multiservicios horta sants gràcia gracia eixample sarrià sarria poblenou badalona '
                 'hospitalet sant martí marti andreu nou barris les corts guinardó guinardo').split())

tel9 = lambda s: re.sub(r'\D', '', s or '')[-9:]
def coord(u):
    m = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', u or ''); return (float(m.group(1)), float(m.group(2))) if m else None

def nombre_corto(n):
    """El nombre para la carta: sin emojis, estrellas ni corchetes; de «Genérico | Marca», la marca; sin mayúsculas gritadas."""
    n = re.sub(r'\([^)]*\)', ' ', n.split('[')[0]); n = re.sub(r'[^\w\s&.,\'’·|\-/]', ' ', n, flags=re.U)
    partes = [p.strip(' -·.,/') for p in re.split(r'\s[|–-]\s|\||/|,\s', n) if p.strip(' -·.,/')]
    propio = lambda p: any(w not in GENERICO and not w.isdigit() for w in re.findall(r'\w+', p.lower()))
    p = re.sub(r'\s+', ' ', next((x for x in partes if propio(x)), partes[0] if partes else n)).strip()
    PEQ = ('y', 'i', 'de', 'del', 'la', 'el', 'en', 'les', 'els')
    def w_(w, i):
        if i and w.lower() in PEQ: return w.lower()
        if re.fullmatch(r'(?:[A-Z]\.){1,4}[A-Z]?\.?|[A-Z]{1,3}|SCP|BCN', w) or not re.search(r'[AEIOUÁÉÍÓÚ]', w): return w   # siglas: como están
        return w.capitalize() if w.isupper() and len(w) > 3 else w
    W = p.split()
    if sum(1 for w in W if w.isupper() and len(w) > 3) >= max(1, len(W) // 2): p = ' '.join(w_(w, i) for i, w in enumerate(W))
    if len(p) > 40:
        p = p[:40].rsplit(' ', 1)[0]
        while p.split() and p.split()[-1].lower() in PEQ: p = p.rsplit(' ', 1)[0]
    return p

def zona_de(d, xy):
    m = re.search(r'\b(08\d{3})\b', d.lower())
    if m:
        for z, cps in ZONAS.items():
            if m.group(1) in cps.split(): return z, BARRIO.get(m.group(1), '')
        return '', ''
    for k, z in (('badalona', 'Este'), ('sant adri', 'Este'), ('santa coloma', 'Norte'), ('montcada', 'Norte'), ('hospitalet', 'Oeste'), ('cornell', 'Oeste'), ('esplugues', 'Oeste'), ('sant just', 'Oeste'), ('sant joan desp', 'Oeste'), ('el prat', 'Oeste')):
        if k in d.lower(): return z, k.title().replace('Sant Adri', 'Sant Adrià').replace('Cornell', 'Cornellà').replace('Sant Joan Desp', 'Sant Joan Despí')
    if xy and 41.33 < xy[0] < 41.48 and 2.07 < xy[1] < 2.26:
        return min(CENTRO, key=lambda z: (CENTRO[z][0] - xy[0]) ** 2 + ((CENTRO[z][1] - xy[1]) * 0.75) ** 2), ''
    return '', ''

def puntos(a, c, d):
    try: nota = float(a['nota'] or 0)
    except ValueError: nota = 0
    try: res = int(a['resenas'] or 0)
    except ValueError: res = 0
    p, por = 0, []
    if res >= 100: p += 4
    elif res >= 30: p += 3
    elif res >= 10: p += 2
    if res: por.append(f'{res} reseñas' + (f' de {str(nota).replace(".", ",")}' if nota else ''))
    if nota >= 4.7 and res >= 10: p += 1
    if a.get('h24') == 'si': p += 2; por.append('urgencias 24 h')
    if re.search(r'desatasc|cuba|pocer', a['nombre'].lower()): p += 2; por.append('desatascos: suelen tener varios técnicos')
    if c.get('email', '').strip(): p += 1
    if c.get('instagram', '').strip() or c.get('facebook', '').strip(): p += 1
    piso = bool(re.search(r'\d+\s*[º°ª]|\bpiso\b|\bprincipal\b|\bentlo\b|\bpral\b', d.lower()))
    if not piso: p += 1; por.append('local a pie de calle')
    if re.search(r'iluminaci|contratista de edificios', (a.get('categoria') or '').lower()): p -= 3
    return p, nota, res, por, piso

def hasta_txt(h):
    D = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']; M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return f'{D[h.weekday()]} {h.day} de {M[h.month - 1]}'

# los distritos de Barcelona (las claves del mapa de la web de muestra) y un punto de cada uno: para contar los minutos desde su barrio
DISTRITO = {'cve': (41.3826, 2.1769), 'eix': (41.3900, 2.1630), 'stm': (41.3735, 2.1420), 'cor': (41.3850, 2.1300), 'sar': (41.4010, 2.1300),
            'gra': (41.4036, 2.1550), 'hor': (41.4180, 2.1600), 'nou': (41.4400, 2.1770), 'and': (41.4350, 2.1900), 'smt': (41.4060, 2.1990)}

def distrito(xy):
    if not xy: return ''
    return min(DISTRITO, key=lambda k: (DISTRITO[k][0] - xy[0]) ** 2 + ((DISTRITO[k][1] - xy[1]) * 0.75) ** 2)

def clave(enlace):
    # la clave de la carta en el contador (js/oficio-visitas.js, 23-11-2026): los 12 primeros del sha256 de lo que va tras «?m=».
    # Con ella, embudo.html junta los números del servidor con esta hoja sin que el servidor sepa a qué negocio va cada carta.
    return hashlib.sha256(enlace.split('?m=', 1)[1].encode()).hexdigest()[:12]

def enlace(url, n, z, h, t='', d='', nota=0, res=0, b=''):
    """El enlace de su muestra: todo va dentro (nada se guarda en ningún sitio). nota y res: las de Google, de verdad; b: su distrito."""
    o = {'v': 1, 'n': n}
    if re.fullmatch(r'[6789]\d{8}', t or ''): o['t'] = t
    if d: o['d'] = d[:80]
    if z: o['z'] = z
    if nota and res: o['r'] = round(float(nota), 1); o['c'] = int(res)
    if b: o['b'] = b
    o['h'] = h.isoformat()
    j = json.dumps(o, ensure_ascii=False, separators=(',', ':')).encode()
    return url + '?m=' + base64.urlsafe_b64encode(j).decode().rstrip('=')

def qr_matriz(texto):
    """El QR más pequeño que se lee: cada uno se comprueba leyéndolo (con OpenCV, si está); si no se lee, el siguiente tamaño.
    (19-11-2026: con algunos enlaces, el de la versión justa salía sin leerse.)"""
    try:
        import cv2, numpy as np
        det = cv2.QRCodeDetector()
        def lee(q):
            n = q.getModuleCount(); b = 4; s = 8; a = np.full(((n + 2 * b) * s,) * 2, 255, np.uint8)
            for y in range(n):
                for x in range(n):
                    if q.isDark(y, x): a[(y + b) * s:(y + b + 1) * s, (x + b) * s:(x + b + 1) * s] = 0
            return det.detectAndDecode(cv2.cvtColor(a, cv2.COLOR_GRAY2BGR))[0]
    except ImportError: lee = None
    primero = None
    for nivel in (Q.QRErrorCorrectLevel.M, Q.QRErrorCorrectLevel.Q):
        for v in range(1, 41):
            try: q = Q.QRCode(v, nivel); q.addData(texto); q.make()
            except Exception: continue
            primero = primero or q
            if lee is None or lee(q) == texto: return q
    return primero

def qr_svg(texto, tam=136):
    q = qr_matriz(texto)
    n = q.getModuleCount(); b = 4; t = n + 2 * b
    caminos = ''.join(f'M{c + b},{r + b}h1v1h-1z' for r in range(n) for c in range(n) if q.isDark(r, c))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {t} {t}" width="{tam}" height="{tam}" shape-rendering="crispEdges"><rect width="{t}" height="{t}" fill="#fff"/><path d="{caminos}" fill="#000"/></svg>'

# ---------- El diseño (19-11-2026, noche): una carta de verdad, en A4, y su sobre C5 con su nombre ----------
# Lo que se ve primero, por este orden: su nombre, el móvil con su web, GRATIS junto al QR y hasta cuándo. El papel es
# blanco (se imprime en casa); el negro y el amarillo son los de la demo, que es lo que verá al escanear.
AQUI = os.path.dirname(os.path.abspath(__file__))
def fuente(nombre, archivo):
    try:
        with open(archivo, 'rb') as f: b = base64.b64encode(f.read()).decode()
        return f"@font-face{{font-family:'{nombre}';src:url(data:font/woff2;base64,{b}) format('woff2');font-weight:800}}"
    except OSError: return ''

CSS_CARTA = r"""@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0}
body{color:#151515;font:400 11.6pt/1.55 Lora,Georgia,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hoja{width:210mm;height:297mm;padding:14mm 17mm 10mm;display:flex;flex-direction:column;page-break-after:always;break-after:page;position:relative;overflow:hidden}
.hoja:last-child{page-break-after:auto;break-after:auto}
.cab{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:4mm;border-bottom:.3mm solid #151515}
.marca{font:700 15pt/1 "Inter Display",Inter,sans-serif;letter-spacing:.32em}
.fecha{font-style:italic;font-size:10pt;color:#555}
.arriba{display:grid;grid-template-columns:1fr 46.5mm;gap:9mm;margin-top:7mm;align-items:start}
.saludo{font-style:italic;font-size:15pt;color:#444;margin:0}
.nombre{margin:1mm 0 0;font-weight:700;line-height:1.08;letter-spacing:-.01em}
.p{margin:4.2mm 0 0;max-width:108mm}
.hecho{margin-top:4.6mm;font-weight:700;font-size:12.6pt}
.movil{position:relative;width:46.5mm;height:94mm;border-radius:7.5mm;background:#141414;padding:2.1mm;box-shadow:0 2.5mm 6mm rgba(0,0,0,.22)}
.movil img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;border-radius:5.6mm}
.pie-movil{margin:2.4mm 0 0;font:italic 9pt/1.3 Lora,serif;color:#666;text-align:center}
.gratis{display:grid;grid-template-columns:auto 1fr;gap:8mm;align-items:center;margin-top:6mm;padding:5mm 7mm;border:.7mm solid #151515;border-radius:6mm}
.gratis .qr{width:44mm;height:44mm}
.gratis .qr svg{display:block;width:100%;height:100%}
.gr{font:800 58pt/0.9 "Barlow Condensed","Inter Display",sans-serif;letter-spacing:.01em;display:inline-block;padding:1.2mm 3mm 0;background:linear-gradient(transparent 46%,#ffd23f 46%,#ffd23f 92%,transparent 92%)}
.esc{margin:3.5mm 0 0;font:700 15pt/1.25 "Inter Display",Inter,sans-serif}
.sin{margin:2mm 0 0;font:400 10.6pt/1.45 Inter,sans-serif;color:#333}
.sin b{font-weight:700;color:#151515}
.flecha{position:absolute;left:-7.4mm;top:50%;width:7mm;height:7mm;margin-top:-3.5mm}
.txt{position:relative}
.ventajas{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-top:15mm}
.v{font:400 9.8pt/1.42 Inter,sans-serif;color:#222}
.v svg{display:block;width:8mm;height:8mm;margin-bottom:2mm}
.cierre{margin-top:6mm;max-width:150mm}
.firma{margin-top:3mm;font:italic 600 22pt/1 Lora,serif;color:#1d3a8a;transform:rotate(-2.5deg);transform-origin:left;display:inline-block}
.quien{margin-top:2mm;font:400 9pt/1.3 Inter,sans-serif;color:#555}
.legal{margin-top:auto;padding-top:3mm;border-top:.2mm solid #cfcfcf;font:400 7.2pt/1.4 Inter,sans-serif;color:#777}"""

CSS_SOBRE = r"""@page{size:229mm 162mm;margin:0}*{box-sizing:border-box}html,body{margin:0}
body{color:#151515;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sobre{width:229mm;height:162mm;padding:12mm 14mm;position:relative;page-break-after:always;break-after:page;overflow:hidden}
.sobre:last-child{page-break-after:auto;break-after:auto}
.rem{font:400 8.6pt/1.4 Inter,sans-serif;color:#444}.rem b{font:700 10pt/1 "Inter Display",Inter,sans-serif;letter-spacing:.3em;color:#151515}
.sello{position:absolute;left:22mm;top:50mm;width:44mm;height:44mm;transform:rotate(-9deg)}
.para{position:absolute;left:92mm;right:14mm;top:62mm}
.para .a{font:italic 12pt/1 Lora,serif;color:#666}
.para .n{margin-top:2mm;font:700 30pt/1.08 Lora,serif;letter-spacing:-.01em}
.para .d{margin-top:3mm;font:400 11.4pt/1.45 Inter,sans-serif;color:#222}
.dentro{position:absolute;left:14mm;bottom:10mm;font:italic 13pt/1.3 Lora,serif;color:#151515}
.dentro span{padding:0 1.5mm;background:linear-gradient(transparent 52%,#ffd23f 52%,#ffd23f 92%,transparent 92%)}
.linea{position:absolute;left:14mm;right:14mm;bottom:22mm;border-top:.25mm solid #151515;opacity:.15}"""

def fuente_archivo(nombre, archivo, peso=400, estilo='normal'):
    """Una letra de la carpeta fuentes/, metida en el PDF (no hace falta tenerla instalada)."""
    try:
        with open(os.path.join(AQUI, 'fuentes', archivo), 'rb') as f: b = base64.b64encode(f.read()).decode()
    except OSError: return ''
    fmt = 'opentype' if archivo.endswith('.otf') else 'truetype'
    return f"@font-face{{font-family:'{nombre}';src:url(data:font/{fmt};base64,{b}) format('{fmt}');font-weight:{peso};font-style:{estilo}}}"

# La carta autosobre (20-11-2026): la misma hoja A4, impresa por las dos caras y doblada en tres (como una carta de las de
# antes), hace de sobre. Por fuera, tres franjas de 99 mm, de arriba abajo en la cara de atrás:
#   A · la solapa: «¡Tenemos un regalo para ti!» y las flechas de por dónde se abre (el borde de arriba de la hoja);
#   B · la cara del sobre: su nombre y su dirección, el sello de OOOX con su matasellos; va girada 180°, para que se lea
#       derecha una vez doblada;
#   C · lo primero que se ve al abrir la solapa: «Tu regalo está dentro». Doblado: primero se sube la franja de abajo y
#       luego se baja la de arriba. Imprimir a doble cara, por el lado largo.
CSS_FUERA = r"""
.fuera{width:210mm;height:297mm;position:relative;page-break-after:always;break-after:page;overflow:hidden;color:#1a1a1a}
.fuera:last-child{page-break-after:auto;break-after:auto}
.pan{position:absolute;left:0;width:210mm;height:99mm;overflow:hidden}
.pA{top:0}.pB{top:99mm;transform:rotate(180deg)}.pC{top:198mm}
.avion{position:absolute;inset:4.5mm;border:2.6mm solid transparent;border-image:repeating-linear-gradient(-45deg,#ffd23f 0 3.2mm,#fff 3.2mm 4.4mm,#151515 4.4mm 7.6mm,#fff 7.6mm 8.8mm) 4}
.scr{font-family:'Chorus',cursive;font-weight:400;font-style:normal}
.bask{font-family:'Baskerville Libre',Georgia,serif}
.cri{font-family:'Crimson It',Georgia,serif;font-style:italic}
/* A · la solapa */
.pA .abre{position:absolute;left:0;right:0;top:11mm;text-align:center;font-size:12.5pt;letter-spacing:.06em}
.pA .fl{position:absolute;top:9.5mm;width:9mm;height:12mm}
.pA .t{position:absolute;left:12mm;right:12mm;top:30mm;text-align:center;font-size:40pt;line-height:1.05}
.pA .sub{position:absolute;left:0;right:0;top:57mm;text-align:center;font-size:13pt;color:#444}
.pA .lacre{position:absolute;left:50%;bottom:14mm;width:17mm;height:17mm;margin-left:-8.5mm}
/* B · la cara del sobre */
.pB .rem{position:absolute;left:13mm;top:12mm;font-size:8.6pt;letter-spacing:.12em;text-transform:uppercase;color:#444}
.pB .sello{position:absolute;right:15mm;top:10mm;width:30mm;height:30mm;transform:rotate(6deg)}
.pB .mata{position:absolute;right:33mm;top:12mm;width:42mm;height:28mm;opacity:.55}
.pB .para{position:absolute;left:62mm;right:14mm;top:43mm}
.pB .para .a{font-size:15pt;color:#555}
.pB .para .n{font-size:30pt;line-height:1.02;margin-top:-1mm}
.pB .para .d{margin-top:2.5mm;font-size:10.8pt;line-height:1.45;padding-top:2mm;border-top:.25mm solid #1a1a1a;display:inline-block;min-width:80mm}
/* C · al abrir */
.pC .t{position:absolute;left:0;right:0;top:22mm;text-align:center;font-size:32pt;line-height:1}
.pC .x{position:absolute;left:30mm;right:30mm;top:41mm;text-align:center;font-size:12.5pt;line-height:1.4;color:#333}
.pC .fl{position:absolute;left:50%;top:70mm;width:10mm;height:14mm;margin-left:-5mm}
/* las marcas para doblar, en el borde: también en la carta */
.pl{position:absolute;width:6mm;border-top:.25mm solid #9a9a9a}.pl.i{left:0}.pl.d{right:0}"""

FLECHA_ARRIBA = '<svg class="fl" style="{}" viewBox="0 0 24 32" fill="none" stroke="#1a1a1a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 30C12 20 6 16 12 3M6 9l6-6 6 6"/></svg>'
LACRE = ('<svg class="lacre" viewBox="0 0 100 100"><path d="M50 4c9 0 12 6 20 8s14 1 18 9-1 13 1 21 8 12 4 20-10 7-14 14-4 15-13 18-13-3-21-1-13 9-21 5-6-11-12-16-15-3-17-12 6-13 5-21-7-14-1-20 13-3 20-8S41 4 50 4z" fill="#ffd23f" stroke="#151515" stroke-width="2"/>'
         '<circle cx="50" cy="50" r="27" fill="none" stroke="#151515" stroke-width="1.6"/><text x="50" y="57" text-anchor="middle" font-family="Chorus,serif" font-size="24" fill="#151515">O</text></svg>')
MATASELLOS = ('<svg class="mata" viewBox="0 0 150 100" fill="none" stroke="#1a1a1a" stroke-width="1.4"><circle cx="40" cy="50" r="30"/><circle cx="40" cy="50" r="22"/>'
              '<text x="40" y="47" text-anchor="middle" font-family="Baskerville Libre,serif" font-size="8" fill="#1a1a1a" stroke="none">BARCELONA</text>'
              '<text x="40" y="60" text-anchor="middle" font-family="Baskerville Libre,serif" font-size="8" fill="#1a1a1a" stroke="none">{fecha}</text>'
              + ''.join(f'<path d="M74 {y}c10-6 20 6 30 0s20-6 30 0 10 6 14 3"/>' for y in (30, 42, 54, 66)) + '</svg>')

def marcas_doblez():
    return ''.join(f'<i class="pl {l}" style="top:{y}mm"></i>' for y in (99, 198) for l in ('i', 'd'))

def fuera_html(d, f, fecha_corta):
    T = textos.carta_futuro(d); e = html.escape
    n = d['negocio']; tn = 30 if len(n) <= 18 else 25 if len(n) <= 26 else 21
    return (f'<section class="fuera">'
            f'<div class="pan pA"><div class="avion"></div>'
            f'{FLECHA_ARRIBA.format("left:58mm")}<p class="abre cri">{e(T["abre"])}</p>{FLECHA_ARRIBA.format("right:58mm")}'
            f'<p class="t scr">{e(T["regalo"])}</p><p class="sub cri">{e(T["regalo_sub"])}</p>{LACRE}</div>'
            f'<div class="pan pB"><div class="avion"></div><p class="rem bask">{e(T["remite"])}</p>{MATASELLOS.format(fecha=e(fecha_corta))}{SELLO}'
            f'<div class="para"><div class="a scr">{e(T["sobre_para"])}</div><div class="n scr" style="font-size:{tn}pt">{e(n)}</div>'
            f'<div class="d bask">{e(f["dir"])}<br>Barcelona</div></div></div>'
            f'<div class="pan pC">{FLECHA_ARRIBA.format("")}<p class="t scr">{e(T["dentro_t"])}</p><p class="x cri">{e(T["dentro_x"])}</p></div>'
            f'{marcas_doblez()}</section>')

def tam_nombre(n):
    """El nombre, lo más grande que quepa en dos líneas de la columna."""
    L = len(n)
    return 34 if L <= 14 else 29 if L <= 22 else 25 if L <= 30 else 21

ICONOS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4" stroke="#151515"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.5 18.5h3"/><path d="M3 9.5c1.2-1.4 1.2-3.6 0-5M21 9.5c-1.2-1.4-1.2-3.6 0-5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19c3-1 4-6 6-6s1 5 3 5 2-4 4-4 2 3 5 2"/><path d="M14 3.5 19.5 9 11 17.5H5.5V12z" stroke-width="1.4"/></svg>']
FLECHA = '<svg class="flecha" viewBox="0 0 24 24" fill="none" stroke="#151515" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H4M10 6l-6 6 6 6"/></svg>'
SELLO = ('<svg class="sello" viewBox="0 0 100 100"><g fill="#ffd23f" stroke="#151515" stroke-width="1.6">'
         + '<path d="' + ' '.join(('M' if k == 0 else 'L') + f'{50 + (47 if k % 2 == 0 else 43) * __import__("math").cos(k * 3.14159265 / 18):.2f},{50 + (47 if k % 2 == 0 else 43) * __import__("math").sin(k * 3.14159265 / 18):.2f}' for k in range(36)) + 'Z"/>'
         + '<circle cx="50" cy="50" r="34" fill="none"/></g><text x="50" y="55" text-anchor="middle" font-family="Inter Display,Inter,sans-serif" font-weight="700" font-size="15" letter-spacing="3" fill="#151515">OOOX</text>'
         + '<text x="50" y="70" text-anchor="middle" font-family="Lora,serif" font-style="italic" font-size="7.5" fill="#151515">Barcelona · 2026</text></svg>')

def carta_html(d, f, fecha, foto):
    T = textos.carta_futuro(d); e = html.escape
    return (f'<section class="hoja"><div class="cab"><span class="marca">OOOX</span><span class="fecha">Barcelona, {e(fecha)}</span></div>'
            f'<div class="arriba"><div><p class="saludo">{e(T["saludo"])}</p><h1 class="nombre" style="font-size:{tam_nombre(T["nombre"])}pt">{e(T["nombre"])}</h1>'
            + ''.join(f'<p class="p">{e(x)}</p>' for x in T['p']) + f'<p class="hecho">{e(T["hecho"])}</p></div>'
            f'<div><div class="movil"><img src="{foto}" alt=""></div><p class="pie-movil">{e(T["pie_movil"])}</p></div></div>'
            f'<div class="gratis"><div class="qr">{qr_svg(d["enlace"], 200)}</div><div class="txt">{FLECHA}<span class="gr">{e(T["gratis"])}</span>'
            f'<p class="esc">{e(T["escanea"])}</p><p class="sin">{e(T["sin"]).replace(e(d["hasta"]), "<b>" + e(d["hasta"]) + "</b>")}</p></div></div>'
            '<div class="ventajas">' + ''.join(f'<div class="v">{ICONOS[i]}{e(x)}</div>' for i, x in enumerate(T['ventajas'])) + '</div>'
            f'<p class="cierre">{e(T["cierre"])}</p><div class="firma">{e(T["firma"])}</div><p class="quien">{e(T["firma"])} · {e(T["firma_pie"])}</p>'
            f'<p class="legal">{e(T["legal"])}</p>{marcas_doblez()}</section>')

def sobre_html(d, f):
    T = textos.carta_futuro(d); e = html.escape
    return (f'<section class="sobre"><div class="rem"><b>OOOX</b><br>Oscar Conesa · Barcelona</div>{SELLO}'
            f'<div class="para"><div class="a">{e(T["sobre_para"])}</div><div class="n">{e(d["negocio"])}</div>'
            f'<div class="d">{e(f["dir"])}<br>Barcelona</div></div><div class="linea"></div>'
            f'<div class="dentro"><span>{e(T["sobre_dentro"])}</span></div></section>')

async def fotos(urls, salida):
    """La web de citas de cada uno, con su nombre, como la vería su cliente en el móvil (sin el aviso de muestra)."""
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={'width': 390, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await c.new_page()
        for i, u in enumerate(urls):
            await pg.goto(u, wait_until='load'); await pg.wait_for_selector('main h1'); await pg.add_style_tag(content='#muestraOoox{display:none!important}')
            await pg.wait_for_timeout(350); await pg.screenshot(path=os.path.join(salida, f'movil-{i + 1:02d}.jpg'), type='jpeg', quality=86)
        await b.close()

async def pdf(htmltxt, salida):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.set_content(htmltxt, wait_until='load'); await pg.wait_for_timeout(300); await pg.pdf(path=salida, prefer_css_page_size=True, print_background=True)
        await b.close()

def servir(carpeta):
    """La demo, servida en local para hacer las fotos de los móviles."""
    import http.server, socketserver, threading, functools
    class Callado(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    H = functools.partial(Callado, directory=carpeta)
    s = socketserver.TCPServer(('127.0.0.1', 0), H); threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, f'http://127.0.0.1:{s.server_address[1]}/'

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--lista', required=True); ap.add_argument('--contactos', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--max', type=int, default=40); ap.add_argument('--sitio', default=os.path.join(AQUI, '../../../frontend/public/demos/ramirez-24h')); ap.add_argument('--hasta', default=''); ap.add_argument('--url', default=URL); ap.add_argument('--fecha', default=''); ap.add_argument('--sobre-c5', action='store_true', help='además, los sobres C5 de antes')
    o = ap.parse_args()
    L = list(csv.DictReader(open(o.lista, encoding='utf-8-sig'), delimiter=';')); C = list(csv.DictReader(open(o.contactos, encoding='utf-8-sig'), delimiter=';'))
    assert len(L) == len(C) and all(a['nombre'] == c['nombre'] for a, c in zip(L, C)), 'las dos listas no van fila a fila'
    hoy = datetime.date.today(); h = datetime.date.fromisoformat(o.hasta) if o.hasta else hoy + datetime.timedelta(days=30)
    assert 0 <= (h - hoy).days <= 90, 'la muestra dura como mucho 90 días'
    M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    fecha = o.fecha or f'{M[hoy.month - 1]} de {hoy.year}'
    filas, vistos = [], set()
    for a, c in zip(L, C):
        t = tel9(a['telefono']); d = (a['direccion'] or c['direccion'] or '').strip(); xy = coord(a['url'])
        if any(t.startswith(g) for g in GRANJA) or not d or 'privada' in d.lower(): continue
        if not (a['zona'] == 'Cataluña/Barcelona' or any(m in d.lower() for m in METRO) or (xy and 41.33 < xy[0] < 41.48 and 2.07 < xy[1] < 2.26)): continue
        z, barrio = zona_de(d, xy)
        if not z: continue
        k = t or a['nombre'].lower()
        if k in vistos: continue
        vistos.add(k)
        p, nota, res, por, piso = puntos(a, c, d)
        if p < 0: continue
        filas.append(dict(z=z, barrio=barrio, dis=distrito(xy), p=p, nota=nota, res=res, por=por, piso=piso, nombre=a['nombre'].strip(), corto=nombre_corto(a['nombre']), tel=t, dir=d,
                          cat=a.get('categoria', ''), web=c.get('web', ''), email=c.get('email', ''), ig=c.get('instagram', ''), maps=a.get('url', ''), fuente=a.get('fuente', '')))
    filas.sort(key=lambda r: (-r['p'], -r['res'])); filas = filas[:o.max]
    filas.sort(key=lambda r: (list(NOM_ZONA).index(r['z']), -r['p'], -r['res']))   # por zonas, para ir de visita o repartir
    os.makedirs(o.out, exist_ok=True); fo = os.path.join(o.out, 'moviles'); os.makedirs(fo, exist_ok=True)
    for r in filas: r['enlace'] = enlace(o.url, r['corto'], r['barrio'], h, r['tel'], r['dir'], r['nota'], r['res'], r['dis'])
    # la foto de su web de citas con su nombre: de la demo de este repositorio, servida en local con el mismo enlace
    srv, base = servir(o.sitio)
    try: asyncio.run(fotos([base + 'cita.html?' + r['enlace'].split('?', 1)[1] for r in filas], fo))
    finally: srv.shutdown()
    cartas, sobres = [], []
    for i, r in enumerate(filas):
        d = dict(negocio=r['corto'], oficio=textos.oficio_de(r['cat'], r['nombre']), persona='', enlace=r['enlace'], hasta=hasta_txt(h), whatsapp=textos.WHATSAPP,
                 fuente='Google Maps' if r['fuente'] == 'google' else 'Bing Maps')
        with open(os.path.join(fo, f'movil-{i + 1:02d}.jpg'), 'rb') as fh: foto = 'data:image/jpeg;base64,' + base64.b64encode(fh.read()).decode()
        cartas.append(carta_html(d, r, fecha, foto) + fuera_html(d, r, hoy.strftime('%d.%m.%Y'))); sobres.append(sobre_html(d, r))
    FU = (fuente('Barlow Condensed', os.path.join(o.sitio, 'assets/fuentes/barlow-condensed-800.woff2')) + fuente_archivo('Chorus', 'texgyrechorus-mediumitalic.otf')
          + fuente_archivo('Baskerville Libre', 'LibreBaskerville-Regular.ttf') + fuente_archivo('Crimson It', 'CrimsonPro-Italic.ttf', estilo='italic'))
    asyncio.run(pdf('<!doctype html><html lang="es"><meta charset="utf-8"><style>' + FU + CSS_CARTA + CSS_FUERA + '</style><body>' + ''.join(cartas) + '</body></html>', os.path.join(o.out, 'cartas.pdf')))
    if o.sobre_c5: asyncio.run(pdf('<!doctype html><html lang="es"><meta charset="utf-8"><style>' + CSS_SOBRE + '</style><body>' + ''.join(sobres) + '</body></html>', os.path.join(o.out, 'sobres-C5.pdf')))
    with open(os.path.join(o.out, 'hoja.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter=';')
        w.writerow(['Orden', 'Zona', 'Negocio', 'En la carta', 'Teléfono', 'Dirección', 'Nota', 'Reseñas', 'Por qué', 'Web', 'Correo', 'Instagram', 'Maps', 'Su muestra', 'Hasta',
                    'Carta (fecha)', 'Visita (fecha)', 'Permiso (cómo y cuándo)', 'Nos escribe (fecha)', 'Seguimiento 1', 'Seguimiento 2', 'Estado', 'Notas', 'Clave (contador)'])
        for i, r in enumerate(filas, 1):
            w.writerow([i, NOM_ZONA[r['z']], r['nombre'], r['corto'], r['tel'], r['dir'], str(r['nota']).replace('.', ',') if r['nota'] else '', r['res'] or '', ' · '.join(r['por']),
                        r['web'], r['email'], r['ig'], r['maps'], r['enlace'], h.isoformat(), '', '', '', '', '', '', 'Por mandar', '', clave(r['enlace'])])
    print(f'{len(filas)} cartas A4 (cada una con su sobre detrás) · muestras hasta el {h.isoformat()} · {o.out}')

if __name__ == '__main__': main()
