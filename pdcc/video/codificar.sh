#!/bin/bash
# Junta video y mezcla: master 60 fps y versión H.264 a 30 fps para WhatsApp e Instagram. Uso: ./codificar.sh 9x16|1x1
set -e; cd "$(dirname "$0")"; F=$1; M=build/final_$F/mudo.mp4; A=../audio/build/mezcla_master.wav; E=../entrega
ffmpeg -v error -y -i $M -i $A -c:v copy -c:a aac -b:a 256k -movflags +faststart $E/pro-detailing_${F}_master_60fps.mp4
ffmpeg -v error -y -i $M -i $A -vf "tmix=frames=2:weights='1 1',fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 -preset slow -maxrate 8M -bufsize 16M -c:a aac -b:a 160k -movflags +faststart $E/pro-detailing_${F}_whatsapp_30fps.mp4
for f in $E/pro-detailing_${F}_*.mp4; do echo "$f $(ffprobe -v error -show_entries format=duration,size -of csv=p=0 $f) $(ffprobe -v error -select_streams v -show_entries stream=width,height,r_frame_rate -of csv=p=0 $f)"; done
