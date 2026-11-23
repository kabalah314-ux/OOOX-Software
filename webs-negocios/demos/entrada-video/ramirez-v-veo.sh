#!/bin/bash
# Vertical de Ramírez (13-11-2026): el clip de Veo 3.1 Fast ya viene a 720x1280, así que no pasa por entrada.py.
# Uso: ./ramirez-v-veo.sh <entrada-v-veo31fast.mp4> <carpeta de salida>
# 1,25x exacto (24 fps del clip -> 30 de salida, fotograma a fotograma) hasta que Jordi llega al portal (fotograma 139);
# después la cola, que casi no se mueve, pasa acelerada y el último fotograma se queda uno más.
set -e
SRC=$1; OUT=${2:-.}; mkdir -p "$OUT"
SEL="lte(n\,139)"; for i in 141 144 148 153 159 166 173 179 184 189; do SEL="$SEL+eq(n\,$i)"; done
ffmpeg -v error -y -i "$SRC" -an -vf "select='$SEL',setpts=N/(30*TB),tpad=stop_mode=clone:stop=1" -r 30 -c:v libx264 -preset veryfast -crf 0 "$OUT/v-inter.mkv"
# Flow etiqueta el color como BT.601; se pasa a BT.709 (lo que esperan todos los navegadores en HD) y se etiqueta.
VF="scale=in_color_matrix=bt601:in_range=tv:out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+full_chroma_inp,format=yuv420p"
ffmpeg -v error -y -i "$OUT/v-inter.mkv" -an -vf "$VF" -c:v libx264 -preset slower -profile:v high -level 4.0 -g 8 -keyint_min 8 -sc_threshold 0 \
  -crf 27 -x264-params "zones=0,0,q=22/149,150,q=20" -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv \
  -movflags +faststart "$OUT/entrada-v.mp4"
# Póster = primer fotograma, con la misma conversión de color que hará el navegador.
ffmpeg -v error -y -i "$OUT/v-inter.mkv" -frames:v 1 -vf "scale=in_color_matrix=bt601:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int+full_chroma_inp,format=rgb24" "$OUT/v-poster.png"
python3 -c "
from PIL import Image
Image.open('$OUT/v-poster.png').convert('RGB').save('$OUT/entrada-v-poster.jpg',quality=80,progressive=True,optimize=True,subsampling=2)"
rm -f "$OUT/v-inter.mkv" "$OUT/v-poster.png"
ls -la "$OUT/entrada-v.mp4" "$OUT/entrada-v-poster.jpg"
