#!/usr/bin/env bash
# El vídeo de venta de OOOX Oficios, de cero: las pantallas de la demo, el escenario fotograma a fotograma, la música
# y el archivo final en la demo (assets/video). Unos 5 minutos. Uso: bash hacer.sh [carpeta de trabajo]
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"; SITIO="$AQUI/../../../frontend/public/demos/ramirez-24h"; W="${1:-/tmp/video-venta}"
mkdir -p "$W/fuentes" "$W/out"; cp "$AQUI/escenario.html" "$W/"; cp "$SITIO"/assets/fuentes/*.woff2 "$W/fuentes/"
( cd "$SITIO" && exec python3 -m http.server 8790 >/dev/null 2>&1 ) & S1=$!
( cd "$W" && exec python3 -m http.server 8791 >/dev/null 2>&1 ) & S2=$!
trap 'kill $S1 $S2 2>/dev/null' EXIT; sleep 1.5
python3 "$AQUI/captura.py" "$W"
python3 "$AQUI/render.py" "$W" video
python3 "$AQUI/render.py" "$W" portada
# los toques y el abanico de papeles caen donde dicen las escenas (inicio de cada escena + su momento)
read -r DUR TOQUES ABANICO < <(python3 - "$W" <<'PY'
import itertools, json, sys
D=[5.2,7,9.4,9.4,10,9,10,7.4,9.6,6.6]; S=[0]+list(itertools.accumulate(D))
T=[(1,4.4),(2,1.6),(2,3.2),(2,5.6),(3,6.2),(4,2.2),(5,6.7),(6,2.6)]
print(round(S[-1],2), json.dumps([round(S[i]+t,2) for i,t in T]).replace(' ',''), round(S[6]+3.5,2))
PY
)
python3 "$AQUI/musica.py" "$DUR" "$TOQUES" "$ABANICO" "$W/out/musica.wav"
( cd "$W/out" && ls esc*.mp4 | sed "s/^/file '/;s/$/'/" > lista.txt && ffmpeg -v error -y -f concat -safe 0 -i lista.txt -c copy video-mudo.mp4 \
  && ffmpeg -v error -y -i video-mudo.mp4 -i musica.wav -map 0:v -map 1:a -c:v copy -af "volume=-2dB" -c:a aac -b:a 160k -shortest -movflags +faststart final.tmp.mp4 \
  && mv final.tmp.mp4 oficios-demo.mp4 )
mkdir -p "$SITIO/assets/video"; cp "$W/out/oficios-demo.mp4" "$SITIO/assets/video/"
python3 - "$W" "$SITIO" <<'PY'
import sys; from PIL import Image
W,S=sys.argv[1],sys.argv[2]
Image.open(W+'/out/portada.jpg').save(S+'/assets/video/oficios-demo-portada.jpg',quality=84,optimize=True,progressive=True)
Image.open(W+'/out/portada-boton.jpg').resize((1200,675),Image.LANCZOS).save(S+'/assets/video/oficios-demo-correo.jpg',quality=86,optimize=True,progressive=True)
PY
echo "Listo: $SITIO/assets/video/oficios-demo.mp4"
