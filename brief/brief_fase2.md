# Brief de producción · Florería Roma · Fase 2

Video vertical que le enseña a la dueña cómo se vería su página. Un solo plano continuo, sin cortes, guiado por el tallo. La interfaz manda; los gráficos la sirven.

## Cambios al brief original (aprobados)


1. **28 s en vez de 27 s (end card de 4 s).** La última frase, "Florería Roma. Así se vería con Elevate.", dura unos 3 s a ritmo tranquilo y no cabe entre 24.40 y 27.00 sin acelerar la voz. Con 4 s cabe, y además da tiempo de leer la línea legal.
2. **Las tres tarjetas salen al 3D antes de los filtros.** Con "Ramos" activo, la caja de tulipanes queda abajo y no se vería. En "Todos" se ven las tres: rosas rojas, caja de tulipanes y girasoles.
3. **Kinetic type de máximo 3 palabras a la vez.** "TUS RAMOS," y "A UN TAP" (igual que "TU PEDIDO" y "EN 3 PASOS") se relevan en lugar de convivir. "A UN TAP" no se dice en la voz, así que aterriza en el sonido del tap.
4. **"HABLAN / POR TI" en vez de "ASÍ HABLAN / DE TI",** para que cada palabra aterrice en su palabra de la voz ("reseñas que hablan por ti").
5. **En el paso 2, primero "A domicilio" y luego "Pick up".** Se ven las dos opciones sin escribir una dirección inventada, y el pick up muestra la dirección real de su tienda.
6. **El celular al 65 % del alto (62 % cuando hay texto al lado), no al 70–75 %.** Así la parte baja de la pantalla, donde va "Enviar pedido por WhatsApp", no cae en los 340 px inferiores.

Además, el tap en la tarjeta de $820 cae en el tiempo fuerte del compás 5 (9.60 s) y el celular no lleva barra de dirección, porque no vamos a inventar un dominio.

## Especificaciones

- **Duración:** 1680 cuadros a 60 fps (28.0 s): 24 s de pieza y 4 s de end card. A 100 BPM un tiempo son 36 cuadros y un compás, 144.
- **Formatos:** 9:16 de 1080 × 1920 (principal) y re-layout real a 1:1 de 1080 × 1080. Master a 60 fps y versión H.264 a 30 fps con `-preset veryfast` para WhatsApp.
- **Zonas seguras en 9:16:** nada importante arriba de y 250 ni debajo de y 1580. El kinetic type mide 52 px o más y siempre va fuera de la pantalla del celular.
- **Paleta:** fondo #22231B con degradado sutil, olivo #ABA987, olivo profundo #6F7048, crema #F5F1E6, blanco, blush #E9B7B5 como acento y texto #2E2D24. Sin azules ni neón.
- **Tipografía:** Playfair Display SemiBold para títulos y kinetic type; DM Sans para la interfaz, la barra de búsqueda y la end card. Ambas locales.
- **Celular:** cristal transparente con leve tinte olivo, bisel redondeado y grosor visible. Refracta el fondo y su reflejo se mueve con la cámara. Cámara frontal circular genérica y barra de estado genérica. Luz principal cálida arriba a la izquierda, contorno neutro y sombra de contacto suave.
- **Tallo:** verde olivo vivo (#9DAA6A, con brillo #C8CFA0 y borde #5E6A3A). Mide 6 px en la base y 2.5 px en la punta, y se mece con ruido determinista. Es 2D; cuando pasa sobre la pantalla, sigue la perspectiva del celular.
- **Toques:** círculo de contacto de 44 px CSS (blanco al 35 %) sobre la onda y el estado presionado reales de la página.
- **Fotos:** las miniaturas nunca pasan de 400 px de ancho en cuadro. Los push-in se hacen sobre texto, no sobre fotos chicas.

## Voz

Bloqueada a la toma 1 (fase 3). Cada frase empieza en su cuadro y cada palabra tiene el suyo; el kinetic type y los subrayados del tallo están amarrados a esas palabras. Stem procesado en `voz/voz_stem_48k.wav` (−16 LUFS).

- Toma 1 (voz “Hope”, eleven v4): 21.6 s, las 7 frases caben en su ventana.
- Transcripción sin guion previo: coincide palabra por palabra; no leyó las etiquetas de pausa.
- Con esta toma “pedido” y “en tres pasos” quedan a 0.35 s: el relevo “TU PEDIDO” → “EN 3 PASOS” no se alcanza a leer, así que queda solo “EN 3 PASOS”.

| # | Entra | Termina | Dura | Frase |
|---|---|---|---|---|
| L1 | f24 · 0.40 s | f162 · 2.70 s | 2.31 s | Alguien busca flores en Aguascalientes. |
| L2 | f180 · 3.00 s | f235 · 3.92 s | 0.92 s | Que te encuentre a ti. |
| L3 | f312 · 5.20 s | f485 · 8.08 s | 2.88 s | Tus ramos, con foto, tamaño y precio. |
| L4 | f582 · 9.70 s | f749 · 12.48 s | 2.79 s | Y el pedido en tres pasos, directo a tu WhatsApp. |
| L5 | f944 · 15.73 s | f1164 · 19.40 s | 3.67 s | A domicilio o para recoger, y con reseñas que hablan por ti. |
| L6 | f1200 · 20.00 s | f1401 · 23.35 s | 3.35 s | Tus flores ya enamoran. Que también se vendan solas. |
| L7 | f1464 · 24.40 s | f1641 · 27.35 s | 2.96 s | Florería Roma. Así se vería con Elevate. |

**Cuadro de cada palabra**

- **L1:** Alguien f24 · busca f44 · flores f56 · en f85 · Aguascalientes f97
- **L2:** Que f180 · te f186 · encuentre f192 · a f216 · ti f222
- **L3:** Tus f312 · ramos f319 · con f364 · foto f370 · tamaño f406 · y f440 · precio f453
- **L4:** Y f582 · el f588 · pedido f593 · en f614 · tres f623 · pasos f637 · directo f678 · a f710 · tu f714 · WhatsApp f719
- **L5:** A f945 · domicilio f950 · o f989 · para f999 · recoger f1007 · y f1040 · con f1062 · reseñas f1072 · que f1103 · hablan f1116 · por f1138 · ti f1149
- **L6:** Tus f1200 · flores f1207 · ya f1231 · enamoran f1253 · Que f1310 · también f1315 · se f1340 · vendan f1351 · solas f1370
- **L7:** Florería f1465 · Roma f1496 · Así f1540 · se f1562 · vería f1573 · con f1592 · Elevate f1603

## Línea de tiempo

En cuadros a 60 fps. Las pistas son Cámara, Celular, Pantalla (captura real de la página), 3D (piezas que salen de la pantalla), Tallo, Tipo, 2D, Voz y Música.

### Hook · f0–f143 · 0.00–2.40 s

*Compás 1 · golpe suave en f0 y piano con pulsación ligera.*

- **f0 · 0.00 s · Música.** Golpe suave: bombo de fieltro y Fa grave de piano. Fondo olivo oscuro #22231B con degradado radial sutil. *SFX: golpe_suave (f0).*
- **f0–f42 · 0.00 s · Tallo.** Entra desde abajo al centro (x 540) y sube en una S suave hasta el extremo izquierdo de la barra (x 170, y 960). Grosor 6 → 2.5 px. *SFX: tallo_crece (f0).*
- **f18–f42 · 0.30 s · 2D.** Barra de búsqueda de cristal genérica: píldora de 900 × 128 px centrada (y 896–1024), blur 32 px, saturación 140 %, borde de 1 px que se dibuja de izquierda a derecha y lupa de línea. Sin logo de ningún buscador. *SFX: cristal_aparece (f18).*
- **f24 · 0.40 s · Voz.** L1: “Alguien busca flores en Aguascalientes.”
- **f44 · 0.73 s · 2D.** Aparece el cursor (parpadea cada 30 cuadros).
- **f48–f122 · 0.80 s · 2D.** La punta del tallo escribe “florería aguascalientes” (DM Sans 52 px, crema): cada letra sale cuando pasa la punta, con ritmo humano. *SFX: 23 teclas (f48–f122).*
- **f126–f142 · 2.10 s · Tallo.** La punta se levanta y se posa sobre la flecha al final de la barra.

### Llegada · f144–f287 · 2.40–4.80 s

*Compás 2 · entra el pizzicato.*

- **f144 · 2.40 s · 2D.** Enter en el tiempo fuerte del compás 2: la flecha se hunde (escala 0.94) con una onda suave. *SFX: enter (f144).*
- **f146–f180 · 2.43 s · 2D.** La barra se comprime en una píldora pequeña y sube a y 330: será el borde superior del celular. *SFX: whoosh_corto (f146).*
- **f150–f198 · 2.50 s · Tallo.** Se enrosca una vez y dibuja con su trazo el contorno del celular: lado derecho, base, lado izquierdo y cierre arriba. *SFX: trazo_contorno (f150).*
- **f180 · 3.00 s · Voz.** L2: “Que te encuentre a ti.”
- **f186–f234 · 3.10 s · Celular.** El celular 3D de cristal se materializa dentro del trazo (la línea se vuelve el brillo del bisel). Entra girado 12° en Y y 4° en X y se asienta con resorte en −3° y 1°. Alto: 65 % del cuadro (1248 px), centro en y 915. *SFX: cristal_cuerpo (f186).*
- **f196–f292 · 3.27 s · Pantalla.** Se enciende la pantalla y carga la portada real: foto de su ventana, logo Roma, “SPREAD LOVE, SEND FLOWERS”, “Entregas a domicilio en Aguascalientes, todos los días” y los dos botones. *SFX: pantalla_enciende (f196).*
- **f216 · 3.60 s · Pantalla.** Pop del logo en la portada. *SFX: logo_pop (f216).*
- **f230 · 3.83 s · Celular.** Termina de asentarse con un micro rebote. *SFX: asienta (f230).*
- **f234–f288 · 3.90 s · Tallo.** Queda como enredadera en la esquina inferior izquierda del celular, meciéndose apenas.

### Catálogo · f288–f575 · 4.80–9.60 s

*Compases 3 y 4 · entra el shaker.*

- **f288–f346 · 4.80 s · Pantalla.** Un dedo (círculo de contacto de 44 px, blanco al 35 %) arrastra hacia arriba y suelta: scroll con inercia y fricción hasta el catálogo (scrollY de 0 a 828 px CSS). *SFX: scroll_friccion (f288).*
- **f298–f332 · 4.97 s · Tipo.** “TUS RAMOS,” aterriza sobre “Tus ramos”: glifo por glifo cada 2 cuadros (33 ms), subiendo desde una máscara con desenfoque de 8 → 0 px. *SFX: tipo_entra (f298).*
- **f300–f330 · 5.00 s · Cámara.** Truck: el celular se corre 210 px a la derecha y baja a 62 %, girando −6° para dejar espacio al texto a la izquierda.
- **f312 · 5.20 s · Voz.** L3: “Tus ramos, con foto, tamaño y precio.”
- **f358–f388 · 5.97 s · 3D.** Sobre “con foto”, tres tarjetas salen de la pantalla al espacio 3D: rosas rojas, caja de tulipanes y girasoles. Son la misma pieza de interfaz con 6 px de grosor y sombra sobre la pantalla; su lugar queda vacío en la captura. *SFX: tarjeta_sale (f358), tarjeta_sale (f364), tarjeta_sale (f370).*
- **f388–f424 · 6.47 s · Cámara.** Órbita de 6° y push-in leve: las tarjetas flotan a tres profundidades con parallax. La caja de tulipanes y los girasoles nunca pasan de 400 px de ancho en cuadro. *SFX: aire_flota (f388).*
- **f404–f420 · 6.73 s · Tallo.** Subraya “S · M · L” en la tarjeta de rosas rojas, sobre “tamaño”. *SFX: subraya (f404).*
- **f424–f448 · 7.07 s · 3D.** Las tarjetas regresan a su lugar con resorte y la pantalla se completa. *SFX: tarjeta_regresa (f440), tarjeta_regresa (f444), tarjeta_regresa (f448).*
- **f440–f456 · 7.33 s · Tipo.** “TUS RAMOS,” sube y sale.
- **f452–f468 · 7.53 s · Tallo.** Subraya “$820” en la primera tarjeta, sobre “precio”. *SFX: subraya (f456).*
- **f456–f486 · 7.60 s · Tipo.** “A UN TAP” aterriza en ese tap. *SFX: tipo_entra (f456).*
- **f470 · 7.83 s · Pantalla.** Tap en “Tulipanes”: las tarjetas se reacomodan con resorte (captura real del filtro). *SFX: tap (f470), filtro (f472), resorte (f490).*
- **f522 · 8.70 s · Pantalla.** Tap en “Ramos”: segundo reacomodo. Quedan arriba “Tulipanes y rosas · $820” y “Ramo kraft pastel · $1,400”. *SFX: tap (f522), filtro (f524), resorte (f542).*
- **f552–f574 · 9.20 s · Tallo.** Rodea la tarjeta “Tonos rosas y blush · $820”, la que se va a tocar. *SFX: rodea (f552).*
- **f556–f572 · 9.27 s · Tipo.** “A UN TAP” sale.
- **f560–f576 · 9.33 s · Cámara.** El celular regresa al centro (65 %).

### Pedido en 3 pasos · f576–f911 · 9.60–15.20 s

*Compases 5 a 7 · entra el bajo cálido.*

- **f576 · 9.60 s · Pantalla.** Tap en la tarjeta de $820 en el tiempo fuerte del compás 5: se abre la hoja y la foto viaja a la ficha (captura real). *SFX: tap (f576), hoja_abre (f578).*
- **f582 · 9.70 s · Voz.** L4: “Y el pedido en tres pasos, directo a tu WhatsApp.”
- **f584–f608 · 9.73 s · Cámara.** Truck: el celular se corre 210 px a la izquierda (62 %); el texto va a la derecha.
- **f600–f632 · 10.00 s · Tipo.** “EN 3 PASOS” aterriza sobre “en tres pasos”. *SFX: tipo_entra (f600).*
- **f618 · 10.30 s · Pantalla.** Paso 1: tap en “M”; el indicador se desliza con resorte. *SFX: tap (f618), detente (f620).*
- **f644 · 10.73 s · Pantalla.** Tap en “Continuar”: entra el paso 2 y se llena la segunda barra del indicador. *SFX: tap (f644), paso_desliza (f646).*
- **f676 · 11.27 s · Pantalla.** Tap en “A domicilio”: aparece el campo de dirección. *SFX: tap (f676), toggle (f678).*
- **f694 · 11.57 s · Pantalla.** Tap en “Pick up”: el indicador se desliza y aparece la dirección real de su tienda. Se ven las dos opciones sin escribir una dirección inventada. *SFX: tap (f694), toggle (f696).*
- **f706–f722 · 11.77 s · Tipo.** “EN 3 PASOS” sale.
- **f712 · 11.87 s · Pantalla.** Tap en la fecha: se abre el calendario de noviembre de 2026. *SFX: tap (f712), calendario_abre (f714).*
- **f744 · 12.40 s · Pantalla.** Tap en el sábado 7; el calendario se cierra. *SFX: tap (f744), fecha_elige (f746), calendario_cierra (f756).*
- **f772 · 12.87 s · Pantalla.** Tap en el mensaje para la tarjeta: sube el teclado (genérico, en español, con ñ). *SFX: tap (f772), teclado_sube (f774).*
- **f792–f824 · 13.20 s · Pantalla.** Se teclea “Feliz cum”. *SFX: 9 teclas (f792–f824).*
- **f828 · 13.80 s · Pantalla.** Tap en la sugerencia “cumpleaños” de la barra del teclado: queda “Feliz cumpleaños”. *SFX: tap (f828).*
- **f840 · 14.00 s · Pantalla.** Tap en “Continuar”: baja el teclado y entra el paso 3, el resumen. *SFX: tap (f840), teclado_baja (f842), paso_desliza (f846).*
- **f866–f886 · 14.43 s · Tallo.** Subraya “Anticipo del 50 % (no reembolsable)”. *SFX: subraya (f866).*
- **f876–f896 · 14.60 s · Tallo.** Rodea el botón “Enviar pedido por WhatsApp”. *SFX: rodea (f876).*
- **f880–f904 · 14.67 s · 3D.** El botón se levanta en 3D con pop: la misma pieza con grosor y sombra sube hacia la cámara; su lugar queda vacío en la captura. *SFX: boton_pop (f880).*
- **f904 · 15.07 s · 3D.** Tap en el botón 3D: se hunde (estado presionado real) y regresa a la pantalla. *SFX: tap (f904), boton_regresa (f912).*

### Confianza · f912–f1151 · 15.20–19.20 s

*Compases 7 y 8 · entran las cuerdas.*

- **f912–f934 · 15.20 s · Pantalla.** La hoja se cierra hacia abajo. *SFX: hoja_cierra (f912).*
- **f930–f956 · 15.50 s · Pantalla.** Scroll con inercia a “Cómo funciona”: “Entrega a domicilio” con la reseña 2 debajo. *SFX: scroll_friccion (f930).*
- **f944 · 15.73 s · Voz.** L5: “A domicilio o para recoger, y con reseñas que hablan por ti.”
- **f950–f966 · 15.83 s · Tallo.** Subraya “Entrega a domicilio”, sobre “a domicilio”. *SFX: subraya (f950).*
- **f986–f1002 · 16.43 s · Pantalla.** El scroll avanza un poco: “Pick up” y su dirección. *SFX: scroll_corto (f986).*
- **f1004–f1018 · 16.73 s · Tallo.** Subraya “Pick up”, sobre “para recoger”. *SFX: subraya (f1004).*
- **f1018–f1042 · 16.97 s · Pantalla.** Scroll al carrusel “Lo que dicen de Roma”. *SFX: scroll_friccion (f1018).*
- **f1044–f1062 · 17.40 s · Pantalla.** Swipe de la reseña 1 a la 3, con rebote suave en el borde. *SFX: swipe (f1044).*
- **f1064–f1088 · 17.73 s · 3D.** Las reseñas 1, 3 y 4 salen al espacio 3D como cristal, en abanico (−10°, 0° y +10°) y legibles: mismo texto, mismas estrellas, “Reseña en Google”. *SFX: cristal_sale (f1064), cristal_sale (f1070), cristal_sale (f1076).*
- **f1090–f1140 · 18.17 s · Cámara.** Push-in a la reseña 3 hasta leer “las flores llegaron frescas” al tamaño de un celular real (≈ 2.5 px de video por px CSS), con profundidad de campo al fondo. *SFX: aire_push (f1090).*
- **f1102–f1130 · 18.37 s · Tipo.** “HABLAN” aterriza sobre “hablan”. *SFX: tipo_entra (f1102).*
- **f1124–f1150 · 18.73 s · Tipo.** “POR TI” aterriza sobre “por ti”. *SFX: tipo_entra (f1124).*

### Cierre · f1152–f1439 · 19.20–24.00 s

*Compases 9 y 10 · lift en f1152 y respiro en f1380.*

- **f1152 · 19.20 s · Música.** Lift: entran todas las capas. *SFX: lift (f1152).*
- **f1152–f1182 · 19.20 s · 3D.** Las reseñas de cristal regresan al carrusel. *SFX: cristal_regresa (f1152).*
- **f1160–f1208 · 19.33 s · Cámara.** El celular se aleja a la derecha: retrocede en profundidad hasta 38 % de alto, gira −18° en Y y su pantalla baja al pie de la página (logo y “Spread love, send flowers”). *SFX: celular_se_aleja (f1160).*
- **f1166–f1182 · 19.43 s · Tipo.** “HABLAN POR TI” sale.
- **f1200 · 20.00 s · Voz.** L6: “Tus flores ya enamoran. Que también se vendan solas.”
- **f1204–f1262 · 20.07 s · Tallo.** Escribe “SPREAD LOVE,”: cada glifo se revela cuando pasa la punta. *SFX: escritura_tallo (f1204).*
- **f1266–f1322 · 21.10 s · Tallo.** Escribe “SEND FLOWERS”. *SFX: escritura_tallo (f1266).*
- **f1324–f1364 · 22.07 s · Tallo.** La punta se enrosca y se abre en una florecita de cinco pétalos de línea blanca (trazo propio, no copia del logo). Cada pétalo se dibuja con resorte. *SFX: petalo (f1326), petalo (f1332), petalo (f1338), petalo (f1344), petalo (f1350).*
- **f1352–f1376 · 22.53 s · 2D.** Junto a la flor aparece el logo real (assets/logo_roma.png, 200 px), arriba del texto. *SFX: logo_aparece (f1352).*
- **f1380–f1440 · 23.00 s · Música.** Respiro: la música cae a un pad casi en silencio y todo se mece despacio.

### End card · f1440–f1679 · 24.00–28.00 s

*Golpe grave en f1440 y cola hasta el final.*

- **f1440 · 24.00 s · Música.** Golpe grave: sub y octava grave de piano. El fondo pasa a olivo (#6F7048 → #5D5E3B). *SFX: golpe_grave (f1440).*
- **f1440–f1476 · 24.00 s · End card.** El logo viaja al centro (y 820) y crece a 520 px con un leve giro 3D (22° → 0°) y sombra suave. El texto, la flor y el celular se desvanecen. *SFX: logo_giro (f1440).*
- **f1464 · 24.40 s · Voz.** L7: “Florería Roma. Así se vería con Elevate.”
- **f1530–f1552 · 25.50 s · End card.** “Así se vería tu página · Elevate Negocios” (DM Sans SemiBold 44 px, crema, y 1190). *SFX: texto_aparece (f1530).*
- **f1560–f1580 · 26.00 s · End card.** Línea obligatoria: “Demo de cortesía de Elevate Negocios · pieza no oficial” (DM Sans 30 px, crema al 75 %, y 1480).
- **f1560–f1680 · 26.00 s · Música.** Cola de la música hasta el final.

## Kinetic type

Playfair Display SemiBold, en mayúsculas y crema #F5F1E6. Cada glifo sale de una máscara con 2 cuadros de separación (33 ms), con desenfoque de 8 → 0 px y curva ease-out, y tarda 14 cuadros en aterrizar: el primer glifo aterriza justo en su palabra. Sale subiendo en 16 cuadros.

| # | Texto | Empieza | Primer glifo aterriza | Sale | Aterriza en | Posición | Tamaño |
|---|---|---|---|---|---|---|---|
| T1 | TUS RAMOS, | f298 | f312 · 5.20 s | f440 | “Tus ramos” (L3) | izquierda · x 64–440 · y 640 | 52 px |
| T2 | A UN TAP | f456 | f470 · 7.83 s | f556 | el tap en “Tulipanes” (no se dice en la voz) | izquierda · y 640 | 52 px |
| T4 | EN 3 PASOS | f600 | f614 · 10.23 s | f706 | “en tres pasos” (L4) | derecha · y 640 | 52 px |
| T5 | HABLAN | f1102 | f1116 · 18.60 s | f1166 | “hablan” (L5) | arriba del celular · y 300 | 64 px |
| T6 | POR TI | f1124 | f1138 · 18.97 s | f1166 | “por ti” (L5) | arriba del celular · y 380 | 64 px |
| T7 | SPREAD LOVE, / SEND FLOWERS | f1204 | f1218 · 20.30 s | f1440 | la escribe el tallo (frase de su marca) | izquierda · x 64 · y 780 y 880 | 76 px |

## Música

Original, compuesta en código, a 100 BPM en Fa mayor. El piano y el pizzicato se tocan con un banco de sonidos de licencia abierta; el shaker, el bajo, los golpes y el riser se sintetizan. Baja al menos 12 dB bajo cada palabra (sidechain desde la voz).

| Compás | Desde | Acorde | Capas |
|---|---|---|---|
| 1 | f0 · 0.00 s | Fmaj9 | Piano en corcheas suaves y golpe suave |
| 2 | f144 · 2.40 s | Dm9 | Entra el pizzicato con un motivo de 4 notas |
| 3 | f288 · 4.80 s | B♭maj7 | Entra el shaker en semicorcheas |
| 4 | f432 · 7.20 s | C6sus4 → C | Igual |
| 5 | f576 · 9.60 s | Fmaj7/A | Entra el bajo cálido |
| 6 | f720 · 12.00 s | B♭maj7 | Igual |
| 7 | f864 · 14.40 s | Gm9 → C9 | Las cuerdas entran en f912 y crecen |
| 8 | f1008 · 16.80 s | Dm7 → B♭maj7 | Cuerdas plenas |
| 9 | f1152 · 19.20 s | Fmaj9 | Lift: todas las capas, piano en acordes |
| 10 | f1296 · 21.60 s | B♭maj7 → C | Respiro en f1380: todo cae a un pad casi en silencio |
| 11 | f1440 · 24.00 s | Fadd9 | Golpe grave y cola hasta f1679 |

## SFX

Todos sintetizados en código, uno por cada movimiento visible.

**115 cues** (el mínimo era 70).

| # | Cuadro | Cue | Sonido |
|---|---|---|---|
| 1 | f0 · 0.00 s | golpe_suave | Bombo de fieltro grave con cola corta |
| 2 | f0 · 0.00 s | tallo_crece | Roce vegetal muy sutil (ruido filtrado en granos) |
| 3 | f18 · 0.30 s | cristal_aparece | Brillo de cristal suave, muy bajo |
| 4 | f48 · 0.80 s | tecla “f” | Tecla física suave, con variación por letra |
| 5 | f52 · 0.87 s | tecla “l” | Tecla física suave, con variación por letra |
| 6 | f54 · 0.90 s | tecla “o” | Tecla física suave, con variación por letra |
| 7 | f58 · 0.97 s | tecla “r” | Tecla física suave, con variación por letra |
| 8 | f62 · 1.03 s | tecla “e” | Tecla física suave, con variación por letra |
| 9 | f65 · 1.08 s | tecla “r” | Tecla física suave, con variación por letra |
| 10 | f67 · 1.12 s | tecla “í” | Tecla física suave, con variación por letra |
| 11 | f73 · 1.22 s | tecla “a” | Tecla física suave, con variación por letra |
| 12 | f75 · 1.25 s | tecla “espacio” | Tecla física suave, con variación por letra |
| 13 | f79 · 1.32 s | tecla “a” | Tecla física suave, con variación por letra |
| 14 | f81 · 1.35 s | tecla “g” | Tecla física suave, con variación por letra |
| 15 | f85 · 1.42 s | tecla “u” | Tecla física suave, con variación por letra |
| 16 | f89 · 1.48 s | tecla “a” | Tecla física suave, con variación por letra |
| 17 | f92 · 1.53 s | tecla “s” | Tecla física suave, con variación por letra |
| 18 | f94 · 1.57 s | tecla “c” | Tecla física suave, con variación por letra |
| 19 | f99 · 1.65 s | tecla “a” | Tecla física suave, con variación por letra |
| 20 | f102 · 1.70 s | tecla “l” | Tecla física suave, con variación por letra |
| 21 | f106 · 1.77 s | tecla “i” | Tecla física suave, con variación por letra |
| 22 | f108 · 1.80 s | tecla “e” | Tecla física suave, con variación por letra |
| 23 | f112 · 1.87 s | tecla “n” | Tecla física suave, con variación por letra |
| 24 | f116 · 1.93 s | tecla “t” | Tecla física suave, con variación por letra |
| 25 | f119 · 1.98 s | tecla “e” | Tecla física suave, con variación por letra |
| 26 | f122 · 2.03 s | tecla “s” | Tecla física suave, con variación por letra |
| 27 | f144 · 2.40 s | enter | Tecla más grave con aire |
| 28 | f146 · 2.43 s | whoosh_corto | Aire corto filtrado |
| 29 | f150 · 2.50 s | trazo_contorno | Roce de trazo que sigue la velocidad de la punta |
| 30 | f186 · 3.10 s | cristal_cuerpo | Barrido de cristal con tono grave |
| 31 | f196 · 3.27 s | pantalla_enciende | Brillo suave de encendido |
| 32 | f216 · 3.60 s | logo_pop | Pop suave con caída de tono |
| 33 | f230 · 3.83 s | asienta | Golpe de peso muy suave |
| 34 | f288 · 4.80 s | scroll_friccion | Fricción que sigue la velocidad del scroll |
| 35 | f298 · 4.97 s | tipo_entra | Swish de tipografía |
| 36 | f358 · 5.97 s | tarjeta_sale | Despegue de papel con aire |
| 37 | f364 · 6.07 s | tarjeta_sale | Despegue de papel con aire |
| 38 | f370 · 6.17 s | tarjeta_sale | Despegue de papel con aire |
| 39 | f388 · 6.47 s | aire_flota | Cama de aire sutil |
| 40 | f404 · 6.73 s | subraya | Roce corto de lápiz |
| 41 | f440 · 7.33 s | tarjeta_regresa | Toque suave de papel |
| 42 | f444 · 7.40 s | tarjeta_regresa | Toque suave de papel |
| 43 | f448 · 7.47 s | tarjeta_regresa | Toque suave de papel |
| 44 | f456 · 7.60 s | subraya | Roce corto de lápiz |
| 45 | f456 · 7.60 s | tipo_entra | Swish de tipografía |
| 46 | f470 · 7.83 s | tap | Tap de vidrio suave |
| 47 | f472 · 7.87 s | filtro | Clic de selección |
| 48 | f490 · 8.17 s | resorte | Rebote muy sutil |
| 49 | f522 · 8.70 s | tap | Tap de vidrio suave |
| 50 | f524 · 8.73 s | filtro | Clic de selección |
| 51 | f542 · 9.03 s | resorte | Rebote muy sutil |
| 52 | f552 · 9.20 s | rodea | Trazo circular |
| 53 | f576 · 9.60 s | tap | Tap de vidrio suave |
| 54 | f578 · 9.63 s | hoja_abre | Deslizamiento hacia arriba |
| 55 | f600 · 10.00 s | tipo_entra | Swish de tipografía |
| 56 | f618 · 10.30 s | tap | Tap de vidrio suave |
| 57 | f620 · 10.33 s | detente | Detente de selector |
| 58 | f644 · 10.73 s | tap | Tap de vidrio suave |
| 59 | f646 · 10.77 s | paso_desliza | Swipe lateral |
| 60 | f676 · 11.27 s | tap | Tap de vidrio suave |
| 61 | f678 · 11.30 s | toggle | Clic de interruptor |
| 62 | f694 · 11.57 s | tap | Tap de vidrio suave |
| 63 | f696 · 11.60 s | toggle | Clic de interruptor |
| 64 | f712 · 11.87 s | tap | Tap de vidrio suave |
| 65 | f714 · 11.90 s | calendario_abre | Pop suave de panel |
| 66 | f744 · 12.40 s | tap | Tap de vidrio suave |
| 67 | f746 · 12.43 s | fecha_elige | Tic |
| 68 | f756 · 12.60 s | calendario_cierra | Panel que se cierra |
| 69 | f772 · 12.87 s | tap | Tap de vidrio suave |
| 70 | f774 · 12.90 s | teclado_sube | Deslizamiento corto hacia arriba |
| 71 | f792 · 13.20 s | tecla_tactil “F” | Tecla táctil, más ligera que la física |
| 72 | f797 · 13.28 s | tecla_tactil “e” | Tecla táctil, más ligera que la física |
| 73 | f799 · 13.32 s | tecla_tactil “l” | Tecla táctil, más ligera que la física |
| 74 | f804 · 13.40 s | tecla_tactil “i” | Tecla táctil, más ligera que la física |
| 75 | f809 · 13.48 s | tecla_tactil “z” | Tecla táctil, más ligera que la física |
| 76 | f812 · 13.53 s | tecla_tactil “espacio” | Tecla táctil, más ligera que la física |
| 77 | f815 · 13.58 s | tecla_tactil “c” | Tecla táctil, más ligera que la física |
| 78 | f821 · 13.68 s | tecla_tactil “u” | Tecla táctil, más ligera que la física |
| 79 | f824 · 13.73 s | tecla_tactil “m” | Tecla táctil, más ligera que la física |
| 80 | f828 · 13.80 s | tap | Tap de vidrio suave |
| 81 | f840 · 14.00 s | tap | Tap de vidrio suave |
| 82 | f842 · 14.03 s | teclado_baja | Deslizamiento corto hacia abajo |
| 83 | f846 · 14.10 s | paso_desliza | Swipe lateral |
| 84 | f866 · 14.43 s | subraya | Roce corto de lápiz |
| 85 | f876 · 14.60 s | rodea | Trazo circular |
| 86 | f880 · 14.67 s | boton_pop | Pop con cuerpo y brillo |
| 87 | f904 · 15.07 s | tap | Tap de vidrio suave |
| 88 | f912 · 15.20 s | boton_regresa | Golpe suave de regreso |
| 89 | f912 · 15.20 s | hoja_cierra | Deslizamiento hacia abajo |
| 90 | f930 · 15.50 s | scroll_friccion | Fricción que sigue la velocidad del scroll |
| 91 | f950 · 15.83 s | subraya | Roce corto de lápiz |
| 92 | f986 · 16.43 s | scroll_corto | Fricción corta |
| 93 | f1004 · 16.73 s | subraya | Roce corto de lápiz |
| 94 | f1018 · 16.97 s | scroll_friccion | Fricción que sigue la velocidad del scroll |
| 95 | f1044 · 17.40 s | swipe | Swipe horizontal |
| 96 | f1064 · 17.73 s | cristal_sale | Barrido de cristal |
| 97 | f1070 · 17.83 s | cristal_sale | Barrido de cristal |
| 98 | f1076 · 17.93 s | cristal_sale | Barrido de cristal |
| 99 | f1090 · 18.17 s | aire_push | Aire de push-in |
| 100 | f1102 · 18.37 s | tipo_entra | Swish de tipografía |
| 101 | f1124 · 18.73 s | tipo_entra | Swish de tipografía |
| 102 | f1152 · 19.20 s | cristal_regresa | Barrido de cristal inverso |
| 103 | f1152 · 19.20 s | lift | Riser corto |
| 104 | f1160 · 19.33 s | celular_se_aleja | Whoosh grave |
| 105 | f1204 · 20.07 s | escritura_tallo | Roce vegetal continuo que sigue la punta |
| 106 | f1266 · 21.10 s | escritura_tallo | Roce vegetal continuo que sigue la punta |
| 107 | f1326 · 22.10 s | petalo | Pluck suave afinado en la armonía |
| 108 | f1332 · 22.20 s | petalo | Pluck suave afinado en la armonía |
| 109 | f1338 · 22.30 s | petalo | Pluck suave afinado en la armonía |
| 110 | f1344 · 22.40 s | petalo | Pluck suave afinado en la armonía |
| 111 | f1350 · 22.50 s | petalo | Pluck suave afinado en la armonía |
| 112 | f1352 · 22.53 s | logo_aparece | Brillo suave |
| 113 | f1440 · 24.00 s | golpe_grave | Sub con piano grave |
| 114 | f1440 · 24.00 s | logo_giro | Swish de giro |
| 115 | f1530 · 25.50 s | texto_aparece | Brillo mínimo |

## Mezcla

- Voz cerca de −16 LUFS, con filtro pasa altos, de-esser y compresión suave.
- Música al menos 12 dB por debajo de cada palabra.
- Master a −14 LUFS y −1.25 dBTP.
- Stems separados de voz, música y SFX.

## Re-layout 1:1

- **Hook:** barra de 860 px centrada en y 520.
- **Interfaz:** celular al 74 % del alto (800 px), centrado. Con texto al lado se corre 230 px y el texto va del otro lado a 56 px, porque hay más espacio horizontal.
- **Push-in:** los mismos objetivos de lectura que en 9:16.
- **Cierre:** celular a la derecha al 46 % y "SPREAD LOVE, / SEND FLOWERS" a 64 px a la izquierda.
- **End card:** logo de 420 px y textos de 40 y 28 px.
- **Márgenes:** 60 px de seguridad por lado.

## Cómo se construye

1. **Modo captura de la página** (`web/index.html?captura`): reloj virtual (el reloj de Playwright más `document.getAnimations()` avanzadas cuadro por cuadro) y scroll con física propia (inercia, fricción y rebote) en lugar del nativo. Añade un teclado genérico dentro de la captura, una barra de estado genérica y la opción de ocultar una pieza mientras su versión 3D está afuera. Captura a 60 fps y 3× (1170 × 2532). Es la misma página, no una maqueta aparte.
2. **frame(t) determinista,** compartida por 9:16 y 1:1: lee `brief/timeline.json` y da el estado de la cámara, el celular, el tallo, el tipo y las piezas 3D en cualquier instante.
3. **Render:** Three.js para el celular, las piezas 3D y la end card, y canvas 2D para el tallo, el tipo y los toques, en Chromium sin GPU. Cada cuadro se forma con 8 subcuadros (obturador de 180°) para el motion blur; si en un cuadro nada se mueve más de medio píxel, los 8 subcuadros son idénticos y se calcula solo uno.
4. **Tiempo estimado:** de 3 a 6 horas para 9:16 y 1:1 a 60 fps. Es una estimación; la prueba de estilo dará el número real.
5. **Verificación:** hoja de contactos con 12 cuadros clave, revisión cuadro por cuadro de legibilidad y zonas seguras, medición de loudness y revisión final tuya en un celular real.

## Verificaciones automáticas

- ✅ Duración total: 1680 cuadros (28.0 s).
- ✅ SFX: 115 cues (mínimo 70).
- ✅ Las secciones cubren el video sin huecos ni encimes.
- ✅ Ninguna frase de voz se encima con la siguiente si respeta su duración máxima.
- ✅ La última frase termina 0.6 s antes del final.
- ✅ Kinetic type amarrado a la voz: T1 +0 cuadros, T4 +0 cuadros, T5 +0 cuadros, T6 +0 cuadros.
- ✅ Kinetic type: máximo 4 palabras en pantalla a la vez (límite 3 o 4).
- ✅ Kinetic type de 42 px o más.
- ✅ Todos los eventos terminan dentro del video.
