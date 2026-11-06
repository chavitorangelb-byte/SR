# Brief de producción · Jumpers Fest Ags · Fase 2

Video vertical que le enseña al dueño cómo se vería su página. Un solo plano continuo, sin cortes, guiado por el tubo de aire: todo lo que aparece se infla. La interfaz manda; los gráficos la sirven.

## Cambios al brief original (por aprobar)

{{cambios}}

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

{{voz}}

## Línea de tiempo

En cuadros a 60 fps. Pistas: Cámara, Celular, Pantalla (captura real de la página), 3D (piezas que salen de la pantalla), Tubo, Tipo, 2D, End card, Voz y Música.

{{secciones}}

## Kinetic type

Fredoka SemiBold en mayúsculas, tinta #1B1B1B. Cada glifo entra cada 1.5 cuadros (25 ms) desde una máscara, subiendo 40 px con desenfoque de 6 → 0 px, y al aterrizar se infla (escala 0.7 → 1 con 8 % de sobrepaso); tarda 14 cuadros, y el primer glifo aterriza justo en su palabra de la voz. Sale desinflándose en 16 cuadros. Nunca encima de la interfaz.

{{tipo}}

## Música

Original, hecha en código a 112 BPM en Do mayor: ukulele y pizzicato con cuerda pulsada sintetizada (Karplus-Strong), glockenspiel por síntesis aditiva, palmas y golpes con ruido filtrado, y bajo redondo de onda senoidal con saturación suave. Queda al menos 12 dB bajo cada palabra (sidechain desde la voz). Voz a −16 LUFS; master a −14 LUFS y −1.25 dBTP.

{{musica}}

## Re-layout 1:1 (1080 × 1080)

- El celular sube al 86 % del alto (929 px; ≈ 0.99 px de video por px CSS) para que la interfaz se lea igual que en 9:16; las fotos quedan por debajo de su detalle real.
- El kinetic type va al lado del celular, con 520 px libres; mismas palabras y mismos cuadros.
- Barra de búsqueda de 900 px; arcoíris de y 120 a 620; placa con logo de y 560 a 800; texto en y 860 y línea legal en y 960. Márgenes de 60 px.

## SFX

{{sfx}}

## Verificaciones

{{checks}}
