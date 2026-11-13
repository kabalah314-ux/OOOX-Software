#!/usr/bin/env python3
"""Vídeo de entrada de una web a partir de un clip de IA hecho entre dos fotos.

    python3 entrada.py <config.json>

El clip (Flow: «fotogramas a vídeo», cámara fija) sale blando y con ruido, y su primer
y último fotograma solo se parecen a las fotos. Este script lo deja listo para la web:

  1. Encaja las dos fotos sobre el primer y el último fotograma del clip.
  2. Mira, fotograma a fotograma, qué zonas están quietas (iguales que al principio
     o que al final). Tolera cambios de luz (los faros barriendo una pared).
  3. En lo quieto pone el detalle de las fotos; lo que se mueve (y la luz) viene del
     vídeo. El primer fotograma es exactamente la foto de llegada y el último
     exactamente la del final.
  4. Cambia el ritmo (más deprisa lo lejano, natural lo cercano, cola comprimida).
  5. Codifica H.264 con una clave cada 8 fotogramas (el scroll mueve el vídeo), arranque
     rápido y color etiquetado, y saca el póster (= primer fotograma).

Necesita ffmpeg, numpy y opencv. El clip puede venir a 360p o a 720p.
"""
import json, os, subprocess, sys
import numpy as np
import cv2

cfg_path = sys.argv[1]
C = json.load(open(cfg_path, encoding='utf-8'))
BASE = os.path.dirname(os.path.abspath(cfg_path))
ruta = lambda p: p if os.path.isabs(p) else os.path.join(BASE, p)
VIDEO, FOTO_A, FOTO_B = ruta(C['video']), ruta(C['primera']), ruta(C['ultima'])
SALIDA = ruta(C['salida'])                       # sin extensión: <salida>.mp4 y <salida>-poster.jpg
os.makedirs(os.path.dirname(SALIDA) or '.', exist_ok=True)
W, H = int(C.get('ancho', 1280)), int(C.get('alto', 720))
FPS = float(C.get('fps', 30))
VEL = C.get('velocidad', [[0, 1.25]])            # [[segundo del clip, velocidad], ...] interpolada por tramos
COLA = int(C.get('cola', 23))                    # fotogramas finales del clip en los que todo funde hacia la foto final
ARRANQUE = int(C.get('arranque', 10))            # fotogramas del clip en los que se va la foto de llegada
NITIDEZ = float(C.get('nitidez', 0.6))           # enfoque suave de lo que se mueve
SIG = float(C.get('corte', 10.0))                # px de salida: por encima, luz y bulto del vídeo; por debajo, detalle de la foto
ROTULOS = C.get('rotulos', [])                   # [x0,y0,x1,y1] a tamaño de trabajo: rótulos que el vídeo deforma
CRF = float(C.get('crf', 25.5))


def sonda(path):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
                        'stream=width,height,r_frame_rate,nb_read_frames', '-of', 'json', path], capture_output=True, text=True).stdout
    s = json.loads(o)['streams'][0]
    a, b = s['r_frame_rate'].split('/')
    return int(s['width']), int(s['height']), float(a) / float(b), int(s['nb_read_frames'])


VW, VH, VFPS, N = sonda(VIDEO)
k = 360.0 / min(VW, VH)                          # las máscaras se calculan con el lado corto a 360 px
MW, MH = (VW, VH) if k >= 1 else (int(round(VW * k / 2) * 2), int(round(VH * k / 2) * 2))
print(f'clip {VW}x{VH} a {VFPS:g} fps, {N} fotogramas · trabajo {MW}x{MH} · salida {W}x{H} a {FPS:g} fps')


def leer(path, w, h):
    vf = [] if (w, h) == (VW, VH) else ['-vf', f'scale={w}:{h}:flags=area']
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *vf, '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w, 3)


class Seguido:
    """Fotogramas del clip a su tamaño, de uno en uno y hacia delante."""
    def __init__(self, path):
        self.p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
        self.i = -1; self.f = None
    def dame(self, i):
        while self.i < i:
            self.f = np.frombuffer(self.p.stdout.read(VW * VH * 3), dtype=np.uint8).reshape(VH, VW, 3); self.i += 1
        return self.f


def gris(x): return cv2.cvtColor(x, cv2.COLOR_BGR2GRAY).astype(np.float32)
def G(x, s): return cv2.GaussianBlur(x, (0, 0), s)
def sube(f): return cv2.resize(f.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
def suave(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
def paso(x, a, b): return np.clip((b - x) / (b - a), 0, 1)        # 1 por debajo de a, 0 por encima de b


# ---------- 1. las fotos, encajadas sobre el primer y el último fotograma ----------
V = leer(VIDEO, MW, MH)
Vf = V.astype(np.float32)
seg = Seguido(VIDEO); PRIMERO = seg.dame(0).copy()
s2 = Seguido(VIDEO); ULTIMO = s2.dame(N - 1).copy(); s2.p.kill(); del s2


def encaja(foto, fot, nombre):
    P = cv2.imread(foto); U = sube(fot)
    ph, pw = P.shape[:2]; s = max(W / pw, H / ph)
    M0 = np.array([[s, 0, (W - pw * s) / 2], [0, s, (H - ph * s) / 2]], dtype=np.float32)
    Mi = cv2.invertAffineTransform(M0).astype(np.float32)             # coordenadas de salida -> coordenadas de la foto
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7)
    cc, Mi = cv2.findTransformECC(G(gris(U.clip(0, 255).astype(np.uint8)), 2.0), G(gris(P), 2.0), Mi, cv2.MOTION_AFFINE, crit, None, 5)
    al = cv2.warpAffine(P, Mi, (W, H), flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    print(f'foto {nombre}: encaje {cc:.4f} (escala {Mi[0, 0]:.4f}, desplazamiento {Mi[0, 2]:.1f},{Mi[1, 2]:.1f})')
    if cc < 0.97: print('  OJO: encaje bajo; comprueba que la foto es la que se usó para generar el clip')
    return al.astype(np.float32)


A = encaja(FOTO_A, PRIMERO, 'de llegada'); B = encaja(FOTO_B, ULTIMO, 'final')

# ---------- 2. qué está quieto ----------
L = np.stack([gris(f) for f in V])
MU = np.stack([G(f, 2.0) for f in Vf]); ML = np.stack([G(l, 2.0) for l in L]); VL = np.stack([G(l * l, 2.0) for l in L]) - ML * ML


def igual(t, r):
    d = np.abs(MU[t] - MU[r]).max(axis=2)
    cov = G(L[t] * L[r], 2.0) - ML[t] * ML[r]
    cs = (2 * cov + 60.0) / (VL[t] + VL[r] + 60.0)                     # misma estructura
    ratio = (MU[t] + 8.0) / (MU[r] + 8.0); gan = ratio.mean(axis=2)
    croma = np.abs(ratio / gan[..., None] - 1).max(axis=2)
    luz = paso(np.abs(np.log(gan)), 0.33, 0.50) * paso(croma, 0.07, 0.14) * (1 - paso(cs, 0.45, 0.70))   # solo cambió la luz
    return (1 - paso(cs, 0.30, 0.60)) * np.maximum(paso(d, 16, 32), luz)


k7 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)); k21 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))


def limpia(m):
    m = np.clip((G(m, 2.0) - 0.35) / 0.4, 0, 1)                       # sin moteado
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k21)                       # fuera las islas de «quieto» dentro de lo que se mueve
    return cv2.erode(m, k7)                                            # y la foto, lejos del borde de lo que se mueve


def erosion_t(m, n):
    out = m.copy()
    for d in range(1, n + 1):
        out[d:] = np.minimum(out[d:], m[:-d]); out[:-d] = np.minimum(out[:-d], m[d:])
    return out


def media_t(m, n):
    acc = m.copy(); c = np.ones(len(m), np.float32)
    for d in range(1, n + 1):
        acc[d:] += m[:-d]; c[d:] += 1; acc[:-d] += m[d:]; c[:-d] += 1
    return acc / c[:, None, None]


def lenta(c, sub=0.1):                                                 # el detalle llega poco a poco y se va deprisa
    out = c.copy()
    for t in range(1, len(c)): out[t] = np.minimum(c[t], out[t - 1] + sub)
    return out


def racha(on):
    p = np.zeros_like(on)
    for t in range(N): p[t] = on[t] if t == 0 else (p[t - 1] + 1) * on[t]
    return p


print('máscaras…')
sA = lenta(media_t(erosion_t(np.stack([limpia(igual(t, 0)) for t in range(N)]), 5), 2))
sB = lenta(media_t(erosion_t(np.stack([limpia(igual(t, N - 1)) for t in range(N)]), 5), 2))
sA[0] = 1; sB[-1] = 1
sA = np.stack([G(m, 1.5) for m in sA]); sB = np.stack([G(m, 1.5) for m in sB]); sA[0] = 1; sB[-1] = 1
# lo que lleva un rato igual que el final y no estaba al principio (lo recién aparcado) pasa a ser la foto tal cual
gB = np.stack([G(np.clip((p - 2) / 8.0, 0, 1), 2.0) for p in racha((sB >= 0.98).astype(np.float32))])
if ROTULOS:
    G4 = np.stack([G(f, 4.0) for f in Vf])
    for (x0, y0, x1, y1) in ROTULOS:                                   # en cuanto nada lo tapa, el rótulo es el de la foto
        ya, yb, xa, xb = max(0, y0 - 8), min(MH, y1 + 8), max(0, x0 - 8), min(MW, x1 + 8)
        libre = [float((np.abs(G4[t][ya:yb, xa:xb] - G4[N - 1][ya:yb, xa:xb]).max(axis=2) < 14).mean()) >= 0.97 for t in range(N)]
        pluma = np.zeros((MH, MW), np.float32); pluma[y0:y1, x0:x1] = 1; pluma = G(pluma, 3.0); r = 0
        for t in range(N):
            r = (r + 1) if libre[t] else 0
            gB[t] = np.maximum(gB[t], pluma * float(np.clip((r - 3) / 6.0, 0, 1)))
    del G4
del MU, ML, VL, L, Vf

# ---------- 3. cada fotograma ----------
def ajuste(u, p):                                                      # tono del vídeo hacia el de la foto (por canal)
    gu, gp = G(u, 6).reshape(-1, 3), G(p, 6).reshape(-1, 3)
    return np.array([np.polyfit(gu[:, c], gp[:, c], 1) for c in range(3)], np.float32)


ajA, ajB = ajuste(sube(PRIMERO), A), ajuste(sube(ULTIMO), B)
HA, HB = A - G(A, SIG), B - G(B, SIG); GA6, GB6 = G(A, 6), G(B, 6)
m2s = lambda m: cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)


def fotograma(t, f_orig):
    tau = suave(t / (N - 1))
    aj = ajA * (1 - tau) + ajB * tau
    u = sube(f_orig) * aj[:, 0] + aj[:, 1]
    a, b = m2s(sA[t]), m2s(sB[t])
    pa, pb = a * (1 - tau), b * tau
    tot = np.maximum(a, b); den = pa + pb + 1e-4
    wa, wb = (tot * pa / den)[..., None], (tot * pb / den)[..., None]
    out = u + wa * HA + wb * HB - (wa + wb) * (u - G(u, SIG))
    if NITIDEZ: out += (1 - wa - wb) * NITIDEZ * (u - G(u, 1.6))
    P = (pa[..., None] * A + pb[..., None] * B) / den[..., None]
    gu6 = G(u, 6)
    d = (pa * np.abs(gu6 - GA6).max(axis=2) + pb * np.abs(gu6 - GB6).max(axis=2)) / den
    f = tot * np.clip((26.0 - d) / 12.0, 0, 1)                         # misma luz que la foto: la foto tal cual
    f = np.maximum(f, suave(1 - t / 8.0) * a)
    f = np.maximum(f, (1 - a) * m2s(gB[t]))
    out = out * (1 - f[..., None]) + P * f[..., None]
    kB = suave((t - (N - 1 - COLA)) / float(COLA))
    if kB > 0: out = out * (1 - kB) + B * kB
    kG = suave(1 - t / float(ARRANQUE))
    if kG > 0: out = out * (1 - kG) + A * kG
    return np.rint(np.clip(out, 0, 255)).astype(np.uint8)


# ---------- 4. ritmo ----------
xs, vs = [p[0] for p in VEL], [p[1] for p in VEL]
vel = lambda s: float(np.interp(s, xs, vs))
idx = []; s = 0.0
while True:
    i = int(round(s * VFPS))
    if i >= N - 1: break
    if not idx or i > idx[-1]: idx.append(i)
    for _ in range(8): s += vel(s) / FPS / 8
idx += [N - 1] * 3                                                     # el último, y se queda quieto
while (len(idx) - 1) % 8 in (0, 1): idx.append(N - 1)                  # que el fotograma de reposo no caiga en una clave
n_out = len(idx)
print(f'{n_out} fotogramas de salida, {n_out / FPS:.2f} s')

inter = SALIDA + '-inter.mkv'
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '0', '-pix_fmt', 'yuv444p', inter], stdin=subprocess.PIPE)
ult = (-1, None)
for i in idx:
    if i != ult[0]: ult = (i, fotograma(i, seg.dame(i)))
    p.stdin.write(ult[1].tobytes())
p.stdin.close(); p.wait()

# ---------- 5. para la web ----------
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', inter, '-an',
                '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+lanczos,format=yuv420p',
                '-c:v', 'libx264', '-preset', 'slower', '-profile:v', 'high', '-level', '4.0', '-g', '8', '-keyint_min', '8', '-sc_threshold', '0',
                '-crf', str(CRF), '-x264-params', f'zones=0,0,q=21/{n_out - 4},{n_out - 1},q=18',
                '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-color_range', 'tv',
                '-movflags', '+faststart', SALIDA + '.mp4'], check=True)
cv2.imwrite(SALIDA + '-poster.jpg', np.rint(A).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 80, cv2.IMWRITE_JPEG_PROGRESSIVE, 1, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
cols = 6; filas = int(np.ceil(n_out / (FPS / 3) / cols))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SALIDA + '.mp4', '-vf', f'fps=3,scale={320 if W >= H else 180}:-1,tile={cols}x{max(1, filas)}', '-frames:v', '1', SALIDA + '-hoja.jpg'])
if not C.get('guardar_intermedio'): os.remove(inter)
print(f'{SALIDA}.mp4: {os.path.getsize(SALIDA + ".mp4") / 1e6:.2f} MB · póster {os.path.getsize(SALIDA + "-poster.jpg") / 1e3:.0f} kB · hoja de control en {SALIDA}-hoja.jpg')
