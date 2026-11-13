# Maison Rose · Fase 1 · Revisión de assets

Tableros: `inventario_assets.jpg` (los 11 completos) y `detalles_bordes.jpg` (acercamientos a bordes y texturas).

## Hallazgo general: la resolución real es la mitad de la nominal

Las 11 imágenes son capturas ampliadas. Al reducirlas al 50 % la energía de bordes sube entre 1.4 y 2.4 veces, lo que indica que casi no hay detalle por debajo de 2 px. Para decidir tamaños en pantalla tomo como resolución útil la mitad de la nominal.

Regla para el render: ninguna foto se dibuja a más ancho que su ancho útil. En un cuadro de 1080 px eso significa paneles de hasta ~60 % del ancho (el teléfono de cristal y las tarjetas caben bien); nada de foto a pantalla completa.

## Por asset

| Asset | Nominal | Útil aprox. | Qué trae | Qué hago |
|---|---|---|---|---|
| 00 logo silueta | 920×920 | 460×460 | Silueta rosa sobre círculo blanco; esquinas grises y un tinte azulado en el borde izquierdo | Máscara circular justo dentro del círculo blanco; máximo ~400 px en pantalla |
| 01 galleta chispas y nueces | 1320×1750 | 660×875 | Limpia, fondo de mármol claro | Usar completa |
| 02 galleta chocolate partida | 1320×1750 | 660×875 | Mano sin cara; resto de texto en el borde inferior | Recortar ~120 px de abajo |
| 03 Trianon frutos rojos | 1320×1470 | 660×735 | Limpia; la más nítida y vistosa | Usar completa |
| 04 mille-feuille corte | 1320×1470 | 660×735 | Limpia; macro suave | Usar completa, a tamaño de tarjeta |
| 05 flan parisino | 1240×1850 | 620×925 | Barra de Instagram arriba, título y tres líneas de texto propio (cortadas a la derecha), franja gris a la derecha | Recortar los ~430 px superiores y ~20 px de la derecha; queda ~1220×1400 solo con el flan |
| 06 pain suisse | 1320×1680 | 660×840 | Línea blanca arriba; icono de sonido en la esquina inferior derecha | Recortar ~15 px arriba y ~120 px abajo |
| 07 berlinesas rellenas | 1320×1700 | 660×850 | Torso con uniforme rosa y manos con guantes, sin cara; luces quemadas y dominante magenta | Recortar el tercio superior para dejar solo manos y berlinesas; no corrijo el color |
| 08 conchas | 1320×1610 | 660×805 | Insignia "2/2" arriba a la derecha, dedos en la esquina, franja oscura con ropa roja a la izquierda; es la más suave | Recortar ~130 px arriba y ~40 px a la izquierda; usar pequeña |
| 09 charola hojaldres de fruta | 1020×1260 | 510×630 | Limpia | Usar completa |
| 10 galletas apiladas | 1100×1240 | 550×620 | Barra blanca arriba (~30 px) y franja gris a la izquierda (~90 px) | Recortar ambas |

Ninguna tiene caras, precios ni nombres de marca legibles.

## Puntos que necesitan decisión

1. **Asset 08 no muestra lo que dice su nombre.** Se llama "conchas_galleta_chispas", pero la foto son conchas con crema y caramelo, sin chispas. En el beat 8.00–10.00 va solo como imagen, sin rótulo propio, así que no afecta; no le pondré nombre de producto.
2. **Asset 07 choca con la paleta.** El uniforme magenta y las luces quemadas destacan sobre cacao y rosa. La regla es no recolorear, así que la opción es recorte cerrado a las berlinesas. Es la tarjeta BERLINESAS del beat 3.00–6.00 y no hay otra foto de berlinesas.
3. **Asset 10: el topping parece galleta triturada de marca.** No se lee ninguna marca. La mantengo salvo indicación contraria.
4. **"Pâtisserie" en pantalla.** El prompt la da como frase eje, pero la sección de seguridad la condiciona a confirmación de la dueña. El beat sheet no la pone en pantalla; la dejo fuera.
5. **Logo.** Con 460 px útiles alcanza para el cierre a tamaño moderado. Para la versión final hace falta el original.

## Lo que hará falta en la fase 3

La locución es con ElevenLabs y este entorno no tiene clave configurada. Se puede pedir por formulario seguro al llegar a esa fase, o recibir la toma ya generada como en el proyecto anterior.
