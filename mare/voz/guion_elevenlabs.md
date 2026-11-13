# Guion para ElevenLabs · MaRe Repostería

- **Voz:** femenina, español de México, cálida y natural. Nunca acelerada.
- **Modelo:** Eleven Multilingual v2.
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 15 %, Speaker boost activado, Speed 1.0.
- **Tomas:** genera el texto completo dos veces y sube los dos archivos al chat, en WAV o MP3 de 192 kbps o más.

## Texto para pegar

```
Lo mejor está adentro.
<break time="1.0s" />
Galletas, brownies y pasteles.
<break time="1.0s" />
Cinco sellos, y veinte por ciento de descuento.
<break time="1.0s" />
Imagina todo esto en tu propia página.
<break time="1.0s" />
Elige tu cajita. Elige tus toppings.
<break time="1.0s" />
Haz tu pedido por WhatsApp.
<break time="1.0s" />
Mare Repostería. Aguascalientes.
<break time="1.0s" />
Tu página, desde mil pesos.
```

Si usas Eleven v3, quita las etiquetas `<break>` y deja una línea en blanco entre frases.

## Pronunciación

- **MaRe** va escrito "Mare" para que lo lea como una palabra ("má-re") y no deletree.
- **WhatsApp** debe sonar "guatsap"; si lo lee raro, escríbelo así.
- **brownies** = "braunis", **toppings** = "topins". Solo cámbialos si suenan mal.

## Dónde va cada frase

Yo corto y coloco cada frase; no acomodes nada. No aceleres la voz aunque una frase se pase.

| # | Entra | Frase | Hueco |
|---|---|---|---|
| L1 | 0.50 s | Lo mejor está adentro. | 2.5 s |
| L2 | 3.00 s | Galletas, brownies y pasteles. | 3.0 s |
| L3 | 6.00 s | Cinco sellos, y veinte por ciento de descuento. | 2.2 s |
| L4 | 8.20 s | Imagina todo esto en tu propia página. | 2.2 s |
| L5 | 10.40 s | Elige tu cajita. Elige tus toppings. | 2.0 s |
| L6 | 12.40 s | Haz tu pedido por WhatsApp. | 2.0 s |
| L7 | 14.40 s | MaRe Repostería. Aguascalientes. | 1.9 s |
| L8 | 16.30 s | Tu página, desde mil pesos. | 1.7 s |
