#!/usr/bin/env python3
# Uso: montar_video.py <src.mp4> <nombre> <crop W:H:X:Y|none> <poster_s> <start:dur> [<start:dur> ...]
import subprocess, sys, os, imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
OUT = "/app/frontend/public/videos"
src, name, crop, poster_s, *segs = sys.argv[1:]
vf = "fps=30," + (f"crop={crop}," if crop != "none" else "") + "format=yuv420p"
clips, durs = [], []
for i, s in enumerate(segs):
    st, du = s.split(":")
    out = f"/tmp/seg_{name}_{i}.mp4"
    subprocess.run([FF, "-y", "-loglevel", "error", "-ss", st, "-t", du, "-i", src, "-vf", vf, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "18", out], check=True)
    clips.append(out); durs.append(float(du))
if len(clips) == 1:
    fc, last = "[0:v]format=yuv420p[v]", None
else:
    fc, prev, off = "", "[0:v]", 0
    for i in range(1, len(clips)):
        off += durs[i - 1] - 0.5
        lab = f"[x{i}]" if i < len(clips) - 1 else "[v]"
        fc += f"{prev}[{i}:v]xfade=transition=fade:duration=0.5:offset={off:.2f}{lab};"
        prev = lab
    fc = fc.rstrip(";")
cmd = [FF, "-y", "-loglevel", "error"]
for c in clips:
    cmd += ["-i", c]
cmd += ["-filter_complex", fc, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-movflags", "+faststart", f"{OUT}/{name}.mp4"]
subprocess.run(cmd, check=True)
subprocess.run([FF, "-y", "-loglevel", "error", "-ss", poster_s, "-i", f"{OUT}/{name}.mp4", "-frames:v", "1", "-q:v", "4", f"{OUT}/{name}.jpg"], check=True)
print(os.path.getsize(f"{OUT}/{name}.mp4") // 1024, "KB")
subprocess.run([FF, "-i", f"{OUT}/{name}.mp4"], stderr=subprocess.STDOUT, stdout=subprocess.PIPE, text=True)
