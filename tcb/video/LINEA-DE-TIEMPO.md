# Video promo TCB · línea de tiempo

36.0 s · 30 fps · 1080 cuadros · 1080×1920 (vertical) y 1920×1080 (horizontal) · sin audio.

Es un video para el dueño: le enseña cómo se vería su página y qué gana con ella.

| # | Escena | Archivo | Entra | Sale | Dura | Qué se ve |
|---|---|---|---|---|---|---|
| 1 | El nombre | `escenas/01-nombre.js` | 0.0 s | 6.0 s | 6.0 s | Bandas de tablero. THE / CHEESE / BURGER se construye letra por letra, el queso escurre de CHEESE, el lema se escribe con gis. |
| 2 | Tu menú | `escenas/02-platillos.js` | 6.0 s | 14.2 s | 8.2 s | Piso de tablero en perspectiva. Tres tarjetas de vidrio entran desde el fondo con fotos y precios. Un toque en "Agregar" y sube la barra "Enviar por WhatsApp". |
| 3 | Queso y salsa | `escenas/03-liquido.js` | 12.8 s | 20.2 s | 7.4 s | El queso cae y tapa las tarjetas: "Cada pedido por app paga comisión". La salsa nace de la palabra COMISIÓN y lo cubre todo: "Aquí llega directo a tu WhatsApp". |
| 4 | Burger isométrica | `escenas/04-burger.js` | 19.0 s | 28.5 s | 9.5 s | La burger se arma capa por capa. Cada capa enciende una cosa que lleva la página. Al final sube y se achica para el cierre. |
| 5 | Cierre | `escenas/05-cierre.js` | 28.5 s | 36.0 s | 7.5 s | "Que te pidan directo. En tu propia página." Etiqueta con la oferta, logo y nota de demo. Los últimos 2 s son cuadro fijo. |

Las escenas 3 y 4 se enciman a propósito: la 3 tiene fondo transparente y funciona como transición (el queso tapa la 2, la salsa al encogerse destapa la 4).

## Easing por escena

| Escena | Entrada | Movimiento principal | Salida |
|---|---|---|---|
| 1 | letras `back.out(1.5)`, escalonadas 0.05 s | queso `power2.out` en 2.6 s | letras caen `power2.in` en orden aleatorio |
| 2 | tarjetas `expo.out` desde z lejano, 0.42 s entre cada una | flotado `sine.inOut`; toque `back.out(3)`; barra `back.out(1.4)` | la tapa el queso de la escena 3 |
| 3 | queso `power2.inOut` en 1.75 s | salsa `back.out(1.6)` al nacer y `expo.inOut` al crecer | salsa se encoge `power3.inOut` hacia la burger |
| 4 | piso `back.out(2)` desde el centro | cada capa cae `power2.in` en 0.5 s, con golpe de 0.07 s en la de abajo; una capa cada 0.88 s | viaje al cierre `power3.inOut` |
| 5 | letras `back.out(1.5)` | etiqueta `back.out(2)` con giro | cuadro fijo |

## Dónde poner tu audio

El video no trae pista. Puntos buenos para acentos o cortes de la música:

| Tiempo | Momento |
|---|---|
| 0.3 s | entra la primera letra |
| 6.0 s | cambio a las tarjetas |
| 10.5 s | toque en "Agregar" |
| 12.8 s | empieza a caer el queso |
| 16.3 s | la salsa empieza a cubrir la pantalla |
| 21.5 s a 25.9 s | cae una capa cada 0.88 s (seis golpes) |
| 30.8 s | entra la etiqueta de la oferta |
| 34.0 s a 36.0 s | cuadro fijo: buen lugar para el fade de salida |

## Cómo se exporta

`node video/render.mjs vh` abre `video/index.html?captura=1` en Chromium, llama a `window.__seek(t)` para cada cuadro, toma la captura y la manda a `ffmpeg` (H.264, CRF 17, yuv420p). Es determinista: el mismo segundo siempre da el mismo cuadro, porque nada depende del reloj ni de animaciones CSS.

Opciones: `node video/render.mjs v --desde 12 --hasta 21 --salida prueba.mp4` exporta solo un tramo.

Para cambiar textos, fotos o apagar la oferta: `video/config.js`. Los nombres, precios, lema y oferta vienen de `../data.js`.
