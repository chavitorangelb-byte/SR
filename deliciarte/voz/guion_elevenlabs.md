# Guion para ElevenLabs · DeliciArte Pastelería

- **Voz:** femenina, español de México, cálida y natural. Ritmo tranquilo, nunca acelerada.
- **Modelo:** Eleven Multilingual v2.
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 15 %, Speaker boost activado, Speed 1.0.
- **Tomas:** genera el texto completo dos veces (2 tomas) y mándame los dos archivos en el chat, en WAV o en MP3 de 192 kbps o más.

## Texto para pegar

```
Sabor inigualable en cada pastel.
<break time="0.8s" />
Pasteles personalizados, a tu gusto.
<break time="0.8s" />
Diseños únicos para tu celebración.
<break time="0.8s" />
Imagina todo esto en tu propia página.
<break time="0.8s" />
Y postres para cada antojo.
<break time="0.8s" />
Pide por guatsap.
<break time="0.8s" />
DeliciArte. Pastelería.
<break time="0.8s" />
Tu página, desde mil pesos.
```

Si usas Eleven v3, quita las etiquetas `<break>` y deja una línea en blanco entre frases.

## Dónde va cada frase

Yo corto cada frase y la pongo en su cuadro; no tienes que acomodar nada.

| # | Entra | Frase | Dura idealmente |
|---|---|---|---|
| L1 | 0.50 s | Sabor inigualable en cada pastel. | ≤ 2.3 s |
| L2 | 3.00 s | Pasteles personalizados, a tu gusto. | ≤ 2.7 s |
| L3 | 6.00 s | Diseños únicos para tu celebración. | ≤ 2.2 s |
| L4 | 8.20 s | Imagina todo esto en tu propia página. | ≤ 2.2 s |
| L5 | 10.40 s | Y postres para cada antojo. | ≤ 1.9 s |
| L6 | 12.40 s | Pide por WhatsApp. | ≤ 1.8 s |
| L7 | 14.40 s | DeliciArte. Pastelería. | ≤ 1.8 s |
| L8 | 16.30 s | Tu página, desde mil pesos. | ≤ 1.6 s |

Si una frase dura más, no la aceleres en ElevenLabs: yo ajusto la línea de tiempo a las duraciones reales.

## Pronunciación

- **WhatsApp** va escrito "guatsap" para que suene como en México. En pantalla se escribe "WhatsApp".
- **DeliciArte:** "de-li-si-ar-te". Si la voz lo lee en inglés o junta mal las sílabas, prueba con "Delisi Arte".
- **mil pesos** va con letra, no con número.
