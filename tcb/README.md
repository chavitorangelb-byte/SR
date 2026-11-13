# The Cheese Burger (TCB) · demo de página y video promo

Propuesta no oficial para enseñarle al dueño de The Cheese Burger (Cumbres 2º Sector, Monterrey) cómo se vería su propia página de pedidos. Hoy vende por apps y no tiene una página que funcione; este demo le muestra el menú completo, un carrito que arma el pedido y lo manda por WhatsApp, y un video de 36 segundos para acompañar la presentación.

Este proyecto es independiente del de Florería Roma que vive en la raíz del repositorio. Todo lo de TCB está dentro de `tcb/`.

## Cómo correrlo

No necesita instalación ni build. Es HTML, CSS y JavaScript sin backend.

```bash
cd tcb
python3 -m http.server 8080        # o cualquier servidor estático
# abrir http://localhost:8080/           la página
# abrir http://localhost:8080/video/     el video reproducible (9:16; con ?f=h en 16:9)
```

También abre con doble clic en `index.html`, pero con servidor local se comporta igual que publicado.

Herramientas (requieren Node 22 y Playwright; `ffmpeg` para el video):

```bash
node tools/test_web.mjs            # 45 pruebas: carrito, teclado, WhatsApp, banderas, movimiento reducido, sin JS, peso
node tools/contraste.mjs           # contraste WCAG de los 20 pares de color
node tools/shots.mjs               # capturas en 1440, 768, 390 y 360 px (carpeta review/)
node tools/cuadros.mjs v           # hoja de cuadros clave del video (v o h)
node video/render.mjs vh           # exporta los dos MP4 a video/salida/
python3 tools/crop_assets.py       # vuelve a recortar logo y fotos (necesita las capturas en assets/_capturas, no versionadas)
```

## Estructura

```
tcb/
  index.html            la página
  data.js               TODOS los datos editables y las banderas
  css/styles.css        estilos (arriba está el contrato de diseño)
  js/app.js             menú, carrito, WhatsApp, horario y animaciones
  js/liquid.js          queso y salsa: formas líquidas (compartido con el video)
  js/burger.js          burger isométrica en SVG (compartida con el video)
  js/vendor/            GSAP 3 y ScrollTrigger, copiados en local (sin CDN)
  assets/logo.png       logo recortado de su perfil de Instagram
  assets/fotos/         8 fotos recortadas de sus publicaciones (640 y 1080 px, WebP)
  assets/fonts/         Archivo (variable) y Caveat Brush, licencia OFL
  assets/tex/           textura de tinta gastada, generada por código
  video/                video promo en código (ver video/LINEA-DE-TIEMPO.md)
  video/salida/         tcb-promo-vertical.mp4 y tcb-promo-horizontal.mp4
  tools/                pruebas, capturas, contraste y recorte de fotos
  review/               resultados de pruebas y capturas de revisión
```

## Banderas (en `data.js`)

| Bandera | Qué hace |
|---|---|
| `SHOW_OFFER` | `false` oculta la sección "Tu página, desde $1,000 MXN". Úsalo si el demo lo va a ver el cliente final del restaurante. |
| `SHOW_DEMO_BADGE` | `false` quita la nota "Demo de diseño" de la barra y del pie. |
| `DEMO_MODE` | `true`: al enviar el pedido se muestra el mensaje antes de abrir WhatsApp, para que nadie le mande un pedido de prueba al local sin querer. `false`: abre WhatsApp directo, como en la página real. |
| `SHOW_PENDIENTES` | `true` muestra la etiqueta "por confirmar" junto a cada dato sin verificar. |

El video tiene sus propias banderas en `video/config.js` (`SHOW_OFFER`, `SHOW_DEMO_NOTE`, `contacto`).

## Datos por confirmar con el dueño

Nada de esto está inventado: sale de sus redes y de Google Maps. Pero no está verificado con él, por eso está marcado en `data.js` con `confirmar: true`.

| Dato | Valor en el demo | Dónde se cambia |
|---|---|---|
| Teléfono | +52 81 8161 8030 | `negocio.telefono` |
| WhatsApp de pedidos | el mismo número. **Falta confirmar que ese número tenga WhatsApp.** | `negocio.whatsappPedidos` |
| Dirección exacta | vacía. La página dice "Dirección exacta por confirmar con el local". | `negocio.direccion.valor` |
| Enlace de Google Maps | búsqueda por nombre, no el enlace exacto del local | `negocio.mapsUrl` |
| Horario | L a J 2:00 a 10:00 PM, V a D 2:00 a 11:00 PM | `negocio.horario` |
| Calificación de Google | 4.6 con 156 reseñas. Revisar el día de la presentación. | `google` |
| Página de Facebook | enlace de búsqueda, falta la URL exacta | `negocio.facebook.url` |
| Precios | historia de Instagram del 18 de enero de 2024. **Tienen casi tres años.** | `menu.categorias` |
| Entrega a domicilio | no se ofrece en el demo; solo "Paso a recoger" y "Para comer ahí" | `negocio.tiposDePedido` |
| Tu número para "Quiero mi página" | `52XXXXXXXXXX`. Mientras tenga X el botón queda desactivado. | `oferta.whatsapp` |

Las bebidas y los aderezos llevan el detalle que se lee en su menú publicado (por ejemplo, Coca-Cola $25, Dr Pepper $35, Jalapeño Dip $20), que es más preciso que el rango "$25 a $35".

## Defaults y decisiones tomadas

Confirmadas contigo antes de construir:

- **Fotos y logo**: recortados de las capturas que mandaste. Quedaron fuera la foto de boneless con cervezas (marca ajena en primer plano), una foto con botella de Indio que no se pudo recortar limpia, las fotos de las reseñas (son de los clientes) y los menús. Son provisionales: hay que reemplazarlas por los originales del dueño. Como `assets/logo.png` sí existe, no se usa el wordmark de respaldo; si el archivo falla, aparece "TCB" en texto.
- **Reseñas**: tres citas textuales, con nombre de pila solo donde lo tenía (Leticia y Dani). Marcadas "reseña de Google".
- **Video**: es para el dueño, no para sus clientes. No lleva dominio ni URL.
- **Mapa**: tablero estilizado con un pin y botón a Google Maps. No hay calles dibujadas ni dirección inventada.
- **Carpeta aparte**: nada de Florería Roma se tocó.

Decididas por mí (dime si alguna no te convence):

- La foto de cada tarjeta del video se asignó por parecido con la descripción del menú (queso panela a la plancha con 3x Cheese's; pollo bañado en salsa con Spicy Chicken Sandwich). En la página las fotos van en una tira aparte, sin nombre de platillo, justo para no afirmar qué platillo es cada una.
- La descripción del Mac and Cheese dice "galletas saladas" en lugar de la marca que aparece en su menú.
- El estado "Abierto ahora" se calcula con el horario de Maps en hora de Monterrey.
- El texto "la app le cobra una comisión al restaurante por cada pedido" no lleva porcentajes, porque no tengo el dato de sus contratos.

## Qué falta

- Confirmar con el dueño los datos de la tabla y actualizar precios.
- Sus fotos originales (las actuales vienen de capturas de pantalla, a 1080 px de ancho como máximo).
- Tu número de WhatsApp en `oferta.whatsapp`.
- Permiso del dueño antes de publicar esto en un dominio público. La página lleva `noindex` mientras tanto.
- Música del video: se entrega sin audio (ver abajo cómo agregarla).

## Video promocional

- 36 segundos, 30 fps, renderizado cuadro por cuadro desde el navegador. Sin IA generativa y sin stock.
- `video/salida/tcb-promo-vertical.mp4` (1080×1920) y `video/salida/tcb-promo-horizontal.mp4` (1920×1080).
- Cada escena es un módulo en `video/escenas/` con su duración, easing y notas en el encabezado. La línea de tiempo completa está en `video/LINEA-DE-TIEMPO.md`.
- Para verlo sin exportar: abrir `video/index.html` con servidor local. Tiene reproducir, pausa y barra de tiempo.

Agregar tu música (el video no trae pista de audio):

```bash
ffmpeg -i video/salida/tcb-promo-vertical.mp4 -i tu-musica.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -af "afade=t=out:st=34:d=2" salida-con-musica.mp4
```

## Quality gate

Verificado en esta entrega (resultados en `review/resultados.json`):

| Punto | Estado | Cómo se verificó |
|---|---|---|
| Contraste AA | Cumple | `tools/contraste.mjs`: 20 de 20 pares. El peor caso es el nav sobre papel blanco, 5.01 : 1. |
| Teclado completo | Cumple | Enlace "Saltar al menú", pestañas con flechas, Home y End, foco visible de 3 px, el diálogo atrapa el foco y lo devuelve al cerrar con Escape. |
| Movimiento reducido | Cumple | Con `prefers-reduced-motion` no hay animaciones, la burger se muestra armada sin fijar la pantalla y las gotas quedan estáticas. |
| Móvil desde 360 px | Cumple | Capturas en 360, 390, 768 y 1440 px sin desborde horizontal. Áreas táctiles de 40 px o más. |
| Velocidad | Cumple | Carga inicial de 286 KB sin comprimir en 21 archivos, cero peticiones a terceros, fotos con `loading="lazy"`. No se midió Lighthouse en un celular real. |
| Estados | Cumple | Hover, foco y activo en botones; carrito vacío; carga del menú; error si `data.js` no carga; foto faltante con placeholder de tablero; sin JavaScript se ve título, texto y teléfono. |
| Sin datos inventados | Cumple | Lo no confirmado está marcado en `data.js` y visible con `SHOW_PENDIENTES`. |
| Sin stock, sin IA, sin emojis | Cumple | Iconos en SVG, fotos del negocio, burger y texturas dibujadas por código. |

Desviaciones conocidas:

- La tipografía cinética anima el ancho de letra (eje `wdth` de la fuente), que recalcula el texto. Es intencional y dura menos de un segundo por titular; lo demás anima solo `transform` y `opacity`.
- El vidrio (`backdrop-filter`) puede ir más lento en celulares de gama baja. Solo se usa en tres elementos y tiene respaldo opaco si el navegador no lo soporta.
- No se probó en Safari de iPhone real, solo en Chromium. Conviene abrirlo en tu teléfono antes de presentarlo.
