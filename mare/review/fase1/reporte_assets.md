# MaRe Repostería · Fase 1: revisión de assets

Los 12 archivos abren bien (JPG, RGB). Tablero: `inventario_assets.jpg`.
Regla aplicada: ninguna foto se muestra por encima de su tamaño nativo (cuadro 1080×1920).

| # | Archivo | Px | Uso | Ancho máx. en pantalla | Qué hay que hacer |
|---|---|---|---|---|---|
| 01 | logo_MaRe_reposteria | 734×401 | End card | 734 px | Fondo crema pegado al JPG (no es transparente). Sobre espresso va dentro de una placa crema; el azul del logo no se lee sobre fondo oscuro. |
| 02 | galletas_sobre_kraft | 1320×2159 | Héroe del teléfono | pantalla completa | Limpia. Sin texto. |
| 03 | mega_galletas_corte | 1222×623 | Corte de la línea, tarjeta | ancho completo | Recortar 1 px oscuro a la izquierda. Un relleno parece galleta comercial de sándwich: se ve, pero no se nombra. |
| 04 | monster_cookie_corte | 1225×628 | Reserva (no está en el beat sheet) | ancho completo | Recortar 1 px arriba y a la izquierda. |
| 05 | cajita_de_galletas | 946×1036 | Cajita 10–12 s | ~840 px tras recorte | Manuscrito "mixed box cookies" arriba-izquierda: recortar a la caja (aprox. x>100, y>140). El papel interior trae un estampado rosa sin texto legible. |
| 06 | brownies_ganache | 576×722 | Tarjeta, menú, toppings | **576 px** | La más chica: solo en tarjetas, nunca a pantalla completa. |
| 07 | brookie_corte | 719×840 | Menú, toppings | 719 px | Limpia. |
| 08 | lemonies | 637×868 | Menú | 637 px | Limpia. |
| 09 | pasteles_pistache_frambuesa_y_sacher | 1199×665 | Tarjeta PASTELES | ancho completo | Barra negra de 25 px abajo (resto de captura): recortar a 1199×640. Fondo de madera, no kraft. |
| 10 | cuchareable_frambuesa | 997×665 | Menú | 997 px | Texto impreso del vaso abajo-izquierda ("JOS…"): recortar la franja inferior. 1 px blanco arriba. Cuchara sin mano visible. |
| 11 | logo_sello_rosa_MaRe | 869×871 | Morph del sello | ~560 px (centro) | Trae el eslogan y `@mare_reposteria_` en el anillo, y esquinas grises de foto de perfil. Ver decisión 1. |
| 12 | tarjeta_lealtad_referencia | 835×473 | Solo referencia | no se muestra | Ver decisión 2. |

## Decisiones que necesito

1. **Sello rosa (11).** Eslogan y usuario están sin confirmar, así que el anillo de texto se enmascara. El centro (logo "MaRe Repostería") queda intacto hasta un radio de ~285 px; el texto vive entre 315 y 350 px. Propuesta: la forma ondulada del sello se genera en código como campo de distancia con el mismo rosa del archivo (#E38BB1), y encima va el centro oficial sin tocar. Así el morph SDF tiene una forma real y no aparece ningún texto sin confirmar. Alternativa: disco rosa liso recortado, sin borde ondulado.
2. **Tarjeta de lealtad (12).** La referencia muestra 4 círculos de sello y un quinto que ya es la insignia "20%". El beat sheet pide 5 sellos y una insignia. Propuesta: se estampan 5 y el quinto se transforma en la insignia "20 %". El rótulo sería "TARJETA DE LEALTAD" (la original dice "LOYALTY CARD"); no se muestra "$120" porque es precio.
3. **Logo 01 en el end card.** Va en placa crema redondeada a ≤ 600 px de ancho.
4. **Asset 04** no tiene escena asignada. Propuesta: segundo cuadro del corte (2.0–3.0 s) o fuera.

## Faltantes para fases siguientes

- **Voz (fase 3).** No hay credencial de ElevenLabs en este entorno. Opciones: guardar la llave en el entorno, o subir la toma ya generada (así se hizo en Florería Roma).
- **SFX.** El prompt dice "[tu biblioteca de SFX]" sin biblioteca. Propuesta: sintetizarlos en código, como en Florería Roma.
- **Tipografías.** Propuesta: Baloo 2 (titulares, redondeada y gruesa) y DM Sans (apoyo), ambas OFL.
- **Vigencia del 20 % y la regla de sellos:** confirmar con la dueña antes de enseñar la pieza.
