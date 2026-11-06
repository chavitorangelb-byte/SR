# Fase 1 · revisión de assets

Tablero: `inventario_assets.jpg`. Medición: `resolucion_real.json` (`python3 tools/resolucion_real.py`).

## Lo que hay (9 archivos, sin niños ni personas)
| Archivo | Nominal | Detalle real | Uso | Máximo en el video 1080×1920 |
|---|---|---|---|---|
| logo_jumpers.jpg | 1075×659 | ≈ 950 px | portada, barra, pie, end card (versión transparente) | ≈ 950 px (end card a ~650 px) |
| foto_01_rainbow_jumper.jpg | 427×575 | 427 px | portada y Rainbow Jump (barra oscura del borde recortada) | ≤ 408 px |
| foto_02_castle_jumper.jpg | 425×498 | 425 px | galería de Castle Jump | ≤ 425 px |
| foto_03_castillo_resbaladilla.jpg | 427×497 | 427 px | Magic Jump (por confirmar) | ≤ 427 px |
| foto_04_castillos_y_arcoiris.jpg | 427×368 | 427 px | Cómo funciona y cierre | ≤ 427 px |
| foto_05_inflables_parque.jpg | 427×251 | 427 px | cierre, solo pequeña | ≤ 427 × 251 px |
| foto_06_castle_jump_jardin.jpg | 1320×1591 | ≈ 500 px (ampliada ~2.6×) | tarjeta y ficha de Castle Jump | ≈ 420 px (encuadre de la tarjeta) |
| foto_07_castle_jump_terraza.jpg | 1320×1218 | ≈ 660 px (ampliada ~2×) | galería de Castle Jump | ≈ 660 px |
| foto_08_combo_mobiliario_infantil.jpg | 1320×975 | ≈ 1300 px | Arma tu fiesta y postal grande | ≈ 1300 px |

Método: reducir y volver a ampliar; si la diferencia queda bajo 1.0 (RMS, 0–255) no había detalle a ese tamaño.
Validado con foto_01 ampliada a 1320 px: estima 422 px (real 427).

## Consecuencias para el video
- Con las fotos actuales, una tarjeta que sale al 3D no puede crecer más que su tamaño dentro de la pantalla
  (celular al ~60 % del alto). Para que "salga" sin agrandar la foto: la tarjeta avanza en profundidad y gira,
  y la cámara se aleja un poco del celular.
- La postal de foto_08 sí puede ser grande (≈ 1300 px).
- Los push-in van sobre texto; las fotos de 427 px quedan fuera de cuadro o pequeñas.
- foto_03 parece el mismo castillo con resbaladilla que se ve completo en foto_05 y foto_08 (refuerza que sea el Magic Jump).

## Qué falta
1. Fotos originales (≥ 1080 px) de Rainbow Jump, Magic Jump y Castle Jump. Opcional, pero cambian lo que puede hacer el 3D.
2. Biblioteca de SFX: no llegó; por defecto se generan en código (≥ 70 cues).
3. ref_primersello_XX.png: no llegaron (opcionales).
4. Voz: guion para ElevenLabs en la fase 2; el usuario sube las 2 tomas (o da acceso a la API).
5. Logo de Elevate (opcional) para la end card; si no, va en texto.

## Por confirmar con el dueño (desde la fase 0)
WhatsApp (bio 449 180 7242 en uso vs. etiqueta 449 180 72 47) · Magic Jump = foto_03 · orden de secciones.
