# Ana Gaby Repostería · pieza spec de Elevate Negocios

Demo de cortesía, no oficial: la página que tendría Ana Gaby Repostería (Los Bosques, Aguascalientes) y, en fases siguientes, el video vertical de 27 s que la presenta. La interfaz del video se captura de esta misma página.

## Estructura
- `web/index.html`: la página real (un solo HTML responsive con CSS y JS dentro). Los datos editables están arriba del script: `NEGOCIO`, `CATALOGO`, `RESENAS`.
- `web/img`, `web/fonts`: fotos recortadas de su Instagram y de su ficha de Google; fuentes locales (Cormorant Garamond y DM Sans, licencia OFL).
- `dist/ana-gaby-reposteria.html`: la misma página en un solo archivo (fotos y fuentes incrustadas, abre sin internet).
- `dist/ana-gaby-reposteria-demo.html`: igual, en modo demo (muestra el mensaje y no le escribe al negocio).
- `assets/`: recortes con los nombres del brief (`foto_00` … `foto_12`, `logo_letrero_ag.png`) y `pastel_referencia_ilustrado.jpg` (pastel genérico hecho en código para el paso «A tu medida»).
- `3d/pastel.js`: el pastel de dos pisos en Three.js. Es el mismo modelo para la foto de referencia y para el pastel 3D del video.
- `tools/`: scripts reproducibles (recortes, render del pastel, archivo único, pruebas y tableros).
- `review/fase0/`: tableros de revisión, `resultados.json` de las pruebas, el mensaje de WhatsApp generado y la lista de palabras revisadas.

## Comandos
```bash
npm install                          # three.js (solo para el pastel 3D)
python3 tools/crop_assets.py         # requiere las capturas en assets/_capturas (no se versionan)
node tools/pastel_referencia.mjs     # assets/pastel_referencia_ilustrado.jpg
node tools/build_web.mjs             # dist/
node tools/test_web.mjs              # 51 pruebas en 390x844 + capturas en review/fase0
node tools/board.mjs                 # tableros de revisión
```
`?demo=1` activa el modo demo. `?captura=1` deja la página lista para capturarla cuadro por cuadro (sin auto-avances ni scroll suave) y expone `window.AnaGaby`.

## Datos
Solo datos publicados por el negocio:
- Dirección, teléfono 449 406 3325 y 5.0: su ficha de Google.
- WhatsApp: el link de su Instagram (wa.link/1t41vl) abre `api.whatsapp.com/send?phone=5214494063325`, el mismo 449 406 3325.
- Horario: bio de Instagram (martes a viernes 11:30 am – 2:30 pm y 4:30 pm – 7:00 pm; sábado 11:00 am – 2:00 pm; domingo y lunes cerrado).
- Reseñas: texto exacto del brief, sin nombres, firmadas «Reseña en Google».
- Precios sin confirmar: «$ —». Sin número de reseñas, sin envío a domicilio, sin anticipación mínima.
