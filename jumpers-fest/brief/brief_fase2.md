# Brief de producción · Jumpers Fest Ags · Fase 2

Video vertical que le enseña al dueño cómo se vería su página. Un solo plano continuo, sin cortes, guiado por el tubo de aire: todo lo que aparece se infla. La interfaz manda; los gráficos la sirven.

## Cambios al brief original (por aprobar)

1. **La voz entra antes, “Que te encuentre a ti” cae en su logo y la end card dura 3.5 s.** “Alguien está organizando una fiesta en Aguascalientes.” no cabe entre 0.40 y 2.60 s sin acelerar: L1 empieza en 0.10 s y L2 pasa a 3.40 s, justo cuando se infla su logo. Con la toma, L6 (“Jumpers Fest. Así se vería con Elevate.”) dura 2.85 s aun recortando su pausa interna de 0.32 a 0.26 s, así que la end card crece a 3.5 s y el video dura 27.5 s (1650 cuadros); L6 entra en 24.20 s, con “Jumpers” justo cuando se infla el logo.
2. **El celular al 60 % justo (1152 px de alto; 1.236 px de video por px CSS).** Es el máximo que permiten las fotos de 408–427 px: a ese tamaño una tarjeta completa mide 408 px en cuadro. Los push-in (hasta 2×) solo van sobre pantallas sin fotos grandes: calendario, campos, teclado y mensaje.
3. **Las tarjetas que salen al 3D no crecen.** Avanzan en profundidad, giran y la cámara se aleja del celular (54 %): se sienten fuera de la pantalla sin pasar de 408 px.
4. **Las tres tarjetas salen en fila (una por medio tiempo)** desde la posición en que Rainbow Jump queda al centro. Dentro de la pantalla se inflan una por una al entrar con el scroll. Sacar y regresar cada una por separado no cabe en 5.4 s junto con la ficha.
5. **La descripción de Rainbow Jump se lee sacándola al 3D** (el mismo bloque de texto a 1.9×), no con push-in: un push-in agrandaría la foto de 408 px que está arriba.
6. **El kinetic type aterriza palabra por palabra y se releva para no pasar de 4 palabras.** La voz dice “y su fecha, apartada en un mensaje” en 1.9 s: “TU” y “FECHA” caen en “su fecha”, “APARTA” encima en “apartada” (“APARTA / TU FECHA”), y “EN”, “UN” y “MENSAJE” reemplazan a “TU FECHA” en sus palabras (“APARTA / EN UN / MENSAJE”). En “Diversión y elegancia”, el “+” (cojín rosa) cae en la “y”.
7. **Lo que escribe el cliente en la demo:** sábado 21 de noviembre de 2026, “Las Américas” (colonia real y corta de Aguascalientes) y “4:00 pm”. No son datos del negocio.
8. **El mensaje se lee en la vista previa de la página** (push-in) y el botón cojín hace pop justo en el lift de 15.00 s, como “envío”. No sale la hoja “¡Tu mensaje está listo!” ni la pantalla de WhatsApp (es de terceros): así la sección termina en el pop y no se amontona con “Arma tu fiesta”.
9. **foto_05 no se usa:** es muy chica y el cierre es el arcoíris 3D. foto_04 sí aparece, dentro de la página (Cómo funciona).
10. Barra de estado genérica (12:00) y sin barra de dirección: no inventamos un dominio.

## Especificaciones

- **Duración:** 1620 cuadros a 60 fps (27.0 s): 24 s de pieza y 3 s de end card. A 112 BPM un tiempo son 32.14 cuadros y un compás, 128.57.
- **Formatos:** 9:16 de 1080 × 1920 (principal) y re-layout real a 1:1 de 1080 × 1080. Master a 60 fps y H.264 a 30 fps con `-preset veryfast` para WhatsApp.
- **Zonas seguras en 9:16:** nada importante arriba de y 250 ni debajo de y 1580. El kinetic type mide 80 px o más (mínimo pedido: 42) y siempre va fuera de la pantalla del celular.
- **Paleta:** fondo blanco cálido #F7F5F2 con cielo pastel muy claro y sombras suaves; blanco #FFFFFF; arcoíris pastel de sus inflables: rosa #F3C7CF, amarillo #F6E7A8, menta #CDE8C9, celeste #C6DFEA y lila #DCCDEB; negro #1B1B1B para texto y botones. El azul de la estrella solo vive dentro del logo. Nada de neón ni glow.
- **Tipografía:** Fredoka SemiBold (títulos y kinetic type) y DM Sans (interfaz, barra de búsqueda y end card), ambas locales y de licencia abierta. Nunca imitando la letra del logo.
- **Celular (3D):** cristal transparente con bisel redondeado, grueso visible, refracción del fondo y reflejo que se mueve con la cámara. Mide 1152 px de alto (60 %), con la pantalla de 482 × 1101 px: 1.236 px de video por px CSS. Barra de estado genérica (12:00), cámara frontal genérica y sin barra de dirección. Luz principal suave arriba a la izquierda, contorno neutro y sombra de contacto.
- **Pantalla:** la página real capturada a 60 fps y 3× (1170 × 2532) con reloj virtual: la interfaz del video y la página son la misma. Taps, scrolls con inercia, teclado y calendario son capturas reales.
- **Tubo (2D):** blanco, 26 px de grueso (40 px inflado), costura central punteada, brillo de vinil arriba y sombra suave. Se mueve con ruido determinista y, cuando pasa sobre la pantalla, sigue la perspectiva del celular. Es el conductor, no la estrella.
- **Inflado:** volumen de cojín con costuras, brillo especular suave de vinil y resorte amortiguado con 6–10 % de sobrepaso; nada de escalas lineales.
- **Cristal:** blur de 28 a 40 px de lo que hay detrás, saturación 140 %, borde de 1 px y ruido 2 % (barra de búsqueda y paneles).
- **Toques:** círculo de contacto de 44 px CSS (tinta al 18 % con aro blanco) y onda suave, sobre el estado presionado real de la página.
- **Fotos:** nunca más grandes que su detalle real en cuadro: 408 px (Rainbow Jump), 420 px (Castle Jump, encuadre de la tarjeta), 427 px (Magic Jump y foto_04) y ~1300 px (foto_08). Los push-in se hacen sobre texto, no sobre fotos chicas.
- **2D y 3D:** 3D el celular, las tres tarjetas, el panel de la descripción, el botón cojín, la postal, el arcoíris y la placa de la end card. 2D la interfaz, el tubo, el kinetic type, los íconos y la barra de búsqueda.
- **Supermuestreo:** 8 subcuadros por cuadro para el motion blur, con una sola función `frame(t)` determinista.

## Voz

| # | Entra | Termina | Dura | Frase |
|---|---|---|---|---|
| L1 | f6 · 0.10 s | f165 · 2.75 s | 2.65 s | Alguien está organizando una fiesta en Aguascalientes. |
| L2 | f204 · 3.40 s | f266 · 4.43 s | 1.04 s | Que te encuentre a ti. |
| L3 | f282 · 4.70 s | f447 · 7.45 s | 2.75 s | Tus inflables, con foto, para elegir. |
| L4 | f600 · 10.00 s | f716 · 11.93 s | 1.93 s | Y su fecha, apartada en un mensaje. |
| L5 | f924 · 15.40 s | f1091 · 18.18 s | 2.78 s | Diversión y elegancia, en una sola página. |
| L6 | f1452 · 24.20 s | f1623 · 27.05 s | 2.85 s | Jumpers Fest. Así se vería con Elevate. |

**Cuadro de cada palabra**

- **L1:** Alguien f6 · está f30 · organizando f42 · una f74 · fiesta f89 · en f110 · Aguascalientes f116
- **L2:** Que f204 · te f216 · encuentre f229 · a f251 · ti f257
- **L3:** Tus f282 · inflables f296 · con f357 · foto f368 · para f413 · elegir f422
- **L4:** Y f600 · su f607 · fecha f617 · apartada f648 · en f677 · un f685 · mensaje f695
- **L5:** Diversión f924 · y f958 · elegancia f962 · en f1013 · una f1030 · sola f1048 · página f1063
- **L6:** Jumpers f1452 · Fest f1479 · Así f1520 · se f1545 · vería f1559 · con f1574 · Elevate f1589

## Línea de tiempo

En cuadros a 60 fps. Pistas: Cámara, Celular, Pantalla (captura real de la página), 3D (piezas que salen de la pantalla), Tubo, Tipo, 2D, End card, Voz y Música.

### Hook · f0–f128 · 0.00–2.15 s

*Compás 1 · golpe en f0, ukulele en rasgueo suave.*

- **f0 · 0.00 s · Música.** Golpe en f0: bombo de fieltro y un “pff” de aire. Fondo blanco cálido #F7F5F2 con cielo pastel muy claro (celeste #C6DFEA al 18 % arriba) y sombras suaves. *SFX: golpe_inicio (f0), pff_aire (f0).*
- **f0–f34 · 0.00 s · Tubo.** Entra el tubo blanco desde abajo a la izquierda, como manguera de aire: 26 px de grueso, costura central punteada, brillo de vinil arriba y sombra suave. Sube en una S hasta el inicio de la barra (x 120, y 960). *SFX: tubo_entra (f0).*
- **f6 · 0.10 s · Voz.** L1: “Alguien está organizando una fiesta en Aguascalientes.”
- **f12–f36 · 0.20 s · 2D.** La barra de búsqueda de cristal se infla desde plana con rebote de resorte (8 %): píldora de 940 × 132 px centrada (x 70–1010, y 894–1026), blur 32 px, saturación 140 %, borde de 1 px y ruido 2 %. Lupa de línea a la izquierda y flecha a la derecha. Genérica: sin logo de ningún buscador. *SFX: cristal_infla (f12).*
- **f38 · 0.63 s · 2D.** Aparece el cursor (parpadea cada 30 cuadros).
- **f40–f116 · 0.67 s · Tubo.** La punta del tubo escribe “renta de inflables aguascalientes” (DM Sans 40 px, tinta #1B1B1B): cada letra sale cuando pasa la punta, con ritmo humano. *SFX: 33 teclas (f40–f116).*
- **f118–f128 · 1.97 s · Tubo.** La punta se levanta y se posa sobre la flecha.

### Llegada · f129–f256 · 2.15–4.28 s

*Compás 2 · entra el bajo redondo.*

- **f129 · 2.15 s · 2D.** Enter en el tiempo fuerte del compás 2: la flecha se hunde (escala 0.92) y suelta con una onda suave. *SFX: enter (f129).*
- **f131–f157 · 2.18 s · 2D.** La barra se desinfla hacia el tubo: pierde volumen y su contorno se vuelve parte del tubo. *SFX: desinfla (f133).*
- **f136–f186 · 2.27 s · Tubo.** El tubo se infla (26 → 40 px) y traza el contorno del celular: un rectángulo redondeado de 532 × 1152 px, en sentido horario desde arriba al centro. *SFX: tubo_infla (f136), trazo_contorno (f140).*
- **f186–f226 · 3.10 s · Celular.** El celular 3D de cristal se materializa dentro del contorno (el tubo se vuelve el brillo del bisel). Entra a escala 0.92, girado 10° en Y y 4° en X, rebota con resorte (8 % de sobrepaso) y se asienta en −3° y 1°. Alto: 60 % del cuadro (1152 px), centro en (540, 915). *SFX: cristal_cuerpo (f186), rebote_vinil (f206), asienta (f222).*
- **f196–f256 · 3.27 s · Pantalla.** Se enciende la pantalla y carga la portada real con su propia entrada: el logo se infla, el arcoíris se dibuja, la foto del Rainbow Jump se infla, luego “Diversión + elegancia” y los dos botones. *SFX: pantalla_enciende (f196), logo_pop (f204), arcoiris_dibuja (f212), foto_infla (f220).*
- **f204 · 3.40 s · Voz.** L2: “Que te encuentre a ti.”
- **f226–f256 · 3.77 s · Tubo.** El tubo se suelta del bisel y queda enrollado en la esquina inferior izquierda del celular, respirando apenas.

### Catálogo · f257–f578 · 4.28–9.65 s

*Compases 3 a 5 · entra el glockenspiel.*

- **f257–f315 · 4.28 s · Pantalla.** Un dedo arrastra hacia arriba y suelta: scroll con inercia hasta “Nuestros inflables” y la tarjeta de Castle Jump (captura real). *SFX: scroll_friccion (f257).*
- **f257–f281 · 4.28 s · Cámara.** Truck: el celular se corre a la derecha (centro x 790) y gira −8° en Y; deja libre la izquierda antes de que entre “TU”.
- **f282 · 4.70 s · Tipo.** “TU” aterriza sobre “Tus” (L3, f282) y se infla. *SFX: tipo_infla (f282).*
- **f282 · 4.70 s · Voz.** L3: “Tus inflables, con foto, para elegir.”
- **f285–f315 · 4.75 s · Pantalla.** La tarjeta de Castle Jump se infla dentro de la pantalla al entrar (animación real de la página). *SFX: tarjeta_infla (f285).*
- **f296 · 4.93 s · Tipo.** “INFLABLE” aterriza sobre “inflables” (L3, f296) y se infla. *SFX: tipo_infla (f296).*
- **f321–f353 · 5.35 s · Pantalla.** Segundo arrastre, más corto: Rainbow Jump queda al centro antes de que salgan las tarjetas; se inflan ella y la parte de arriba de Magic Jump. *SFX: scroll_friccion (f321), tarjeta_infla (f340).*
- **f354–f410 · 5.90 s · 3D.** Sobre “con foto”, las tres tarjetas salen de la pantalla al espacio 3D, una por medio tiempo: Castle Jump (f354), Rainbow Jump (f370) y Magic Jump (f386). Son la misma pieza de interfaz (misma foto, mismo texto) con 8 px de grueso de vinil blanco y sombra de cojín; al salir se inflan (escala 1 → 1.08 → 1). La punta del tubo les da un soplo. Su lugar queda vacío en la captura. *SFX: tarjeta_sale (f354), pff_corto (f356), tarjeta_sale (f370), pff_corto (f372), tarjeta_sale (f386), pff_corto (f388).*
- **f354–f390 · 5.90 s · Cámara.** Dolly hacia atrás (celular de 60 % a 49 %) y órbita de 5°: las tarjetas quedan en escalera a tres profundidades (Castle atrás y arriba, Magic al frente y abajo), se ven las tres fotos y ninguna pasa de 408 px de ancho en cuadro.
- **f390–f446 · 6.50 s · 3D.** Flotan: vaivén de ±6 px y ±2°. *SFX: aire_flota (f390).*
- **f422 · 7.03 s · Tipo.** “ELIGE” aterriza sobre “elegir” (L3, f422) y se infla. *SFX: tipo_infla (f422).*
- **f446–f478 · 7.43 s · 3D.** Regresan a su lugar con resorte: Magic (f446), Castle (f454) y Rainbow (f462). La pantalla se completa. *SFX: tarjeta_regresa (f446), tarjeta_regresa (f454), tarjeta_regresa (f462).*
- **f450–f478 · 7.50 s · Cámara.** El celular vuelve al 60 %.
- **f482 · 8.03 s · Pantalla.** Tap en la foto de Rainbow Jump (tiempo 3 del compás 4): sube su ficha (captura real). *SFX: tap (f482), hoja_sube (f488).*
- **f490–f502 · 8.17 s · Tipo.** “ELIGE / TU / INFLABLE” se desinfla y sale.
- **f500–f530 · 8.33 s · Cámara.** El celular regresa al centro (x 540) y a −2° en Y.
- **f514–f576 · 8.57 s · 3D.** En el tiempo fuerte del compás 5, la descripción sale de la ficha al 3D: el mismo bloque de texto (“Un brincolín lleno de color, alegría y mucha diversión. Sus tonos vibrantes iluminan cada evento.”) sobre un cojín blanco, crece a 1.9× para leerse al tamaño de un celular real, flota y regresa en f562. Sin foto: así no se agranda la de 408 px. *SFX: panel_sale (f514), panel_regresa (f562).*

### Aparta tu fecha · f579–f899 · 9.65–15.00 s

*Compases 5 a 7 · entran las palmas.*

- **f579 · 9.65 s · Pantalla.** Tap en “Lo quiero” (tiempo 3 del compás 5): la ficha baja, la página baja a “Aparta tu fecha” con Rainbow Jump elegido y se abre el calendario de noviembre de 2026 (captura real). *SFX: tap (f579), hoja_baja (f585), scroll_suave (f603), calendario_abre (f637).*
- **f579–f593 · 9.65 s · Cámara.** Truck: el celular se corre a la izquierda (centro x 290) y gira +8° en Y; el texto va a la derecha.
- **f600 · 10.00 s · Voz.** L4: “Y su fecha, apartada en un mensaje.”
- **f607 · 10.12 s · Tipo.** “TU” aterriza sobre “su” (L4, f607) y se infla. *SFX: tipo_infla (f607).*
- **f617 · 10.28 s · Tipo.** “FECHA” aterriza sobre “fecha” (L4, f617) y se infla. *SFX: tipo_infla (f617).*
- **f648 · 10.80 s · Tipo.** “APARTA” aterriza sobre “apartada” (L4, f648) y se infla. *SFX: tipo_infla (f648).*
- **f668–f680 · 11.13 s · Tipo.** “TU FECHA” se desinfla y sale.
- **f675 · 11.25 s · Pantalla.** Tap en el sábado 21: el día se infla en negro con rebote; el calendario se cierra solo (f712–f730). *SFX: tap (f675), fecha_infla (f681), calendario_cierra (f712).*
- **f677 · 11.28 s · Tipo.** “EN” aterriza sobre “en” (L4, f677) y se infla. *SFX: tipo_infla (f677).*
- **f685 · 11.42 s · Tipo.** “UN” aterriza sobre “un” (L4, f685) y se infla. *SFX: tipo_infla (f685).*
- **f695 · 11.58 s · Tipo.** “MENSAJE” aterriza sobre “mensaje” (L4, f695) y se infla. *SFX: tipo_infla (f695).*
- **f707 · 11.78 s · Pantalla.** Tap en “Colonia o salón”: sube el teclado (genérico, en español, con ñ) y el campo sube por encima de él. *SFX: tap (f707), teclado_sube (f713).*
- **f724–f764 · 12.07 s · Pantalla.** Se teclea “Las Américas”. *SFX: 12 teclas (f724–f764).*
- **f752–f764 · 12.53 s · Tipo.** “APARTA / EN UN / MENSAJE” se desinfla y sale.
- **f766–f794 · 12.77 s · Cámara.** El celular regresa al centro y hace push-in a los campos y al teclado (1.236 → 1.75 px de video por px CSS). Solo quedan a la vista las miniaturas de 98 px CSS (171 px en cuadro).
- **f771 · 12.85 s · Pantalla.** Tap en “Horario aproximado” (tiempo fuerte del compás 7). *SFX: tap (f771).*
- **f778–f802 · 12.97 s · Pantalla.** Se teclea “4:00 pm”. *SFX: 7 teclas (f778–f802).*
- **f808 · 13.47 s · Pantalla.** Tap en “listo” del teclado: el teclado baja. *SFX: tap (f808), teclado_baja (f814).*
- **f814–f838 · 13.57 s · Pantalla.** Arrastre corto: quedan a la vista la vista previa del mensaje y el botón “Apartar por WhatsApp” (ya activo, en negro). *SFX: scroll_friccion (f814).*
- **f814–f862 · 13.57 s · Cámara.** Reencuadre a la vista previa (2.0 px por px CSS): el mensaje armado (Rainbow Jump, sábado 21 de noviembre, Las Américas, 4:00 pm) se lee al tamaño de un celular real. Sin fotos en cuadro.
- **f862–f880 · 14.37 s · Cámara.** Se abre a 1.45 px por px CSS, centrada en el botón.
- **f868–f892 · 14.47 s · 3D.** En el tiempo 4 del compás 7, el botón “Apartar por WhatsApp” sale de la pantalla como cojín de vinil: la misma pieza (negra, texto blanco, ícono genérico de chat) toma volumen, las costuras se tensan, brillo especular suave, se infla con resorte (8 %) y avanza 60 px hacia la cámara. Su lugar queda vacío. *SFX: boton_infla (f868), pff_corto (f870).*
- **f896 · 14.93 s · 3D.** Tap en el cojín: se aplasta (0.9) y hace pop justo en el lift de f900 (1.06 → 1). Es el “envío”: en la captura no se toca el botón real, así que la hoja “¡Tu mensaje está listo!” no sale y no se muestra WhatsApp (es de terceros). *SFX: tap (f896), boton_pop (f900).*

### Arma tu fiesta · f900–f1156 · 15.00–19.28 s

*Compases 8 y 9 · lift: entran las cuerdas en pizzicato.*

- **f900 · 15.00 s · Música.** Lift: entran las cuerdas en pizzicato y el groove completo. *SFX: lift (f900).*
- **f900–f914 · 15.00 s · 3D.** El cojín regresa a la pantalla con resorte. *SFX: boton_regresa (f912).*
- **f900–f910 · 15.00 s · Cámara.** Regresa a 60 % y truck a la derecha (centro x 800, −8° en Y) en el lift.
- **f906–f956 · 15.10 s · Pantalla.** Arrastre con inercia hasta “Arma tu fiesta”: la postal de foto_08 (combo con mesitas pastel) se infla al entrar. *SFX: scroll_friccion (f906), tarjeta_infla (f940).*
- **f924 · 15.40 s · Tipo.** “DIVERSIÓN” aterriza sobre “Diversión” (L5, f924) y se infla. *SFX: tipo_infla (f924).*
- **f924 · 15.40 s · Voz.** L5: “Diversión y elegancia, en una sola página.”
- **f958 · 15.97 s · Tipo.** “+” aterriza sobre “y” (L5, f958) y se infla. *SFX: pff_corto (f958), tipo_infla (f958).*
- **f962 · 16.03 s · Tipo.** “ELEGANCIA” aterriza sobre “elegancia” (L5, f962) y se infla. *SFX: tipo_infla (f962).*
- **f1000–f1012 · 16.67 s · Tipo.** “DIVERSIÓN / + ELEGANCIA” se desinfla y sale.
- **f1008–f1040 · 16.80 s · Cámara.** El celular vuelve al centro con un leve dolly hacia atrás (55 %).
- **f1016–f1061 · 16.93 s · 3D.** La postal sale de la pantalla como postal grande: la misma pieza (foto_08, “Pregunta por mobiliario” y su botón) con grueso y sombra, crece a 2× (foto de ~816 px; su detalle real es de ~1300 px), gira 10° y flota al centro. *SFX: postal_sale (f1016), aire_flota (f1050).*
- **f1061–f1085 · 17.68 s · 3D.** La postal regresa a su lugar con resorte (tiempo 2 del compás 9). *SFX: postal_regresa (f1061).*
- **f1093–f1143 · 18.22 s · Pantalla.** Arrastre hasta “Cómo funciona”: los tres pasos se inflan uno a uno (rosa, amarillo y menta): Eliges, Apartas, Lo llevamos. *SFX: scroll_friccion (f1093), paso_infla (f1112), paso_infla (f1124), paso_infla (f1136).*
- **f1112–f1152 · 18.53 s · Tubo.** La punta del tubo recorre la costura punteada que une los tres pasos. *SFX: costura (f1112).*

### Cierre · f1157–f1439 · 19.28–24.00 s

*Compases 10 y 11 · se adelgaza; respiro en f1380.*

- **f1157–f1215 · 19.28 s · Cámara.** El celular se aleja a la izquierda: baja a 32 % de alto, gira 20° en Y y −5° en Z y queda abajo a la izquierda; sale del cuadro entre f1286 y f1330. *SFX: celular_se_aleja (f1157).*
- **f1165–f1235 · 19.42 s · Tubo.** El tubo se suelta del celular y sube en un arco grande que cruza el cuadro (x 150–930, cima en y 520, patas hasta y 1180). *SFX: tubo_arquea (f1165).*
- **f1235–f1290 · 20.58 s · 3D.** El arco se infla en un arcoíris pastel 3D: cinco bandas de vinil (rosa, amarillo, menta, celeste y lila) que se inflan de afuera hacia adentro cada 10 cuadros, con resorte (8 %), costuras y brillo especular suave, y sombra de contacto en el piso. *SFX: banda_infla (f1235), banda_infla (f1245), banda_infla (f1255), banda_infla (f1265), banda_infla (f1275).*
- **f1286–f1380 · 21.43 s · Cámara.** Push-in lento y órbita de 3° alrededor del arcoíris.
- **f1380–f1440 · 23.00 s · Música.** Respiro: la música se detiene y queda el aire; el arcoíris respira (escala 1.00 → 1.01 → 1.00). *SFX: respiro (f1380).*

### End card · f1440–f1649 · 24.00–27.50 s

*Golpe grave suave en f1440 y cola hasta el final (3.5 s).*

- **f1440 · 24.00 s · Música.** Golpe grave suave, como un rebote. *SFX: golpe_final (f1440).*
- **f1440–f1476 · 24.00 s · End card.** Bajo el arcoíris se infla una placa blanca (cojín 3D con costura) con el logo real encima (logo_jumpers_transparente.png, 620 px de ancho; nunca se redibuja ni se recolorea). Centro en (540, 1080). *SFX: placa_infla (f1440), logo_pop (f1452).*
- **f1452 · 24.20 s · Voz.** L6: “Jumpers Fest. Así se vería con Elevate.”
- **f1520–f1540 · 25.33 s · End card.** “Así se vería tu página · Elevate Negocios” (DM Sans SemiBold 44 px, tinta, y 1360) aparece sobre “Así” de la voz. Elevate va solo en texto. *SFX: texto_aparece (f1520).*
- **f1556–f1576 · 25.93 s · End card.** Línea obligatoria: “Demo de cortesía de Elevate Negocios · pieza no oficial” (DM Sans 28 px, #66635F, y 1520).
- **f1580–f1649 · 26.33 s · Música.** Cola del acorde final hasta el último cuadro; el arcoíris y la placa respiran.

## Kinetic type

Fredoka SemiBold en mayúsculas, tinta #1B1B1B. Cada glifo entra cada 1.5 cuadros (25 ms) desde una máscara, subiendo 40 px con desenfoque de 6 → 0 px, y al aterrizar se infla (escala 0.7 → 1 con 8 % de sobrepaso); tarda 14 cuadros, y el primer glifo aterriza justo en su palabra de la voz. Sale desinflándose en 16 cuadros. Nunca encima de la interfaz.

| # | Palabra | Aterriza | Sobre la voz | Sale | Posición | Tamaño |
|---|---|---|---|---|---|---|
| K1 | TU | f282 · 4.70 s | “Tus” (L3, f282) | f490 | izquierda del celular · línea 2 (y 900) | 88 px |
| K2 | INFLABLE | f296 · 4.93 s | “inflables” (L3, f296) | f490 | izquierda · línea 3 (y 990) | 88 px |
| K3 | ELIGE | f422 · 7.03 s | “elegir” (L3, f422) | f490 | izquierda · línea 1 (y 800), encima de “TU INFLABLE” | 88 px |
| K4 | TU | f607 · 10.12 s | “su” (L4, f607) | f668 | derecha del celular · línea 2 (y 900) | 80 px |
| K5 | FECHA | f617 · 10.28 s | “fecha” (L4, f617) | f668 | derecha · línea 2, después de “TU” | 80 px |
| K6 | APARTA | f648 · 10.80 s | “apartada” (L4, f648) | f752 | derecha · línea 1 (y 800): se lee “APARTA / TU FECHA” | 88 px |
| K7 | EN | f677 · 11.28 s | “en” (L4, f677) | f752 | derecha · línea 2, en el lugar de “TU FECHA” | 80 px |
| K8 | UN | f685 · 11.42 s | “un” (L4, f685) | f752 | derecha · línea 2, después de “EN” | 80 px |
| K9 | MENSAJE | f695 · 11.58 s | “mensaje” (L4, f695) | f752 | derecha · línea 3 (y 990): se lee “APARTA / EN UN / MENSAJE” | 80 px |
| K10 | DIVERSIÓN | f924 · 15.40 s | “Diversión” (L5, f924) | f1000 | izquierda del celular · línea 1 (y 860) | 80 px |
| K11 | + | f958 · 15.97 s | “y” (L5, f958) | f1000 | izquierda · línea 2 (y 960): cojín rosa como el de la página; cae en la “y” | 80 px |
| K12 | ELEGANCIA | f962 · 16.03 s | “elegancia” (L5, f962) | f1000 | izquierda · línea 2, después del “+” | 80 px |

## Música

Original, hecha en código a 112 BPM en Do mayor: ukulele y pizzicato con cuerda pulsada sintetizada (Karplus-Strong), glockenspiel por síntesis aditiva, palmas y golpes con ruido filtrado, y bajo redondo de onda senoidal con saturación suave. Queda al menos 12 dB bajo cada palabra (sidechain desde la voz). Voz a −16 LUFS; master a −14 LUFS y −1.25 dBTP.

| Compás | Desde | Acorde | Capas |
|---|---|---|---|
| 1 | f0 · 0.00 s | Cadd9 | Golpe suave en f0 (bombo de fieltro + soplo de aire) y ukulele en rasgueo suave |
| 2 | f129 · 2.15 s | G/B | + bajo redondo y bombo en 1 y 3 |
| 3 | f257 · 4.28 s | Am7 | + glockenspiel (melodía corta en corcheas) |
| 4 | f386 · 6.43 s | Fmaj7 | Glockenspiel responde a cada tarjeta que sale |
| 5 | f514 · 8.57 s | C | Igual; en f579 (tiempo 3) entran las palmas en 2 y 4 |
| 6 | f643 · 10.72 s | G | Ukulele, bajo, glockenspiel y palmas |
| 7 | f771 · 12.85 s | Am7 | Igual, con un fill de ukulele hacia el lift |
| 8 | f900 · 15.00 s | F | Lift en f900: entran las cuerdas en pizzicato y el groove completo |
| 9 | f1029 · 17.15 s | C/E | Groove completo |
| 10 | f1157 · 19.28 s | Fmaj7 | Se adelgaza: ukulele y pizzicato; una nota de glockenspiel por banda del arcoíris |
| 11 | f1286 · 21.43 s | Gsus4 | Pad suave; respiro en f1380: la música se detiene y queda el aire |
| 12 | f1440 · 24.00 s | Cadd9 | Golpe grave suave (como rebote) y acorde final de ukulele con cola de 3.5 s |

## Re-layout 1:1 (1080 × 1080)

- El celular sube al 86 % del alto (929 px; ≈ 0.99 px de video por px CSS) para que la interfaz se lea igual que en 9:16; las fotos quedan por debajo de su detalle real.
- El kinetic type va al lado del celular, con 520 px libres; mismas palabras y mismos cuadros.
- Barra de búsqueda de 900 px; arcoíris de y 120 a 620; placa con logo de y 560 a 800; texto en y 860 y línea legal en y 960. Márgenes de 60 px.

## SFX

**139 cues** (el mínimo era 70), todos generados en código.

| # | Cuadro | Cue | Sonido |
|---|---|---|---|
| 1 | f0 · 0.00 s | golpe_inicio | Bombo de fieltro corto con cuerda de ukulele apagada |
| 2 | f0 · 0.00 s | pff_aire | Soplo de aire comprimido de válvula, 180 ms |
| 3 | f0 · 0.00 s | tubo_entra | Roce de vinil con aire que avanza, 450 ms |
| 4 | f12 · 0.20 s | cristal_infla | Cristal que toma volumen: brillo agudo y aire suave |
| 5 | f40 · 0.67 s | tecla “r” | Tecla de celular, suave; cada una con su pequeña variación |
| 6 | f43 · 0.72 s | tecla “e” | Tecla de celular, suave; cada una con su pequeña variación |
| 7 | f44 · 0.73 s | tecla “n” | Tecla de celular, suave; cada una con su pequeña variación |
| 8 | f47 · 0.78 s | tecla “t” | Tecla de celular, suave; cada una con su pequeña variación |
| 9 | f51 · 0.85 s | tecla “a” | Tecla de celular, suave; cada una con su pequeña variación |
| 10 | f52 · 0.87 s | tecla “espacio” | Tecla de celular, suave; cada una con su pequeña variación |
| 11 | f53 · 0.88 s | tecla “d” | Tecla de celular, suave; cada una con su pequeña variación |
| 12 | f58 · 0.97 s | tecla “e” | Tecla de celular, suave; cada una con su pequeña variación |
| 13 | f59 · 0.98 s | tecla “espacio” | Tecla de celular, suave; cada una con su pequeña variación |
| 14 | f62 · 1.03 s | tecla “i” | Tecla de celular, suave; cada una con su pequeña variación |
| 15 | f63 · 1.05 s | tecla “n” | Tecla de celular, suave; cada una con su pequeña variación |
| 16 | f66 · 1.10 s | tecla “f” | Tecla de celular, suave; cada una con su pequeña variación |
| 17 | f70 · 1.17 s | tecla “l” | Tecla de celular, suave; cada una con su pequeña variación |
| 18 | f71 · 1.18 s | tecla “a” | Tecla de celular, suave; cada una con su pequeña variación |
| 19 | f72 · 1.20 s | tecla “b” | Tecla de celular, suave; cada una con su pequeña variación |
| 20 | f77 · 1.28 s | tecla “l” | Tecla de celular, suave; cada una con su pequeña variación |
| 21 | f78 · 1.30 s | tecla “e” | Tecla de celular, suave; cada una con su pequeña variación |
| 22 | f81 · 1.35 s | tecla “s” | Tecla de celular, suave; cada una con su pequeña variación |
| 23 | f82 · 1.37 s | tecla “espacio” | Tecla de celular, suave; cada una con su pequeña variación |
| 24 | f85 · 1.42 s | tecla “a” | Tecla de celular, suave; cada una con su pequeña variación |
| 25 | f89 · 1.48 s | tecla “g” | Tecla de celular, suave; cada una con su pequeña variación |
| 26 | f90 · 1.50 s | tecla “u” | Tecla de celular, suave; cada una con su pequeña variación |
| 27 | f91 · 1.52 s | tecla “a” | Tecla de celular, suave; cada una con su pequeña variación |
| 28 | f96 · 1.60 s | tecla “s” | Tecla de celular, suave; cada una con su pequeña variación |
| 29 | f97 · 1.62 s | tecla “c” | Tecla de celular, suave; cada una con su pequeña variación |
| 30 | f100 · 1.67 s | tecla “a” | Tecla de celular, suave; cada una con su pequeña variación |
| 31 | f101 · 1.68 s | tecla “l” | Tecla de celular, suave; cada una con su pequeña variación |
| 32 | f104 · 1.73 s | tecla “i” | Tecla de celular, suave; cada una con su pequeña variación |
| 33 | f108 · 1.80 s | tecla “e” | Tecla de celular, suave; cada una con su pequeña variación |
| 34 | f109 · 1.82 s | tecla “n” | Tecla de celular, suave; cada una con su pequeña variación |
| 35 | f110 · 1.83 s | tecla “t” | Tecla de celular, suave; cada una con su pequeña variación |
| 36 | f115 · 1.92 s | tecla “e” | Tecla de celular, suave; cada una con su pequeña variación |
| 37 | f116 · 1.93 s | tecla “s” | Tecla de celular, suave; cada una con su pequeña variación |
| 38 | f129 · 2.15 s | enter | Tecla con más cuerpo y un clic |
| 39 | f133 · 2.22 s | desinfla | Aire que sale despacio de un cojín |
| 40 | f136 · 2.27 s | tubo_infla | Aire que entra a un tubo de vinil que se estira |
| 41 | f140 · 2.33 s | trazo_contorno | Vinil que se desliza sobre cristal, ascendente |
| 42 | f186 · 3.10 s | cristal_cuerpo | Cuerpo de cristal que se materializa, resonancia suave |
| 43 | f196 · 3.27 s | pantalla_enciende | Brillo suave de encendido |
| 44 | f204 · 3.40 s | logo_pop | Pop redondo de burbuja |
| 45 | f206 · 3.43 s | rebote_vinil | Rebote amortiguado de inflable: “bomp” grave con cola |
| 46 | f212 · 3.53 s | arcoiris_dibuja | Barrido brillante corto |
| 47 | f220 · 3.67 s | foto_infla | Aire corto y pop suave |
| 48 | f222 · 3.70 s | asienta | Micro rebote final |
| 49 | f257 · 4.28 s | scroll_friccion | Dedo sobre cristal con inercia que frena |
| 50 | f282 · 4.70 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 51 | f285 · 4.75 s | tarjeta_infla | Inflado corto de cojín: aire y estiramiento |
| 52 | f296 · 4.93 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 53 | f321 · 5.35 s | scroll_friccion | Dedo sobre cristal con inercia que frena |
| 54 | f340 · 5.67 s | tarjeta_infla | Inflado corto de cojín: aire y estiramiento |
| 55 | f354 · 5.90 s | tarjeta_sale | Despegue: aire y whoosh corto |
| 56 | f356 · 5.93 s | pff_corto | Soplo muy corto y más agudo, 90 ms |
| 57 | f370 · 6.17 s | tarjeta_sale | Despegue: aire y whoosh corto |
| 58 | f372 · 6.20 s | pff_corto | Soplo muy corto y más agudo, 90 ms |
| 59 | f386 · 6.43 s | tarjeta_sale | Despegue: aire y whoosh corto |
| 60 | f388 · 6.47 s | pff_corto | Soplo muy corto y más agudo, 90 ms |
| 61 | f390 · 6.50 s | aire_flota | Colchón de aire continuo, muy suave |
| 62 | f422 · 7.03 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 63 | f446 · 7.43 s | tarjeta_regresa | Asentamiento: bump suave y clic de encaje |
| 64 | f454 · 7.57 s | tarjeta_regresa | Asentamiento: bump suave y clic de encaje |
| 65 | f462 · 7.70 s | tarjeta_regresa | Asentamiento: bump suave y clic de encaje |
| 66 | f482 · 8.03 s | tap | Toque en cristal, seco y suave |
| 67 | f488 · 8.13 s | hoja_sube | Whoosh corto de panel que sube |
| 68 | f514 · 8.57 s | panel_sale | Cojín que se separa: aire y whoosh suave |
| 69 | f562 · 9.37 s | panel_regresa | Cojín que vuelve: bump suave |
| 70 | f579 · 9.65 s | tap | Toque en cristal, seco y suave |
| 71 | f585 · 9.75 s | hoja_baja | Whoosh corto de panel que baja |
| 72 | f603 · 10.05 s | scroll_suave | Deslizamiento automático suave |
| 73 | f607 · 10.12 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 74 | f617 · 10.28 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 75 | f637 · 10.62 s | calendario_abre | Despliegue con resorte |
| 76 | f648 · 10.80 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 77 | f675 · 11.25 s | tap | Toque en cristal, seco y suave |
| 78 | f677 · 11.28 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 79 | f681 · 11.35 s | fecha_infla | Pop afinado con aire |
| 80 | f685 · 11.42 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 81 | f695 · 11.58 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 82 | f707 · 11.78 s | tap | Toque en cristal, seco y suave |
| 83 | f712 · 11.87 s | calendario_cierra | Pliegue suave |
| 84 | f713 · 11.88 s | teclado_sube | Teclado que sube |
| 85 | f724 · 12.07 s | tecla “L” | Tecla de celular, suave; cada una con su pequeña variación |
| 86 | f729 · 12.15 s | tecla “a” | Tecla de celular, suave; cada una con su pequeña variación |
| 87 | f730 · 12.17 s | tecla “s” | Tecla de celular, suave; cada una con su pequeña variación |
| 88 | f735 · 12.25 s | tecla “espacio” | Tecla de celular, suave; cada una con su pequeña variación |
| 89 | f740 · 12.33 s | tecla “A” | Tecla de celular, suave; cada una con su pequeña variación |
| 90 | f742 · 12.37 s | tecla “m” | Tecla de celular, suave; cada una con su pequeña variación |
| 91 | f745 · 12.42 s | tecla “é” | Tecla de celular, suave; cada una con su pequeña variación |
| 92 | f750 · 12.50 s | tecla “r” | Tecla de celular, suave; cada una con su pequeña variación |
| 93 | f753 · 12.55 s | tecla “i” | Tecla de celular, suave; cada una con su pequeña variación |
| 94 | f758 · 12.63 s | tecla “c” | Tecla de celular, suave; cada una con su pequeña variación |
| 95 | f759 · 12.65 s | tecla “a” | Tecla de celular, suave; cada una con su pequeña variación |
| 96 | f764 · 12.73 s | tecla “s” | Tecla de celular, suave; cada una con su pequeña variación |
| 97 | f771 · 12.85 s | tap | Toque en cristal, seco y suave |
| 98 | f778 · 12.97 s | tecla “4” | Tecla de celular, suave; cada una con su pequeña variación |
| 99 | f783 · 13.05 s | tecla “:” | Tecla de celular, suave; cada una con su pequeña variación |
| 100 | f785 · 13.08 s | tecla “0” | Tecla de celular, suave; cada una con su pequeña variación |
| 101 | f790 · 13.17 s | tecla “0” | Tecla de celular, suave; cada una con su pequeña variación |
| 102 | f795 · 13.25 s | tecla “espacio” | Tecla de celular, suave; cada una con su pequeña variación |
| 103 | f798 · 13.30 s | tecla “p” | Tecla de celular, suave; cada una con su pequeña variación |
| 104 | f802 · 13.37 s | tecla “m” | Tecla de celular, suave; cada una con su pequeña variación |
| 105 | f808 · 13.47 s | tap | Toque en cristal, seco y suave |
| 106 | f814 · 13.57 s | scroll_friccion | Dedo sobre cristal con inercia que frena |
| 107 | f814 · 13.57 s | teclado_baja | Teclado que baja |
| 108 | f868 · 14.47 s | boton_infla | Cojín de vinil que se llena: aire más largo y costuras que se tensan |
| 109 | f870 · 14.50 s | pff_corto | Soplo muy corto y más agudo, 90 ms |
| 110 | f896 · 14.93 s | tap | Toque en cristal, seco y suave |
| 111 | f900 · 15.00 s | boton_pop | Pop grande y redondo, como globo chico (sin estallido agresivo) |
| 112 | f900 · 15.00 s | lift | Subida del lift: platillo suave invertido |
| 113 | f906 · 15.10 s | scroll_friccion | Dedo sobre cristal con inercia que frena |
| 114 | f912 · 15.20 s | boton_regresa | Bump al regresar a la pantalla |
| 115 | f924 · 15.40 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 116 | f940 · 15.67 s | tarjeta_infla | Inflado corto de cojín: aire y estiramiento |
| 117 | f958 · 15.97 s | pff_corto | Soplo muy corto y más agudo, 90 ms |
| 118 | f958 · 15.97 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 119 | f962 · 16.03 s | tipo_infla | Palabra que se infla: aire corto y pop, afinado al acorde |
| 120 | f1016 · 16.93 s | postal_sale | Despegue más grande: aire y whoosh |
| 121 | f1050 · 17.50 s | aire_flota | Colchón de aire continuo, muy suave |
| 122 | f1061 · 17.68 s | postal_regresa | Asentamiento con bump |
| 123 | f1093 · 18.22 s | scroll_friccion | Dedo sobre cristal con inercia que frena |
| 124 | f1112 · 18.53 s | costura | Deslizamiento a lo largo de una costura, como cierre suave |
| 125 | f1112 · 18.53 s | paso_infla | Inflado corto afinado (sube una nota por paso) |
| 126 | f1124 · 18.73 s | paso_infla | Inflado corto afinado (sube una nota por paso) |
| 127 | f1136 · 18.93 s | paso_infla | Inflado corto afinado (sube una nota por paso) |
| 128 | f1157 · 19.28 s | celular_se_aleja | Whoosh largo que se aleja |
| 129 | f1165 · 19.42 s | tubo_arquea | Estiramiento largo de vinil |
| 130 | f1235 · 20.58 s | banda_infla | Inflado de cada banda del arcoíris, afinado en la escala |
| 131 | f1245 · 20.75 s | banda_infla | Inflado de cada banda del arcoíris, afinado en la escala |
| 132 | f1255 · 20.92 s | banda_infla | Inflado de cada banda del arcoíris, afinado en la escala |
| 133 | f1265 · 21.08 s | banda_infla | Inflado de cada banda del arcoíris, afinado en la escala |
| 134 | f1275 · 21.25 s | banda_infla | Inflado de cada banda del arcoíris, afinado en la escala |
| 135 | f1380 · 23.00 s | respiro | Aire de la sala |
| 136 | f1440 · 24.00 s | golpe_final | Golpe grave suave, como rebote |
| 137 | f1440 · 24.00 s | placa_infla | Cojín que se llena con calma |
| 138 | f1452 · 24.20 s | logo_pop | Pop redondo de burbuja |
| 139 | f1520 · 25.33 s | texto_aparece | Brillo corto y suave |

## Verificaciones

- ✅ Duración: 1650 cuadros (27.5 s): end card de 3.5 s porque L6 dura 2.85 s.
- ✅ Las secciones cubren el video sin huecos ni encimes.
- ✅ Las secciones empiezan en los tiempos del beat sheet (2.14, 4.28, 9.64, 15.00, 19.28 y 24.00 s).
- ✅ SFX: 139 cues (mínimo 70).
- ✅ Ninguna frase de voz se encima con la siguiente si respeta su duración máxima.
- ✅ La última frase termina 0.4 s antes del final.
- ✅ Kinetic type: máximo 4 palabras legibles a la vez (f671; límite 3 o 4).
- ✅ Kinetic type de 42 px o más.
- ✅ Cada palabra se queda al menos 20 cuadros después de aterrizar.
- ✅ Kinetic type amarrado a la voz: las 12 palabras aterrizan en el cuadro de su palabra (voz/voz_bloqueada.json).
- ✅ Toques sobre un tiempo del compás: 5 de 7 (f482, f579, f675, f707, f771).
- ✅ Todos los eventos terminan dentro del video.
