# Brief de producción · Ana Gaby Repostería · Fase 2

Video vertical que le enseña a la dueña cómo se vería su página. Un solo plano continuo, sin cortes, guiado por una línea de betún que sale de una manga pastelera. La interfaz manda; el betún la sirve.

## Cambios al brief original (para aprobar)

1. **28 s en vez de 27 s (end card de 4 s).** La L7 completa, «Ana Gaby Repostería. Así se vería con Elevate.», dura 3.34 s en la toma y no cabe entre 24.40 y 27.00. Con 4 s cabe con aire (entra en 24.30 y termina en 27.52), igual que se aprobó en Florería Roma. Si prefieres los 27 s, uso la versión corta que ya viene en la toma («Ana Gaby Repostería, con Elevate.», 2.28 s) y solo cambia la end card.
2. **El cierre empieza en 22.40 en vez de 22.80.** «Lo que ya se antoja / también se busca.» son 8 palabras: en 1.2 s no da tiempo de leerlas. Con 1.6 s se escriben y se leen. Para no quitarle tiempo a las reseñas (siguen con sus 3.2 s), el pedido cierra 0.4 s antes (19.20). El respiro (23.00) y el golpe grave (24.00) no se mueven.
3. **«HABLAN / POR TI» en vez de «ASÍ HABLAN / DE TI»,** para que cada palabra aterrice en su palabra de la voz («reseñas que hablan por ti»). Es el mismo cambio que se aprobó en Florería Roma.
4. **«TU PEDIDO» entra mientras se escribe «Feliz cumpleaños»** (0.8 s en pantalla) y le pasa el relevo a «EN UN MENSAJE», que aterriza en la voz. Juntos serían 5 palabras, más del máximo de 4. «RECIÉN / HORNEADAS» no está en la voz: aterriza en el pulso, justo al terminar la L3.
5. **«Feliz cumpleaños» se escribe con sugerencias del teclado** (dos letras y la sugerencia, por palabra): es como se escribe en un celular y cabe en 0.45 s sin verse acelerado.
6. **El tap de «Cotiza tu pastel» es en la pestaña «A tu medida».** Lleva al mismo panel; el botón de la portada queda muy arriba en ese momento.
7. **Las reseñas salen como la misma tarjeta blanca de la página, con canto de cristal.** El brief pide «tarjetas de cristal» y también que lo que sale de la pantalla sea la misma pieza; así se cumplen las dos cosas.
8. **Celular al 65 % del alto (60 % durante la foto y el pastel 3D),** corrido a la izquierda cuando hay texto o piezas 3D a la derecha. Así el botón «Enviar por WhatsApp» nunca cae en los 340 px inferiores.

Además: el betún es rosa (como su betún) y la manga completa solo se ve en el hook y en la end card; en medio, la punta guía la línea. El celular no lleva barra de dirección, porque no vamos a inventar un dominio.

## Especificaciones

- **Duración:** 1680 cuadros a 60 fps (28.00 s): 24 s de pieza y 4 s de end card. A 98 BPM un tiempo son 36.73 cuadros y un compás, 146.9.
- **Formatos:** 9:16 de 1080 × 1920 (principal) y re-layout real a 1:1 de 1080 × 1080. Master a 60 fps y versión H.264 a 30 fps con `-preset veryfast` para WhatsApp.
- **Zonas seguras en 9:16:** nada importante arriba de y 250 ni debajo de y 1580. El kinetic type mide 56 px o más y siempre va fuera de la pantalla del celular.
- **Paleta:** fondo tinta cálida #1E1A1B con degradado sutil a rosa muy oscuro #3A2027; en el hook, chocolate oscuro #2A1C18. Interfaz: blanco, crema rosado #FBF5F3, rosa acuarela #E6A3B0, rosa caja #E5959A, rosa palo #E9C3B8 y tinta #1E1A1B. Sin azules ni neón.
- **Tipografía:** Cormorant Garamond Itálica SemiBold para el kinetic type (mayúsculas) y el nombre de la end card; DM Sans para la interfaz, la barra de búsqueda y la línea legal; EMS Allure (un solo trazo, OFL) para la letra de betún. Todas locales.
- **Celular:** cristal con leve tinte rosado, bisel redondeado y grosor visible. Refracta el fondo y su reflejo se mueve con la cámara. Cámara frontal y barra de estado genéricas (12:00, sin operador). Luz cálida arriba a la izquierda, contorno rosa tenue y sombra de contacto suave.
- **Betún:** rosa #F2B9C3 con brillo #FFE8EC y sombra #C47A88. Mide 9 px al escribir y 6 px en bordes y subrayados, con volumen (perfil redondo), brillo húmedo y las 6 estrías de la boquilla. Cuando pasa sobre la pantalla sigue la perspectiva del celular.
- **Toques:** círculo de contacto de 44 px de interfaz (blanco al 35 %) sobre la onda y el estado presionado reales de la página.
- **Cristal:** blur de 28 a 40 px de lo que hay detrás, saturación 140 %, borde de 1 px y ruido del 2 % (barra, celular, placa de la end card y cantos de las reseñas).
- **Fotos:** las de Instagram nunca pasan de 400 px de ancho en cuadro; las de su ficha, de 600; push-in a la portada hasta 2.0×; letrero AG a 340 px. Los push-in largos se hacen sobre texto.
- **Render:** función determinista frame(t) compartida y supermuestreo temporal de 8 subcuadros para el motion blur.

## Voz

Toma única de ElevenLabs (voz «Hope», eleven v4). La transcripción sin guion previo coincide palabra por palabra; «Ana Gaby» se oye «Ana Gabi». Las 7 frases caben en su ventana con estos ajustes: se recorta la respiración del inicio de la L1 y la pausa interna de la L7 baja de 0.40 a 0.28 s. En la fase 3 se procesa y se deja en −16 LUFS.

| # | Entra | Termina | Dura | Frase |
|---|---|---|---|---|
| L1 | f24 · 0.40 s | f130 · 2.17 s | 1.77 s | Alguien tiene antojo de galletas. |
| L2 | f174 · 2.90 s | f227 · 3.78 s | 0.88 s | Que te encuentre a ti. |
| L3 | f318 · 5.30 s | f454 · 7.57 s | 2.27 s | Tus galletas y pasteles, en tu página. |
| L4 | f612 · 10.20 s | f775 · 12.92 s | 2.71 s | Y su pastel, idéntico a la foto que te mande. |
| L5 | f972 · 16.20 s | f1042 · 17.37 s | 1.17 s | Todo en un mensaje. |
| L6 | f1200 · 20.00 s | f1298 · 21.63 s | 1.64 s | Y con reseñas que hablan por ti. |
| L7 | f1458 · 24.30 s | f1651 · 27.52 s | 3.22 s | Ana Gaby Repostería. Así se vería con Elevate. |

**Cuadro de cada palabra**

- **L1:** Alguien f24 · tiene f40 · antojo f52 · de f79 · galletas f89
- **L2:** Que f174 · te f181 · encuentre f188 · a f210 · ti f217
- **L3:** Tus f318 · galletas f323 · y f350 · pasteles f360 · en f389 · tu f414 · página f422
- **L4:** Y f612 · su f617 · pastel f624 · idéntico f667 · a f709 · la f716 · foto f721 · que f734 · te f745 · mande f751
- **L5:** Todo f972 · en f982 · un f1003 · mensaje f1012
- **L6:** Y f1200 · con f1205 · reseñas f1214 · que f1244 · hablan f1257 · por f1274 · ti f1283
- **L7:** Ana Gaby f1458 · Repostería f1487 · Así f1552 · se f1571 · vería f1585 · con f1606 · Elevate f1619

## Línea de tiempo

En cuadros a 60 fps. Pistas: Cámara, Celular, Pantalla (captura real de la página), 3D (piezas que salen de la pantalla), Betún, Tipo, 2D, Voz y Música.

### Hook · f0–f146 (0.00–2.45 s)

*Música: Compás 1 · golpe en f0, cucharas y motivo de glockenspiel.*

- **f0 · Música:** Golpe en f0: bombo de fieltro, cuchara y Re grave de guitarra de nylon. Fondo chocolate oscuro #2A1C18 con degradado radial hacia la tinta #1E1A1B. _SFX: golpe_suave._
- **f0–f20 · 2D:** Barra de búsqueda de cristal genérica: píldora de 880 × 136 px, centro en y 930, lupa genérica y «Buscar» en DM Sans 40 px al 45 %. Blur 32 px de lo que hay detrás, saturación 140 %, borde de 1 px y ruido 2 %. Entra con 6° de inclinación 3D y se endereza. Sin logo de ningún buscador. _SFX: cristal_aparece._
- **f0–f8 · Betún:** La manga (bolsa translúcida con betún rosa y boquilla de estrella metálica) entra por arriba a la derecha y aprieta en f0: se encoge 6 % y sale la primera gota. _SFX: manga_aprieta._
- **f0–f146 · Cámara:** Push-in lento hacia la barra (1.00 → 1.06) con deriva lateral de 6 px.
- **f6–f128 · Betún:** Escribe «galletas aguascalientes» dentro de la barra con letra de betún (EMS Allure, un solo trazo, 88 px): una letra cada 5.5 cuadros, cada una con su tecla. «Buscar» se desvanece en f6–f14. Volumen, brillo húmedo y estrías de la boquilla. _SFX: betun_cremoso, tecla ×22, espacio._
- **f24–f130 · Voz:** L1 «Alguien tiene antojo de galletas.»
- **f128–f146 · Betún:** La manga sube y sale de cuadro; desde aquí solo se ve la punta, que guía la línea. _SFX: whoosh_corto._

### Llegada · f147–f293 (2.45–4.90 s)

*Música: Compás 2 · entra la guitarra de nylon.*

- **f147 · 2D:** Enter: la barra late (1.03) y el texto de betún brilla. _SFX: enter._
- **f150–f186 · Betún:** Desde la última letra, la línea corre y dibuja el contorno del celular (597 × 1248 px, centro 540, 924). La barra se encoge y sube hasta salir (f150–f176). _SFX: trazo_contorno._
- **f160–f222 · Celular:** El celular de cristal se materializa dentro del contorno, gira de 12° a 0° en Y y se asienta con un rebote leve (f210–f222). El contorno de betún se funde con el bisel. _SFX: cristal_cuerpo, asienta._
- **f174–f227 · Voz:** L2 «Que te encuentre a ti.»
- **f188 · Pantalla:** Se enciende la pantalla y carga la portada real con su animación de entrada (foto 1.06 → 1, chip «5.0 en Google» y textos que suben), en «encuentre». _SFX: pantalla_enciende._
- **f222–f293 · Cámara:** Push-in suave a la portada: de 1.43 a 1.85 px por px de interfaz (tope 2.0× por el detalle de la foto).
- **f236–f258 · Betún:** Subraya «5.0 en Google». _SFX: subrayado._

### Catálogo · f294–f587 (4.90–9.80 s)

*Música: Compases 3–4 · entra el shaker.*

- **f296–f336 · Pantalla:** Scroll con inercia de la portada al catálogo (pestaña «Galletas»), con rebote al final. _SFX: scroll_friccion._
- **f300–f336 · Celular:** Se corre a la izquierda (centro x 338) y queda en 1.43 px; la columna derecha (x 670–1040) queda libre para el texto.
- **f318–f454 · Voz:** L3 «Tus galletas y pasteles, en tu página.»
- **f336–f366 · Betún:** Decora el borde de la tarjeta «Frasco de galletas de corazón» con conchitas de betún. _SFX: betun_borde._
- **f352–f440 · 3D:** «Frasco de galletas de corazón» sale de la pantalla al espacio 3D con su foto (giro 8°, profundidad), flota con sombra de contacto y parallax (foto ≤ 360 px de ancho) y regresa a su lugar en f420–f440. _SFX: tarjeta_sale, tarjeta_regresa._
- **f372–f402 · Betún:** Decora el borde de la tarjeta «Caja de galletas de chocolate» con conchitas de betún. _SFX: betun_borde._
- **f388–f476 · 3D:** «Caja de galletas de chocolate» sale de la pantalla al espacio 3D con su foto (giro 8°, profundidad), flota con sombra de contacto y parallax (foto ≤ 360 px de ancho) y regresa a su lugar en f456–f476. _SFX: tarjeta_sale, tarjeta_regresa._
- **f408–f438 · Betún:** Decora el borde de la tarjeta «Galletas de chispas de chocolate» con conchitas de betún. _SFX: betun_borde._
- **f424–f512 · 3D:** «Galletas de chispas de chocolate» sale de la pantalla al espacio 3D con su foto (giro 8°, profundidad), flota con sombra de contacto y parallax (foto ≤ 360 px de ancho) y regresa a su lugar en f492–f512. _SFX: tarjeta_sale, tarjeta_regresa._
- **f478–f566 · Tipo:** «RECIÉN» f478 · «HORNEADAS» f514. Columna derecha · x 680–1040 · y 830 y 910, 62 px. Aterriza en el pulso (tiempos 13 y 14): no está en la voz, entra cuando termina la L3.
- **f530–f575 · Pantalla:** Tap en «Pasteles»: la pastilla rosa se desliza y la cuadrícula se reacomoda con resorte. _SFX: tap, pestana_desliza, cuadricula._

### A tu medida · f588–f953 (9.80–15.90 s)

*Música: Compases 5–7½ · lift en f588: bajo cálido y glockenspiel una octava arriba.*

- **f590–f677 · Pantalla:** Tap en la pestaña «A tu medida» (el acceso a la mano de «Cotiza tu pastel»): cambia el panel y la acuarela pinta «de tu pastel». _SFX: tap, panel_cambia._
- **f610–f676 · Pantalla:** Tap en «Sube la foto de tu pastel»: entra la vista previa del pastel de referencia con su barra de carga real (1.1 s) y «Foto lista ✓» en f676. _SFX: tap, subir_foto, foto_lista._
- **f612–f775 · Voz:** L4 «Y su pastel, idéntico a la foto que te mande.»
- **f640–f676 · Celular:** Baja a 60 % del alto y se corre a la izquierda (x 20–572). La columna derecha (x 600–1040) es para la foto, el pastel y el texto.
- **f650–f690 · 3D:** La miniatura sale del celular y se acomoda arriba a la derecha (foto 4:5 de 320 × 400 px, x 660–980, y 300–700), con grosor y sombra. Mientras está fuera, su lugar en la pantalla queda rosa palo. _SFX: foto_sale._
- **f667–f721 · Betún:** Traza el contorno del pastel sobre la foto (silueta de dos pisos y cerezas), de «idéntico» a «foto». _SFX: betun_trazo._
- **f700–f770 · Tipo:** «MÁNDANOS» f700 · «LA» f716 · «FOTO.» f721. Abajo a la derecha · x 610–1040 · y 1340 y 1420, 60 px. Aterriza en «la foto» (L4).
- **f724–f814 · 3D:** Debajo de la foto (x 600–1040, y 740–1240) se construye el mismo pastel en 3D, idéntico, piso por piso: tabla f724; piso 1 cae y se asienta f728–f744; conchas y guirnaldas se pipean f744–f766; perlas f762–f770; piso 2 f768–f782; conchas y perlas f782–f794; cinco cerezas caen una por una f794–f814. _SFX: tabla, piso_asienta ×2, pipeo ×3, cereza ×5._
- **f776–f844 · Tipo:** «TE» f776 · «LO» f782 · «HACEMOS» f792 · «IGUAL.» f814. Abajo a la derecha · x 610–1040 · y 1300–1520, 56 px. Aterriza en la última cereza del pastel 3D (f814).
- **f814–f840 · 3D:** Foto y pastel juntos, idénticos, 0.4 s.
- **f840–f866 · 3D:** La foto regresa a su lugar en la pantalla y el pastel se encoge hacia ella. El celular vuelve a 65 % (centro x 338) y hace scroll suave hasta «¿Para cuándo?». _SFX: whoosh_corto, scroll_friccion._
- **f866–f888 · Pantalla:** Tap en «¿Para cuándo?»: sube la hoja del calendario. _SFX: tap, hoja_sube._
- **f892–f930 · Pantalla:** Tap en el sábado 14 (f892), en «Mañana» (f902) y en «Listo» (f912); la hoja baja. _SFX: tap ×3, hoja_baja._
- **f924–f942 · Pantalla:** Tap en «¿Qué dice tu pastel?»: sube un teclado genérico con barra de sugerencias (dibujado en código, no copia ningún sistema). _SFX: tap, teclado_sube._
- **f930–f980 · Tipo:** «TU» f930 · «PEDIDO» f936. Columna derecha · x 680–1040 · y 870, 62 px. Aterriza en el tap en «¿Qué dice tu pastel?» (no está en la voz).
- **f940–f966 · Pantalla:** Escribe «Feliz cumpleaños»: F y e, sugerencia «Feliz» (f940, f945, f950); c y u, sugerencia «cumpleaños» (f956, f961, f966). _SFX: tecla ×4, sugerencia ×2._

### Pedido · f954–f1151 (15.90–19.20 s)

*Música: Compases 7½–9 · palmas suaves.*

- **f970–f994 · Pantalla:** Baja el teclado y hace scroll con inercia hasta «Enviar por WhatsApp». _SFX: teclado_baja, scroll_friccion._
- **f972–f1042 · Voz:** L5 «Todo en un mensaje.»
- **f982–f1090 · Tipo:** «EN» f982 · «UN» f1003 · «MENSAJE» f1012. Columna derecha · x 680–1040 · y 830 y 910, 62 px. Aterriza en «en un mensaje» (L5).
- **f998–f1018 · 3D:** Tap en «Enviar por WhatsApp»: el botón se levanta en 3D con pop (sale con su grosor y sombra) y regresa con su estado presionado real. _SFX: tap, boton_pop._
- **f1012–f1034 · Pantalla:** Sube la hoja «Tu pedido, en un mensaje» con el mensaje armado, en «mensaje». _SFX: hoja_sube, mensaje._
- **f1040–f1110 · Cámara:** Push-in a la burbuja hasta que se lee (2.3 px por px de interfaz). El betún subraya «te mando la foto en este chat.» (f1056–f1080). _SFX: subrayado._
- **f1112–f1160 · Pantalla:** Tap en «Cerrar»: baja la hoja (f1112–f1134) y hace scroll a las reseñas (f1134–f1160). _SFX: tap, hoja_baja, scroll_friccion._

### Confianza y visítanos · f1152–f1343 (19.20–22.40 s)

*Música: Compases 9–10 · todas las capas.*

- **f1180–f1222 · 3D:** Swipe por las reseñas 1, 2 y 3 (f1180 y f1196): cada tarjeta sale al espacio 3D al pasar y quedan en abanico (−8°, 0°, +8°) delante del celular, legibles. Es la misma tarjeta blanca de la página, ahora con canto de cristal y sombra. _SFX: swipe ×2, tarjeta_sale ×3._
- **f1200–f1298 · Voz:** L6 «Y con reseñas que hablan por ti.»
- **f1226–f1280 · Cámara:** Push-in a la reseña 1 del abanico; el betún subraya «como la imagen que solicites» (f1240–f1270). _SFX: subrayado._
- **f1257–f1302 · Tipo:** «HABLAN» f1257 · «POR TI» f1274. Columna derecha · x 680–1040 · y 860 y 940, 62 px. Aterriza en «hablan por ti» (L6).
- **f1282–f1298 · 3D:** Las tres tarjetas regresan al carrusel. _SFX: tarjeta_regresa._
- **f1298–f1314 · Pantalla:** Scroll rápido a «Visítanos». _SFX: scroll_friccion._
- **f1312–f1330 · Pantalla:** Cae el pin en Paseo Sierra Hermosa 111 (animación de la página) con su etiqueta. _SFX: pin._
- **f1320–f1340 · Betún:** Subraya «Martes a sábado». _SFX: subrayado._

### Cierre · f1344–f1439 (22.40–24.00 s)

*Música: Se adelgaza; respiro en f1378 (22.96 s).*

- **f1344–f1374 · Celular:** El celular se aleja hacia la izquierda (escala 45 %, centro x 250, giro 14°); todavía se leen el mapa y «Martes a sábado». _SFX: whoosh_largo._
- **f1350–f1396 · Betún:** Escribe «Lo que ya se antoja» con letra de betún (84 px, x 420–1030, y 860). _SFX: betun_escribe._
- **f1378 · Música:** Respiro: se van todas las capas; queda una nota de glockenspiel.
- **f1398–f1434 · Betún:** Escribe «también se busca.» (y 980), en el silencio. _SFX: betun_escribe._

### End card · f1440–f1679 (24.00–28.00 s)

*Música: Golpe grave en f1440 y cadencia final.*

- **f1440 · Música:** Golpe grave: bombo, Re grave y sub. El celular sale por la izquierda y la frase sube y se desvanece. _SFX: golpe_grave, whoosh_corto._
- **f1443–f1533 · Betún:** La manga vuelve y escribe «Ana Gaby Repostería» en Cormorant Garamond Itálica (el trazo sigue el esqueleto de cada letra), 112 px, centrada en y 560. _SFX: manga_aprieta, betun_escribe._
- **f1458–f1651 · Voz:** L7 «Ana Gaby Repostería. Así se vería con Elevate.»
- **f1520–f1556 · 2D:** Debajo aparece el letrero AG sobre una placa de cristal clara (círculo de 400 px con el letrero a 340 px, debajo de su tope de 450) con un barrido de luz. _SFX: cristal_placa._
- **f1530 · 2D:** Línea legal: «Demo de cortesía de Elevate Negocios · pieza no oficial» (DM Sans 26 px al 70 %, y 1520).
- **f1552–f1679 · Tipo:** «Así se vería tu página» f1552 · «Elevate Negocios» f1619. End card · centrado · y 1170, 40 px. Aterriza en «Así se vería» y «Elevate» (L7).
- **f1640–f1679 · Música:** Acorde final y campanita de glockenspiel; se sostiene hasta f1679. _SFX: campanita_final._

## Kinetic type

Por glifo: cada letra sube 24 px desde blur 6 px y opacidad 0, con escalonado de 28 ms y resorte suave; sale hacia arriba en 0.26 s. Cada palabra queda asentada en su cuadro. Máximo 4 palabras en pantalla; nunca encima de la interfaz.

| # | Texto | Entra / aterriza | Sale | Dónde | Tamaño |
|---|---|---|---|---|---|
| K1 | RECIÉN / HORNEADAS | RECIÉN f478 · HORNEADAS f514 | f566 | Columna derecha · x 680–1040 · y 830 y 910 | 62 px |
| K2 | MÁNDANOS / LA FOTO. | MÁNDANOS f700 · LA f716 · FOTO. f721 | f770 | Abajo a la derecha · x 610–1040 · y 1340 y 1420 | 60 px |
| K3 | TE LO / HACEMOS / IGUAL. | TE f776 · LO f782 · HACEMOS f792 · IGUAL. f814 | f844 | Abajo a la derecha · x 610–1040 · y 1300–1520 | 56 px |
| K4 | TU PEDIDO | TU f930 · PEDIDO f936 | f980 | Columna derecha · x 680–1040 · y 870 | 62 px |
| K5 | EN UN / MENSAJE | EN f982 · UN f1003 · MENSAJE f1012 | f1090 | Columna derecha · x 680–1040 · y 830 y 910 | 62 px |
| K6 | HABLAN / POR TI | HABLAN f1257 · POR TI f1274 | f1302 | Columna derecha · x 680–1040 · y 860 y 940 | 62 px |
| K7 | Así se vería tu página · Elevate Negocios | Así se vería tu página f1552 · Elevate Negocios f1619 | fin | End card · centrado · y 1170 | 40 px (DM Sans 600) |

## Música

Original en código, 98 BPM, Re mayor: guitarra de nylon y glockenspiel (soundfont FluidR3 GM, licencia MIT) con percusión de cucharas; una capa nueva por sección. Debajo de cada palabra de la voz la música va al menos 12 dB más baja.

| Cuadro | Compás | Acorde | Capas |
|---|---|---|---|
| f0 · 0.00 s | 1 | Dmaj9 | Golpe suave, cucharas y motivo de glockenspiel (3 notas) |
| f147 · 2.45 s | 2 | Bm11 | + guitarra de nylon en arpegio |
| f294 · 4.90 s | 3 | Gmaj7 | + shaker en semicorcheas |
| f441 · 7.35 s | 4 | A13sus4 → A | Todo lo anterior |
| f588 · 9.80 s | 5 | Dmaj9 | Lift: + bajo cálido; glockenspiel una octava arriba |
| f735 · 12.25 s | 6 | Bm11 | Igual |
| f882 · 14.70 s | 7 | Gmaj7 | Igual |
| f954 · 15.90 s | 7.5 | Gmaj7 | + palmas suaves en 2 y 4 |
| f1029 · 17.15 s | 8 | A13sus4 → A | Igual |
| f1176 · 19.60 s | 9 | Dmaj9 | Todas las capas |
| f1322 · 22.03 s | 10 | Bm11 | Se adelgaza desde f1344 |
| f1378 · 22.97 s | 10.5 | — | Respiro: se van todas las capas; queda una nota de glockenspiel |
| f1440 · 24.00 s | end | Gmaj7 → A7sus4 → Dmaj9 | Golpe grave y cadencia final con guitarra y glockenspiel |

## Sonido

110 cues, uno por cada movimiento visible, sintetizados en código (no hay biblioteca de SFX en assets/). Mezcla: voz alrededor de −16 LUFS, música al menos 12 dB debajo de cada palabra, master −14 LUFS / −1.25 dBTP.

Biblioteca: golpe_suave ×1 · manga_aprieta ×2 · cristal_aparece ×1 · betun_cremoso ×1 · tecla ×26 · espacio ×1 · whoosh_corto ×3 · enter ×1 · trazo_contorno ×1 · cristal_cuerpo ×1 · pantalla_enciende ×1 · asienta ×1 · subrayado ×4 · scroll_friccion ×5 · betun_borde ×3 · tarjeta_sale ×6 · tarjeta_regresa ×4 · tap ×10 · pestana_desliza ×1 · cuadricula ×1 · panel_cambia ×1 · subir_foto ×1 · foto_sale ×1 · betun_trazo ×1 · foto_lista ×1 · tabla ×1 · piso_asienta ×2 · pipeo ×3 · cereza ×5 · hoja_sube ×2 · hoja_baja ×2 · teclado_sube ×1 · sugerencia ×2 · teclado_baja ×1 · boton_pop ×1 · mensaje ×1 · swipe ×2 · pin ×1 · whoosh_largo ×1 · betun_escribe ×3 · golpe_grave ×1 · cristal_placa ×1 · campanita_final ×1.

## Re-layout 1:1 (1080 × 1080)

- Misma línea de tiempo, voz, música y cues; cambia la composición.
- Celular al 86 % del alto (929 px), a la izquierda (x 60–490) cuando hay texto; el kinetic type va en la columna derecha (x 530–1020) a 52 px.
- Hook: barra de 820 × 124 px centrada. A tu medida: foto arriba a la derecha (240 × 300 px), pastel 3D abajo a la derecha y el texto en la franja de abajo (y 900–1040), con el celular corrido a la izquierda.
- End card: nombre en y 300, placa de 300 px en y 380–680, «Así se vería tu página · Elevate Negocios» en y 760 y línea legal en y 1000.

## Siguiente

- Fase 3: cortar la toma, recortar la respiración y la pausa de la L7, procesar la voz (−16 LUFS) y entregar un preview con la voz en su lugar sobre un pulso de 98 BPM.
- Fase 4: prueba de estilo de 3 a 5 s (celular 3D con la portada real y una tarjeta saliendo al espacio 3D).
