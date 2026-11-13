#!/usr/bin/env bash
# Preview completo: 720 × 1280, 30 fps, 8 subcuadros, en 4 procesos (reanudable).
# Uso: bash video/preview.sh   → video/build/prev (cuadros)
cd "$(dirname "$0")/.."
for i in 0 1 2 3; do
  node video/render.mjs --w 720 --h 1280 --fps 30 --sub 8 --desde $((i*346)) --hasta $((i*346+344 > 1378 ? 1378 : i*346+344)) --cuadros video/build/prev > video/build/prev_$i.log 2>&1 &
done
wait
ls video/build/prev | wc -l
