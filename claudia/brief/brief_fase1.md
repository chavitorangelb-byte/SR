# Claudia Repostería Casera · "El vuelo" · Brief de fase 1

Pieza spec privada de Elevate Negocios. Vertical 1080×1920, 27 s (24 s + 3 s de end card), 60 fps, 1620 cuadros, BPM 120 (compás = 120 cuadros). Tiempos exactos: `timeline.json`. Datos de contacto: `../config.json`.

## 1. Assets revisados
| Archivo | Tamaño | Origen | Uso y límite |
|---|---|---|---|
| claudia-logo.png | 272×154 | Recorte de la portada de Facebook (el ZIP no trae el logo suelto) | Fondo blanco: va sobre tarjeta blanca, máx. 272 px de ancho (1.0x) |
| claudia-insignia.jpg | 200×200 | Foto de perfil de Facebook | Respaldo; máx. 200 px |
| 01-boda-barra.jpg | 1200×1600 | Reducida desde 2656×3541 | Galería "Bodas" |
| 02-cumpleanos-rosa.jpg | 1080×1080 | Original | Héroe y galería "Cumpleaños" |
| 03-calavera.jpg | 720×720 | Original | Galería "Temáticos", tarjeta pequeña |
| 04-cupcakes.jpg | 640×1136 | Original | Galería "Cupcakes", tarjeta pequeña |

No se usan: Bella y la Bestia, Policía Municipal, "Jorge", ni las fotos de Google Maps. `assets-src/` (ZIP y capturas) no se versiona.

Escalas previstas (px de foto por px de lienzo, siempre ≤ 1.0): héroe en celular 0.66x, con el empuje de cámara 0.85x; tarjetas de galería (~342 px) 03 a 0.48x y 04 a 0.53x; logo 0.74x en el encabezado y 1.0x en el cierre y el end card.

## 2. Interfaz
Página en HTML/CSS real, diseñada a 390 px CSS y capturada a 2x: ventana de 780 px en el lienzo. Texto principal 15 px CSS = 30 px en lienzo (38 px con el empuje); detalles 11 px CSS = 22 px. Computadora: misma página a 1280 px CSS en marco de navegador. Fuentes locales OFL: Playfair Display Italic (títulos), Outfit SemiBold (kinetic type), Nunito (interfaz).

## 3. Tiempos por cuadro (resumen; detalle en timeline.json)
| Escena | Cuadros | Momentos clave |
|---|---|---|
| S1 Hook | 0–120 | f0 la línea cruza (8 cuadros), f8 destello, f11–96 dibuja el celular · REPOSTERÍA f27 · CASERA f60 · SOBRE PEDIDO f87 |
| S2 La página llega | 120–360 | f120–168 el celular se endereza (18°→0°) · f138 encabezado · TU PÁGINA f168 · héroe f186/210/228/246 · empuje f288–348 |
| S3 Lo que hace | 360–720 | scroll f360–396 · PASTELES f384 · fichas f390/450/480/516 · galería f510/528/546/564 · CUPCAKES y fichas f582/618/654 |
| S4 Respiro | 720–840 | la cámara se aleja f720–780, tira completa, azúcar glas · regreso f816–864 |
| S5 Cotizar | 840–1080 | botón de WhatsApp f864 · COTIZA f876 · POR WHATSAPP f912 · chat f924/960 · reseñas f1020, estrellas f1032–1064 |
| S6 Visítanos | 1080–1200 | scroll f1080 · mapa f1096–1140 · tarjeta de horario f1116 · pin f1140 |
| S7 Revelación | 1200–1440 | navegador f1200–1236 · EN CELULAR f1224 · EN COMPUTADORA f1266 · aro al logo f1332–1368 · DELICIOSA f1344 · REPOSTERÍA CASERA f1380 · alto f1416 |
| S8 End card | 1440–1620 | panel f1440 · logo f1452 · textos f1470/1488/1506/1524 · campanada f1584 |

Los cuadros atados a la locución son provisionales: en la fase 2 se mueven al inicio real de cada palabra.

## 4. Puntos a decidir antes de seguir
1. **Reseña.** La captura de Google muestra la reseña traducida al inglés por Google ("I highly recommend their cakes and cookies. They're high quality and taste delicious."); el original en español no se ve. La frase del guion es una retraducción, no la cita literal. Opciones: copiar el texto original desde Google, o mostrarla sin comillas.
2. **Horario.** La captura de Google Maps del ZIP no alcanza a mostrar el horario ni el teléfono; salen solo de la ficha. El teléfono 449 115 0903 sí está confirmado en la portada de Facebook. 4.7 y 12 reseñas sí están en la captura.
3. **Locución apretada.** "Pasteles personalizados para bodas, cumpleaños y XV años" (6.30 s) probablemente termine después de 9.60 s, donde empieza "Cupcakes, galletas y gelatinas"; y "Para cotizar, un solo botón: WhatsApp" (14.50 s) llega justo a 17.00 s. Con la voz real se recorre lo necesario dentro de cada escena (por ejemplo la segunda línea de S3 hacia 10.2 s), sin acelerar la voz.
4. **Orden de fichas.** La locución dice bodas, cumpleaños, XV años; las fichas aparecen en ese orden (el brief las listaba Bodas, XV años, Cumpleaños).
5. **Reseñas en pantalla 1 s.** De 17.00 a 18.00 s no da tiempo de leer la frase; la tarjeta de cristal se queda flotando hasta f1110 mientras empieza el mapa.
6. **Campanada final.** Un sonido que arranca en 27.00 s cae en el corte y no se oye; se propone el ataque en 26.40 s (f1584) con cola hasta el final.
7. **Logo pequeño.** A 1.0x mide 272 px: en el cierre va en una tarjeta blanca redonda con el aro dorado alrededor, y el tamaño lo dan "DELICIOSA / REPOSTERÍA CASERA". Un logo limpio de la dueña lo mejoraría.
8. **Voz.** No hay clave de ElevenLabs en este entorno; se necesita para la fase 2.
