#!/bin/bash
# Monta el clip a partir de los frames renderizados: 15 fps -> 30 fps interpolado, con fundidos entre escenas
set -e
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
F=/app/scripts/frames
OUT=/app/frontend/public/videos
mkdir -p $OUT /tmp/clips
seg() { # seg name start count
  $FF -y -loglevel error -framerate 15 -start_number $2 -i $F/f_%05d.jpg -frames:v $(( $3 * 2 )) \
    -vf "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p" -c:v libx264 -preset slow -crf 20 /tmp/clips/$1.mp4
}
seg a 1 100 &
seg b 101 90 &
seg c 191 90 &
wait
# duraciones: a=6.67s b=6s c=6s ; xfade 0.5s
$FF -y -loglevel error -i /tmp/clips/a.mp4 -i /tmp/clips/b.mp4 -i /tmp/clips/c.mp4 -filter_complex \
  "[0][1]xfade=transition=fade:duration=0.5:offset=6.1[ab];[ab][2]xfade=transition=fade:duration=0.5:offset=11.6,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -movflags +faststart -an $OUT/usain-bot-3d.mp4
$FF -y -loglevel error -i $F/f_00012.jpg -q:v 4 $OUT/usain-bot-3d.jpg
ls -la $OUT
