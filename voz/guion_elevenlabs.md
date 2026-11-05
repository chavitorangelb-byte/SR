# Guion para ElevenLabs · Florería Roma

- **Voz:** femenina, español de México, cálida y cercana. Ritmo natural, nunca acelerada.
- **Modelo:** Eleven Multilingual v2.
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 15 %, Speaker boost activado, Speed 1.0.
- **Tomas:** genera el texto completo dos veces (2 tomas) y mándame los dos archivos aquí en el chat, en WAV o en MP3 de 192 kbps o más.

## Texto para pegar

```
Alguien busca flores en Aguascalientes.
<break time="1.0s" />
Que te encuentre a ti.
<break time="1.0s" />
Tus ramos, con foto, tamaño y precio.
<break time="1.0s" />
Y el pedido en tres pasos, directo a tu WhatsApp.
<break time="1.0s" />
A domicilio o para recoger, y con reseñas que hablan por ti.
<break time="1.0s" />
Tus flores ya enamoran. Que también se vendan solas.
<break time="1.0s" />
Florería Roma. Así se vería con Elevate.
```

Si usas Eleven v3, quita las etiquetas `<break>` y deja una línea en blanco entre frases.

## Dónde va cada frase

Yo corto cada frase y la coloco en su cuadro; no tienes que acomodar nada.

| # | Entra | Frase | Dura máx. |
|---|---|---|---|
| L1 | 0.40 s | Alguien busca flores en Aguascalientes. | 2.5 s |
| L2 | 3.00 s | Que te encuentre a ti. | 1.9 s |
| L3 | 5.20 s | Tus ramos, con foto, tamaño y precio. | 3.6 s |
| L4 | 9.70 s | Y el pedido en tres pasos, directo a tu WhatsApp. | 4.2 s |
| L5 | 15.73 s | A domicilio o para recoger, y con reseñas que hablan por ti. | 4.2 s |
| L6 | 20.00 s | Tus flores ya enamoran. Que también se vendan solas. | 4.0 s |
| L7 | 24.40 s | Florería Roma. Así se vería con Elevate. | 3.3 s |

Si una frase dura más, no la aceleres en ElevenLabs: avísame y la acomodo en la edición.

## Pronunciación

- **WhatsApp** debe sonar "guatsap". Si la voz lo lee raro, escribe "guatsap" en el texto.
- **Elevate:** si no suena como ustedes lo dicen, escríbelo como se pronuncia.
- **Aguascalientes** y **Florería Roma** van tal cual.
