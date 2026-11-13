# Pro Detailing Car Care · "El reflejo" · brief con tiempos

Pieza spec privada de Elevate Negocios. 9:16 (1080×1920) + re-layout 1:1 (1080×1080). 60 fps, 120 BPM: 1 beat = 30 cuadros, 1 compás = 120 cuadros. 16 s (cuadros 0–959) + end card de 2 s (960–1079). Total 1080 cuadros.

Los cuadros de las palabras son provisionales: se ajustan a la toma de voz en la fase 3 (±6 cuadros como máximo; si una palabra cae más lejos, se mueve la frase, no la animación).

## Sistema
- Una función `frame(t)` determinista; 8 subcuadros por cuadro (obturador de 180°) para el motion blur.
- Una sola cámara (posición, zoom, inclinación) y un solo campo SDF compartidos por todas las secciones. Los cambios de forma interpolan distancias, no opacidad.
- Lienzo: plano negro de espejo. Los puntos de luz son una rejilla de luminarias "en el techo" reflejada en el plano; su posición en pantalla depende de la cámara (paralaje real).
- Línea roja: núcleo blanco de 3 px, halo rojo anisotrópico (largo en su eje, corto en el perpendicular) y un reflejo especular que la sigue sobre el lienzo.
- Cristal: desenfoque real del fondo (28–40 px), saturación 140 %, borde 1 px blanco al 14 %, ruido 2 %, bisel y refracción en los cantos.
- Texto: Barlow Condensed (títulos, mayúsculas) + Inter (texto). Blanco #F4F4F4 sobre negro. El rojo #E1251B da 4.2:1 contra el negro, así que nunca lleva texto: solo línea, subrayados, anillo y detalles.
- Zona segura 9:16: y entre 250 y 1580.

## Línea de tiempo

| Cuadros | Tiempo | Qué pasa | Texto en pantalla | Voz |
|---|---|---|---|---|
| 0 | 0.00 | Negro. Un punto blanco al centro; en el mismo cuadro la línea roja cruza de izquierda a derecha con destello de 3 cuadros. | — | — |
| 0–29 | 0.00–0.50 | El destello decae; la línea queda horizontal a media altura, vibrando 2 px. | — | — |
| 30–119 | 0.50–2.00 | La línea baja barriendo el lienzo; arriba de ella aparecen las filas de puntos reflejados, una fila cada 8 cuadros. Cámara: empuje lento hacia adelante. | DETALLADO (cuadro 60) · BOUTIQUE (cuadro 90), por glifo, 25 ms de escalonado | L1 entra en 0.50 |
| 120–149 | 2.00–2.50 | El brillo del lienzo se contrae por SDF hasta el rectángulo redondeado de un celular de cristal. Las dos palabras suben y pasan a ser el encabezado de la página. | — | fin de L1 |
| 150–239 | 2.50–4.00 | Hero de la página: la línea roja recorre el ancho y descubre el logo (tamaño chico, 220 px). Título por glifo. | ALTO NIVEL (cuadro 150, cae en "alto nivel" de L1) | — |
| 240–299 | 4.00–5.00 | La cámara baja por la página. Cinco puntos de luz se salen de su fila, se alinean y cada uno se abre en estrella (uno cada 6 cuadros desde 240). | — | L2 en 4.00 |
| 300–359 | 5.00–6.00 | Contador hasta 5.0 (termina en 312). Chip de cristal. Entra la tarjeta de reseña 1 desde abajo. | 5.0 · "más de 160 reseñas en Google" · «¡El mejor servicio de detailing!» | — |
| 360–479 | 6.00–8.00 | Cámara inclina a isométrico 30°. Cuatro tarjetas de cristal se levantan en 360, 368, 375 y 383 (cascada de 125 ms). La de PPF lleva la textura del asset 03. Sombras de contacto que crecen. | PPF · POLARIZADO NANO CERÁMICO · NANO CERÁMICO · CORRECCIÓN DE PINTURA | L3 en 6.20 |
| 480–599 | 8.00–10.00 | La cámara vuelve a frente. Dos tarjetas de reseña se deslizan a distinta profundidad. En 540 la línea roja subraya el fragmento 3 (12 cuadros). | «me dejaron mi auto mejor que en la entrega» · «la atención es muy cálida» | — (respira) |
| 600–719 | 10.00–12.00 | Galería: panel de cristal con el asset 02 a tamaño medio, bordes difuminados y grano. Reflejos del techo cruzan el cristal con la cámara. | TU PÁGINA (cuadro ~690, cae en "página") | L4 en 10.20 |
| 720–839 | 12.00–14.00 | Botón de cristal. La línea roja llega en 720 y se queda como subrayado; el anillo pulsa en 780 y 810 (con el kick). | AGENDA TU CITA | L5 en 12.20 |
| 840–929 | 14.00–15.50 | Retroceso de cámara: la página queda como silueta de celular. Los puntos de luz se apagan fila por fila hasta quedar uno. | — | L6 en 14.20 |
| 930–959 | 15.50–16.00 | El punto se abre en el logo (420 px, enmascarado). Último barrido de la línea roja. Respiro de música. | (logo) | — |
| 960–1079 | 16.00–18.00 | End card. Golpe grave en 960. Líneas entran en 960, 978, 996 y 1008. | ver abajo | L7 en 16.30 |

## End card
Fondo negro, texto blanco, una raya roja corta.
1. "Precios accesibles desde $1,000 pesos por tu página" (grande, en tres renglones, "$1,000" como elemento dominante)
2. "Paquete de 3 videos promocionales: $1,500"
3. "Elevate Negocios · Aguascalientes"
4. "Demo de cortesía de Elevate Negocios · pieza no oficial"

## Voz (provisional hasta tener la toma)
| # | Entra | Frase | Dura máx. |
|---|---|---|---|
| L1 | 0.50 | Detallado boutique, de alto nivel. | 3.2 s |
| L2 | 4.00 | Cinco estrellas en Google. | 1.9 s |
| L3 | 6.20 | PPF, polarizado y nano cerámico. | 3.4 s |
| L4 | 10.20 | Imagina todo esto en tu propia página. | 1.8 s |
| L5 | 12.20 | Agenda tu cita por WhatsApp. | 1.8 s |
| L6 | 14.20 | Pro Detailing Car Care. | 1.6 s |
| L7 | 16.30 | Tu página, desde mil pesos. | 1.6 s |

## Música y sonido
- 120 BPM, La menor. Capas: 0–2 kick + sub; 2–4 pulso y arpegio; 4–8 hi-hat; 8–12 pad de cristal; 12–14 lift con riser; 14–15.5 se vacía; 15.5–16 respiro; 16.00 golpe grave; 16.3–18 atmósfera.
- Música con ducking: al menos 12 dB por debajo de la voz en cada palabra.
- SFX: más de 70 cues, uno por movimiento visible, colocados por número de cuadro desde la misma tabla que usa la animación. Lista completa en la fase 4.
- Master −14 LUFS / −1.25 dBTP. Voz −16 LUFS.

## Re-layout 1:1
Misma línea de tiempo y mismos hechos por cuadro. El celular se inclina y ocupa la mitad derecha; el texto cinético y las tarjetas viven en la mitad izquierda. Las cuatro tarjetas de servicios pasan de columna a rejilla 2×2. End card en dos columnas.

## Lo que no aparece
Teléfono, precios del negocio, horario, dirección, garantías, cifras técnicas, XPEL, personas, placas, insignias, póster, marcas de herramientas, flyers marcados como IA.
