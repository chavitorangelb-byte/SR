# Brief · Sella Eventos · "El camino de mesa"

Pieza spec privada de Elevate Negocios. Vertical 9:16, 1080×1920, 27 s (24 s + 3 s de end card),
60 fps = 1620 cuadros. BPM 100, compás de 2.4 s = 144 cuadros, beat = 36 cuadros.
Todo en código: página HTML real capturada con Playwright, cinta/morphs en canvas, ffmpeg.

## Idea
Un camino de mesa champaña es la única línea del video: cruza la pantalla, subraya el titular,
se vuelve el borde del teléfono, el riel del scroll, el hilo que enlaza las tarjetas y al final
se dobla en el monograma. Un solo plano, cero cortes, morphs por SDF.
Mensaje: "Tu evento, bien sentado." / "Tú pones la fiesta."

## Look
Fondo #0f0e0d · cristal ahumado (blur 28–40 px, saturación 140 %, borde 1 px, ruido 2 %) ·
champaña #e8cf9a · marfil #f6f1e7 · sin azul en UI, tipo ni gráficos.
Cormorant Garamond (titulares) + Inter (interfaz). Texto ≥ 54 px. Luz fija arriba-izquierda.
Zona segura: 250 px arriba, 340 px abajo, 60 px a los lados.

## Línea de tiempo (cuadros a 60 fps)
| Tiempo | Cuadros | Qué pasa | Kinetic / voz | 3D |
|--------|---------|----------|---------------|----|
| 0.0–2.4 | 0–143 | GANCHO. Cuadro 0: golpe grave; la cinta cruza de lado a lado (0–30) y queda tensa con caída de tela (30–72). | "TU EVENTO" por glifo desde cuadro 24 (voz 0.4 s); sube como tela que se acomoda. | — |
| 2.4–4.8 | 144–287 | "BIEN SENTADO." cae con rebote de silla (156–200). La cinta se vuelve subrayado (200–236) y luego se abre en el marco del teléfono (236–287). | voz 2.6 s = cuadro 156. | — |
| 4.8–7.2 | 288–431 | El teléfono entra girado 18° y se endereza (288–372). Hero de la página: logo, titular, botón dorado. El kinetic se morfa en el titular de la página (300–348). | — | #1 teléfono ≤ 18° |
| 7.2–12.0 | 432–719 | Scroll fluido al catálogo (432–504). Tarjetas entran a ≤ 10° con barrido de brillo, una por beat: silla $8 (504), paquete 8 $135 (576), paquete 10 $155 (648). | Contadores numéricos; voz 7.6 s = cuadro 456: "Sillas (504), mesas (540) y paquetes completos (576)". | #2 tarjetas ≤ 10° |
| 12.0–16.8 | 720–1007 | Resto del catálogo con "Cotiza por WhatsApp" (720–828). La cinta enlaza las tarjetas en un trazo continuo y aterriza en el cintillo "Pick up: 10 % de descuento" (828–1007). | voz 12.4 s = cuadro 744; "10 %" crece al decir "descuento". | — |
| 16.8–19.2 | 1008–1151 | Galería horizontal con paralaje 2.5D, 6 fotos propias; arpegio de campanas. | — | #3 paralaje |
| 19.2–21.6 | 1152–1295 | REVELACIÓN. Lift; la cámara se aleja y se ve la página completa respirando. | "TÚ PONES LA FIESTA" (voz 19.4 s = cuadro 1164). | — |
| 21.6–24.0 | 1296–1439 | Cámara vuelve al botón "Cotiza por WhatsApp · 449 509 3260"; press real en el cuadro 1368. Respiro musical. | voz 21.8 s = cuadro 1308. | — |
| 24.0–27.0 | 1440–1619 | END CARD. La cinta se dobla en el monograma (1440–1500); logo, "Sella Eventos · Aguascalientes", leyenda "Demo de cortesía de Elevate Negocios · pieza no oficial". Golpe grave en 1440 y cierre en 1596. | voz 24.6 s = cuadro 1476. | — |

Los cuadros de kinetic se re-anclan a los tiempos reales por palabra cuando llegue la voz.

## Página (HTML/CSS real, 390×844)
1. Hero: logo circular, "Tu evento, bien sentado.", "Renta de sillas, mesas y mobiliario en Aguascalientes", botón "Cotiza por WhatsApp".
2. Catálogo: Silla plegable $8 · Paquete 8 personas $135 · Paquete 10 personas $155 ·
   mesas rectangulares, sillas y mesa infantil, sillas Tiffany blancas, mobiliario para evento → "Cotiza por WhatsApp".
3. Cintillo: "Pick up: 10 % de descuento" (la entrega incluida desde $300 queda fuera hasta confirmar).
4. Galería horizontal con las fotos propias.
5. Reseñas: "Clientes que recomiendan a Sella", sin cifra (4.9 ★ solo si la dueña confirma).
6. Cierre: "Cotiza por WhatsApp · 449 509 3260".

## Datos
Usados: nombre, 449 509 3260, precios $8 / $135 / $155 (su ficha de Google), pick up 10 % (publicación propia), manteles morado/blanco/dorado/azul.
Fuera hasta confirmar: dirección, horario, calificación y número de reseñas, requisitos de renta (2022), entrega incluida desde $300, nombres de clientes.

## Assets (sella/assets)
| Archivo | Tamaño | Uso |
|---------|--------|-----|
| logo-circulo.png | 868 px | hero y end card, tamaño moderado |
| foto_01_mesas_morado.jpg | 1320×1101 | tarjeta "Paquete 8" / galería |
| foto_02_patio_ladrillo.jpg | 1320×1107 | galería, "Mobiliario para evento" |
| foto_03_mesas_azul_blanco.jpg | 1320×976 | galería |
| foto_04_mesas_alberca.jpg | 1320×1778 | "Mesas rectangulares", galería |
| foto_05_patio_mesas_blancas.jpg | 1320×2153 | "Silla plegable", galería |
| foto_06_mesa_dorado.jpg | 1320×777 | "Paquete 10" |
| foto_07_mesa_infantil_roja_BAJA_RES.jpg | 438×497 | tarjeta infantil, pequeña |
| foto_08_sillas_tiffany_flores_BAJA_RES.jpg | 438×486 | tarjeta Tiffany, pequeña |

Descartadas: silla con marca de otro fabricante, mesa con caja de pañales y personaje, sillas con notificación que muestra un nombre.

## Audio
Música original en código (pad cálido → pulso → arpegio de campanas → lift 19.2 s → respiro 21.6–24.0 → golpe final).
≥ 70 SFX sintetizados y sincronizados al cuadro. Voz -16 LUFS, música ≥ 12 dB debajo, master -14 LUFS / -1.25 dBTP.

## Entregables
9:16 y 1:1 (re-layout real) · master 60 fps y H.264 30 fps · stems de voz, música y SFX.

## Fases
1. Assets, brief y guion de voz ← aquí. 2. Página web. 3. Voz y línea de tiempo bloqueada.
4. Prueba de estilo (gancho, 0–4.8 s). 5. Render completo. 6. Preview y hoja de contactos. 7. Finales.
