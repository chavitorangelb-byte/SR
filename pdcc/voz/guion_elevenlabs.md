# Guion para ElevenLabs · Pro Detailing Car Care

- **Voz:** español de México, cálida y natural, segura. Ritmo tranquilo, nunca acelerada.
- **Modelo:** Eleven Multilingual v2.
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 15 %, Speaker boost activado, Speed 1.0.
- **Tomas:** genera el texto completo dos veces (2 tomas) y mándame los dos archivos en el chat, en WAV o MP3 de 192 kbps o más.

## Texto para pegar

```
Detallado boutique, de alto nivel.
<break time="1.0s" />
Cinco estrellas en Google.
<break time="1.0s" />
Pe pe efe, polarizado y nano cerámico.
<break time="1.0s" />
Imagina todo esto en tu propia página.
<break time="1.0s" />
Agenda tu cita por WhatsApp.
<break time="1.0s" />
Pro Detailing Car Care.
<break time="1.0s" />
Tu página, desde mil pesos.
```

Notas:
- "Pe pe efe" está escrito así para que diga las siglas PPF en español. Si lo lee raro, prueba con "P. P. F.".
- Si "Pro Detailing Car Care" suena con pronunciación española, prueba "Pro Díteilin Car Ker".
- Con Eleven v3, quita las etiquetas `<break>` y deja una línea en blanco entre frases.

## Dónde va cada frase

Yo corto cada frase y la coloco en su cuadro; no tienes que acomodar nada.

| # | Entra | Frase | Dura máx. |
|---|---|---|---|
| L1 | 0.50 s | Detallado boutique, de alto nivel. | 3.2 s |
| L2 | 4.00 s | Cinco estrellas en Google. | 1.9 s |
| L3 | 6.20 s | PPF, polarizado y nano cerámico. | 3.4 s |
| L4 | 10.20 s | Imagina todo esto en tu propia página. | 1.8 s |
| L5 | 12.20 s | Agenda tu cita por WhatsApp. | 1.8 s |
| L6 | 14.20 s | Pro Detailing Car Care. | 1.6 s |
| L7 | 16.30 s | Tu página, desde mil pesos. | 1.6 s |

Las frases L4 a L7 tienen muy poco margen. Si una toma se pasa del máximo, hay que repetirla o recortar texto; no se acelera la voz.
