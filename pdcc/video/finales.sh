#!/bin/bash
# Render maestro por tramos (reanudable). Uso: ./finales.sh 9x16|1x1
set -e; cd "$(dirname "$0")"; F=$1; D=build/final_$F; mkdir -p $D
for i in 0 1 2 3 4 5; do
  a=$(python3 -c "print($i*3.1)"); b=$(python3 -c "print(min(18.5,($i+1)*3.1))"); o=$D/seg$i.mp4
  [ -f $o.ok ] || { node render.cjs --s 1 --sub 8 --fps 60 --fmt $F --from $a --to $b --crf 12 --out $o > $D/seg$i.log 2>&1 && touch $o.ok; }
done
for i in 0 1 2 3 4 5; do echo "file 'seg$i.mp4'"; done > $D/lista.txt
ffmpeg -v error -y -f concat -safe 0 -i $D/lista.txt -c copy $D/mudo.mp4
ffprobe -v error -select_streams v -show_entries stream=nb_frames,width,height,r_frame_rate -of csv=p=0 $D/mudo.mp4
