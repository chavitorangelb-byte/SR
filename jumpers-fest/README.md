# Jumpers Fest Ags · pieza spec de Elevate Negocios

Demo de cortesía, no oficial: la página que tendría Jumpers Fest (renta de inflables monocromáticos en Aguascalientes)
y, en fases siguientes, el video vertical de 27 s que la presenta. Proyecto independiente del de Florería Roma (raíz del repo).

## Estructura
- `web/index.html` — la página real: un solo HTML responsive (390 × 844 de celular) con CSS y JS dentro.
  Los datos editables están al inicio del script: `NEGOCIO` (WhatsApp, Instagram) e `INFLABLES` (nombre, fotos,
  medidas, edad, precio). `null` = por confirmar: la página muestra `— m`, `—` y `$ —`.
- `web/img`, `web/fonts` — fotos recortadas (sin escalar por encima de su resolución) y fuentes locales OFL (Fredoka y DM Sans).
- `dist/jumpers-fest.html` — la misma página en un solo archivo (fotos y fuentes incrustadas), abre sin servidor.
- `dist/jumpers-fest-demo.html` — igual, pero el botón final muestra el mensaje en vez de abrir WhatsApp.
- `assets/` — las fotos y el logo tal como llegaron; `assets/derivados/` — logo con fondo transparente (recorte por color).
- `tools/` — scripts reproducibles (abajo).
- `review/fase0/` — tableros, pantallas, recorrido en video y resultados de las pruebas.
- `review/fase1/` — inventario de assets, resolución real medida y faltantes.
- `brief/` — fase 2: línea de tiempo (`linea.mjs`, fuente única), brief cuadro por cuadro y `timeline.json`.
- `voz/` — guion para ElevenLabs; `fuente/` la toma 1 y su transcripción (Whisper medium, `tools/transcribir.py` en un venv con faster-whisper); `voz_bloqueada.json` (cuadro de cada palabra), `voz_stem_48k.wav` (−16 LUFS) y `preview_voz_pulso.mp3`.
- `review/fase3/` — la voz bloqueada (tablero) y la verificación de los inicios de palabra con la envolvente de energía.
- `video/` — render en código: `render/escena.js` (frame(t) determinista con three.js: celular de cristal, piezas 3D, tubo y kinetic type; 8 subcuadros por cuadro) y `render.mjs` (lo corre en Chromium y arma el video con ffmpeg).
- `review/fase4/` — prueba de estilo (f186–f446) en 540×960 a 30 fps, hoja de cuadros y un cuadro a 1080.

## Comandos
```bash
python3 tools/resolucion_real.py # fase 1: detalle real de cada foto (review/fase1/resolucion_real.json)
node tools/inventario.mjs        # fase 1: tablero de assets y faltantes (review/fase1/inventario_assets.jpg)
node tools/brief.mjs             # fase 2: brief/linea.mjs → brief_fase2.md, timeline.json y voz/guion_elevenlabs.md
node tools/tablero_fase2.mjs     # fase 2: resumen visual de la línea de tiempo
python3 tools/voz.py             # fase 3: corta la toma, la bloquea a la línea de tiempo y procesa la voz (−16 LUFS)
node tools/brief.mjs             # (otra vez) con la voz bloqueada: kinetic type amarrado a cada palabra
node tools/tablero_fase3.mjs     # fase 3: la voz bloqueada sobre la línea de tiempo
node tools/captura.mjs --plan plan_video --out build/ui_video   # fase 4/5: la página real a 60 fps y 3× con los tiempos del video
(cd video && npm install)        # three.js para el render
node video/render.mjs --desde 186 --hasta 446 --fps 30 --w 540 --h 960 --sub 8 --out review/fase4/prueba_estilo_540.mp4
python3 tools/prep_img.py        # recortes, exposición suave y logo transparente → web/img
node tools/build_web.mjs         # genera dist/
node tools/test_web.mjs          # 26 pruebas en vista de celular 390×844 + capturas a 3× (review/fase0/pantallas_3x)
node tools/tablero.mjs           # tableros de revisión y pantallas en JPG
node tools/texturas.mjs          # piezas sueltas a 3× para el 3D (tarjetas, ficha, postal, calendario, botón)
node tools/captura.mjs           # recorrido a 60 fps y 3× con reloj virtual (texturas del celular) → build/
python3 tools/preview.py build/captura_fase0 review/fase0/recorrido_60fps.mp4
```
`?demo=1` en la URL activa el modo demo en `web/index.html`.

## Datos
Solo lo publicado por el negocio en Instagram (@jumpersfestags). Sin precios, medidas, edades, cobertura, flete,
tiempo de renta ni lista de mobiliario hasta confirmarlos con el dueño. Pendientes de confirmar: el número de WhatsApp
(bio: 449 180 7242; la etiqueta del inflable parece decir 449 180 72 47) y que el castillo con resbaladilla sea el Magic Jump.
