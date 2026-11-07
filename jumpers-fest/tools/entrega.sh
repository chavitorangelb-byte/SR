#!/usr/bin/env bash
# Arma entrega/ con todo lo que no es el video final: la página en un archivo, stems, recorrido de la página y fotos.
# Los videos finales salen de video/finales.sh. Uso: bash tools/entrega.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p entrega/stems
cp dist/jumpers-fest.html dist/jumpers-fest-demo.html entrega/
cp audio/build/stems/voz.wav audio/build/stems/musica.wav audio/build/stems/sfx.wav audio/build/mezcla_master.wav entrega/stems/
cp review/fase0/recorrido_60fps.mp4 entrega/recorrido_pagina_celular.mp4
node tools/fotos_dueno.mjs
