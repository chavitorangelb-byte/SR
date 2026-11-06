# Fase 0 · página real de Jumpers Fest (vista de celular 390 × 844)

## Para confirmar con el dueño
1. **WhatsApp**: la página usa el de la bio, 449 180 7242 (`wa.me/524491807242`). La etiqueta de sus inflables parece decir 449 180 72 47.
2. **Magic Jump**: se usa `foto_03` (castillo con resbaladilla).
3. **Orden de secciones**: Portada → Nuestros inflables → Aparta tu fecha → Arma tu fiesta → Cómo funciona → Contacto.
   "Aparta tu fecha" va justo después del catálogo para que "Lo quiero" baje al formulario y el video recorra la página
   de arriba abajo sin regresar, en el mismo orden del beat sheet. Volver al orden del brief es un cambio menor.

## Textos (solo datos publicados; el resto es texto de proceso genérico)
- Bienvenida: "¡Bienvenidos a Jumpers Fest! Contamos con inflables monocromáticos de primera calidad."
  (se corta antes de "y estamos listos para llevar la diversión de tus eventos": sin su final "al…" se lee incompleta).
- Rainbow Jump: descripción de su post; su etiqueta es "Lleno de color" (de ese post), porque no es monocromático.
  Castle Jump y Magic Jump: solo nombre e "Inflable monocromático".
- Marcadores: `— m`, `—`, `$ —` y la nota "Medidas, edades y precios por confirmar."
- Proceso: "Precio y disponibilidad: te los confirmamos por WhatsApp", "Fecha · se confirma por WhatsApp",
  "Coordinamos contigo la entrega para tu evento" (sin horarios, costos ni cobertura).
- Tipo de evento opcional: Cumpleaños / Bautizo / Otro (los eventos que muestran sus historias).
- Mobiliario solo como pregunta ("Pregunta por mobiliario"), sin piezas ni precios.
- Página con `noindex` y la línea "Demo de cortesía de Elevate Negocios · página no oficial".

## Para el video (fases siguientes)
- Las fotos de Instagram miden ~410–430 px. En la página nunca pasan de su tamaño real en px CSS (prueba automática),
  pero en el video limitan la escala del celular: con una tarjeta completa a la vista, el celular debe quedar
  cerca del 60 % del alto del cuadro (≈ 1.23 px de video por px CSS). Los push-in van sobre texto, con las fotos
  de 430 px fuera de cuadro; las de 1320 px (Castle Jump jardín y terraza, foto_08) aguantan más acercamiento.
- Texturas: `pantallas_3x/` (15 pantallas), `texturas_3x/` (tarjetas, ficha, postal, calendario, botón, burbuja; ver
  `texturas.json`) y el recorrido a 60 fps y 3× en `build/captura_fase0` (1261 cuadros, se regenera con `tools/captura.mjs`).
  En la fase 5 se vuelve a capturar con los tiempos bloqueados a la voz.
- Chromium sin pantalla necesita SwiftShader por ANGLE (`LANZAR` en `tools/servidor.mjs`) para que el cristal
  desenfoque bien a 3×; sin eso el texto de atrás sale nítido encima.

## Qué se probó y qué no
- 26/26 pruebas automáticas (`resultados.json`) en Chromium con emulación de celular 390 × 844, más 360, 430 y escritorio.
- No se probó en un celular físico ni en Safari de iPhone. Para probarlo: abrir `dist/jumpers-fest-demo.html` en el celular.
- No se publicó en ningún enlace (usa la marca real del negocio; publicarla es decisión de Elevate y del dueño).
