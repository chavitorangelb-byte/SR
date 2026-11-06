# Florería Aguascalientes Roma · pieza spec de Elevate Negocios

> Otros proyectos en este repo: **Jumpers Fest Ags** (página y video spec) en [`jumpers-fest/`](jumpers-fest/README.md).

Demo de cortesía, no oficial: la página que tendría Roma y, en fases siguientes, el video vertical que la presenta.

## Estructura
- `web/index.html` — la página real (un solo HTML responsive con CSS y JS dentro). Los datos editables están arriba del script (`NEGOCIO`, `ARREGLOS`).
- `web/img`, `web/fonts` — fotos optimizadas y fuentes locales (Playfair Display y DM Sans, licencia OFL).
- `dist/floreria-roma.html` — la misma página en un solo archivo, con fotos y fuentes incrustadas.
- `dist/floreria-roma-demo.html` — igual, pero el botón final muestra el mensaje en vez de abrir WhatsApp.
- `assets/` — recortes de las capturas de Instagram con los nombres del brief (`logo_roma.png`, `arreglo_01` … `arreglo_11`, post de precios solo como referencia).
- `tools/` — scripts reproducibles: recortes, build del archivo único, pruebas y tableros.
- `review/fase0/` — tableros de revisión y resultados de las pruebas.

## Comandos
```bash
python3 tools/crop_assets.py   # requiere las capturas en assets/_capturas (no se versionan)
node tools/build_web.mjs       # genera dist/
node tools/test_web.mjs        # 32 pruebas en vista de celular 390x844 + capturas en review/fase0
node tools/board.mjs           # tableros de presentación
```
`?demo=1` en la URL activa el modo demo en `web/index.html`.

## Datos
Solo datos publicados por el negocio. Precios: únicamente $820 y $1,400 de su post "Tonos rosas y blush"; el resto muestra "$ —". Horario y disponibilidad inmediata quedan como marcadores ("Tu horario aquí", "Tu selección del día aquí") hasta confirmarlos con la dueña.
