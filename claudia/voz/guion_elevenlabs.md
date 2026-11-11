# Guion para ElevenLabs · Claudia Repostería Casera

- **Voz:** femenina, español de México, cálida, cercana y con sonrisa, como quien le habla a una amiga. Nunca acelerada. (En Roma se usó "Hope"; sirve la misma si te gusta.)
- **Modelo:** Eleven Multilingual v2.
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 20 %, Speaker boost activado, Speed 1.0.
- **Tomas:** genera el texto completo dos veces y manda los dos archivos, en WAV o MP3 de 192 kbps o más.

## Texto para pegar

```
Repostería casera, hecha sobre pedido.
<break time="1.0s" />
Así se vería tu página.
<break time="1.0s" />
Pasteles personalizados para bodas, cumpleaños y quince años.
<break time="1.0s" />
Cupcakes, galletas y gelatinas.
<break time="1.0s" />
Para cotizar, un solo botón: WhatsApp.
<break time="1.0s" />
Cuatro punto siete en Google.
<break time="1.0s" />
Horario y ubicación, a la vista.
<break time="1.0s" />
En celular y en computadora.
<break time="1.0s" />
Claudia Repostería Casera.
```

Con Eleven v3, quita las etiquetas `<break>` y deja una línea en blanco entre frases.

## Dónde va cada frase

Cada frase se corta y se coloca en su cuadro; las pausas de 1 s solo sirven para separarlas.

| # | Entra | Frase | Dura máx. |
|---|---|---|---|
| L1 | 0.40 s | Repostería casera, hecha sobre pedido. | 2.3 s |
| L2 | 2.80 s | Así se vería tu página. | 2.0 s |
| L3 | 6.30 s | Pasteles personalizados para bodas, cumpleaños y XV años. | 3.7 s |
| L4 | ~10.2 s | Cupcakes, galletas y gelatinas. | 1.8 s |
| L5 | 14.50 s | Para cotizar, un solo botón: WhatsApp. | 2.4 s |
| L6 | 17.00 s | Cuatro punto siete en Google. | 1.2 s (puede pisar hasta 18.4 s) |
| L7 | ~18.5 s | Horario y ubicación, a la vista. | 1.7 s |
| L8 | 20.40 s | En celular y en computadora. | 1.8 s |
| L9 | 22.60 s | Claudia Repostería Casera. | 1.6 s |

Si una frase dura más, no se acelera en ElevenLabs: se acomoda en la edición.

## Pronunciación

- **XV años** va escrito "quince años" en el texto para que no lea "equis uve".
- **WhatsApp** debe sonar "guatsap"; **Cupcakes**, "cópqueics"; **Google**, "gúgol". Si alguna sale rara, escríbela como suena.
- **Cuatro punto siete** va en letras para que no diga "cuatro coma siete".
