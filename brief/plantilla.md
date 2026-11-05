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

{{voz}}

## Línea de tiempo

En cuadros a 60 fps. Las pistas son Cámara, Celular, Pantalla (captura real de la página), 3D (piezas que salen de la pantalla), Tallo, Tipo, 2D, Voz y Música.

{{secciones}}

## Kinetic type

Playfair Display SemiBold, en mayúsculas y crema #F5F1E6. Cada glifo sale de una máscara con 2 cuadros de separación (33 ms), con desenfoque de 8 → 0 px y curva ease-out, y tarda 14 cuadros en aterrizar: el primer glifo aterriza justo en su palabra. Sale subiendo en 16 cuadros.

{{tipo}}

## Música

Original, compuesta en código, a 100 BPM en Fa mayor. El piano y el pizzicato se tocan con un banco de sonidos de licencia abierta; el shaker, el bajo, los golpes y el riser se sintetizan. Baja al menos 12 dB bajo cada palabra (sidechain desde la voz).

{{musica}}

## SFX

Todos sintetizados en código, uno por cada movimiento visible.

{{sfx}}

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

{{checks}}
