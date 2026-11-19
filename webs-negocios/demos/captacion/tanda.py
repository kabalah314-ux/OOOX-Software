# La tanda de cartas de captación de OOOX Oficios (19-11-2026): de la lista de negocios (que nunca entra en este
# repositorio, que es público) saca, para los primeros de cada zona de Barcelona:
#   cartas.pdf  dos cartas A5 por hoja A4 (se imprime en horizontal y se corta por la mitad), cada una con el código QR
#               de su muestra: la demo con su nombre dentro del enlace (?m=…, ver «muestraDe» en js/oficio-estado.js)
#   hoja.csv    una fila por negocio, en el orden de las cartas, para apuntar la visita, el permiso y los seguimientos
# Antes de mandarlas: pasar la lista por la Lista Robinson (las de autónomos) y publicar la demo (el enlace es de ooox.es).
# Uso: python3 tanda.py --lista <lista-larga.csv> --contactos <contactos.csv> --out <carpeta> [--max 40] [--hasta 2026-12-20]
import argparse, base64, csv, datetime, html, json, os, re, sys, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textos
from reportlab.graphics.barcode import qrencoder as Q

URL = 'https://ooox.es/demos/ramirez-24h/prueba.html'
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

def enlace(url, n, z, h):
    j = json.dumps({'v': 1, 'n': n, 'z': z, 'h': h.isoformat()}, ensure_ascii=False, separators=(',', ':')).encode()
    return url + '?m=' + base64.urlsafe_b64encode(j).decode().rstrip('=')

def qr_svg(texto, tam=118):
    for v in range(1, 41):
        try: q = Q.QRCode(v, Q.QRErrorCorrectLevel.M); q.addData(texto); q.make(); break
        except Exception: continue
    n = q.getModuleCount(); b = 4; t = n + 2 * b
    caminos = ''.join(f'M{c + b},{r + b}h1v1h-1z' for r in range(n) for c in range(n) if q.isDark(r, c))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {t} {t}" width="{tam}" height="{tam}" shape-rendering="crispEdges"><rect width="{t}" height="{t}" fill="#fff"/><path d="{caminos}" fill="#000"/></svg>'

CSS = '''@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0}
body{font:400 10.4pt/1.42 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#141414}
.hoja{width:297mm;height:210mm;display:flex;page-break-after:always;break-after:page}.hoja:last-child{page-break-after:auto;break-after:auto}
.carta{width:148.5mm;height:210mm;padding:13mm 13mm 11mm;display:flex;flex-direction:column;position:relative}
.carta+.carta{border-left:.3mm dashed #b9b9b9}
.cab{display:flex;justify-content:space-between;align-items:baseline;font-size:8.6pt;color:#555}
.marca{font:700 13pt/1 Georgia,"Times New Roman",serif;letter-spacing:.08em;color:#141414}
.para{margin-top:7mm;font-size:8.8pt;line-height:1.35;color:#333}
h1{margin:6mm 0 0;font:700 14pt/1.2 "Helvetica Neue",Helvetica,Arial,sans-serif}
p{margin:2.6mm 0 0}.qr{display:flex;align-items:center;gap:5mm;margin:4mm 0 1mm;padding:3mm;border:.4mm solid #141414;border-radius:3mm}
.qr p{margin:0;font-weight:600}.firma{margin-top:4mm;font-weight:700}.pd{margin-top:3mm;font-size:9.2pt}
.pie{margin-top:auto;padding-top:3mm;border-top:.2mm solid #ccc;font-size:7.2pt;line-height:1.35;color:#666}'''

def carta_html(d, f, fecha):
    P = textos.carta(d).split('\n\n')
    # [0] «Negocio:», [1] la escena, [2] «Te he preparado…», [3] el QR, [4] qué es, [5] WhatsApp, [6] firma, [7] P.D., [8] pie
    e = html.escape
    return (f'<section class="carta"><div class="cab"><span class="marca">OOOX</span><span>Barcelona, {e(fecha)}</span></div>'
            f'<div class="para">{e(f["corto"])}<br>{e(f["dir"])}</div>'
            f'<h1>{e(P[0])}</h1><p>{e(P[1])}</p><p><b>{e(P[2])}</b></p>'
            f'<div class="qr">{qr_svg(d["enlace"])}<p>Escanéalo con el móvil.</p></div>'
            f'<p>{e(P[4])}</p><p>{e(P[5])}</p><p class="firma">{e(P[6])}</p><p class="pd">{e(P[7])}</p>'
            f'<p class="pie">{e(P[8].replace("(Al pie, pequeño) ", ""))}</p></section>')

async def pdf(htmltxt, salida):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.set_content(htmltxt, wait_until='load'); await pg.pdf(path=salida, prefer_css_page_size=True, print_background=True)
        await b.close()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--lista', required=True); ap.add_argument('--contactos', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--max', type=int, default=40); ap.add_argument('--hasta', default=''); ap.add_argument('--url', default=URL); ap.add_argument('--fecha', default='')
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
        filas.append(dict(z=z, barrio=barrio, p=p, nota=nota, res=res, por=por, piso=piso, nombre=a['nombre'].strip(), corto=nombre_corto(a['nombre']), tel=t, dir=d,
                          cat=a.get('categoria', ''), web=c.get('web', ''), email=c.get('email', ''), ig=c.get('instagram', ''), maps=a.get('url', ''), fuente=a.get('fuente', '')))
    filas.sort(key=lambda r: (-r['p'], -r['res'])); filas = filas[:o.max]
    filas.sort(key=lambda r: (list(NOM_ZONA).index(r['z']), -r['p'], -r['res']))   # por zonas, para ir de visita o repartir
    os.makedirs(o.out, exist_ok=True); cartas = []
    for r in filas:
        r['enlace'] = enlace(o.url, r['corto'], r['barrio'], h)
        d = dict(negocio=r['corto'], oficio=textos.oficio_de(r['cat'], r['nombre']), persona='', enlace=r['enlace'], hasta=hasta_txt(h), whatsapp=textos.WHATSAPP,
                 fuente='Google Maps' if r['fuente'] == 'google' else 'Bing Maps')
        cartas.append(carta_html(d, r, fecha))
    hojas = ''.join('<div class="hoja">' + ''.join(cartas[i:i + 2]) + '</div>' for i in range(0, len(cartas), 2))
    asyncio.run(pdf('<!doctype html><html lang="es"><meta charset="utf-8"><style>' + CSS + '</style><body>' + hojas + '</body></html>', os.path.join(o.out, 'cartas.pdf')))
    with open(os.path.join(o.out, 'hoja.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, delimiter=';')
        w.writerow(['Orden', 'Zona', 'Negocio', 'En la carta', 'Teléfono', 'Dirección', 'Nota', 'Reseñas', 'Por qué', 'Web', 'Correo', 'Instagram', 'Maps', 'Su muestra', 'Hasta',
                    'Carta (fecha)', 'Visita (fecha)', 'Permiso (cómo y cuándo)', 'Nos escribe (fecha)', 'Seguimiento 1', 'Seguimiento 2', 'Estado', 'Notas'])
        for i, r in enumerate(filas, 1):
            w.writerow([i, NOM_ZONA[r['z']], r['nombre'], r['corto'], r['tel'], r['dir'], str(r['nota']).replace('.', ',') if r['nota'] else '', r['res'] or '', ' · '.join(r['por']),
                        r['web'], r['email'], r['ig'], r['maps'], r['enlace'], h.isoformat(), '', '', '', '', '', '', 'Por mandar', ''])
    print(f'{len(filas)} cartas en {len(hojas) and (len(cartas) + 1) // 2} hojas · muestras hasta el {h.isoformat()} · {o.out}')

if __name__ == '__main__': main()
