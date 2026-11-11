# Guion para ElevenLabs · Cata Café

- **Voz:** español de México, cálida y natural, cercana. Ritmo tranquilo, nunca acelerada.
- **Modelo:** Eleven Multilingual v2 (o Eleven v3 si la voz elegida suena mejor ahí).
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 15 %, Speaker boost activado, Speed 1.0.
- **Tomas:** genera el texto completo dos veces (2 tomas), en una sola llamada cada una, y manda los dos archivos en WAV o en MP3 de 192 kbps o más.

## Texto para pegar

Las cinco primeras líneas son el guion. Las tres últimas son versiones cortas de reserva: se graban en la misma toma para poder cambiarlas sin pedir otra si alguna línea no cabe en su ventana.

```
Todo buen café empieza con un solo trazo.
<break time="1.0s" />
Y tu negocio, con una página que lo cuente.
<break time="1.0s" />
Tus métodos, tu café en grano y tu tarjeta de puntos, ahora en el celular.
<break time="1.0s" />
Así se vería la página de Cata Café.
<break time="1.0s" />
Si te gusta, la hacemos realidad.
<break time="1.5s" />
Tus métodos, tu grano y tu tarjeta de puntos, ahora en el celular.
<break time="1.0s" />
Así se vería Cata Café.
<break time="1.0s" />
¿Te gusta? La hacemos realidad.
```

Si la voz lee las etiquetas `<break>` en voz alta, cámbialas por un salto de línea doble.

## Ventanas (a ritmo natural, sin acelerar)

| # | Entra | Debe terminar antes de | Cabe hasta | Línea |
|---|---|---|---|---|
| L1 | 0.40 s | 3.90 s | 3.5 s | Todo buen café empieza con un solo trazo. |
| L2 | 4.10 s | 7.70 s | 3.6 s | Y tu negocio, con una página que lo cuente. |
| L3 | 7.90 s | 12.20 s | 4.3 s | Tus métodos, tu café en grano y tu tarjeta de puntos, ahora en el celular. |
| L4 | 12.40 s | 14.30 s | 1.9 s | Así se vería la página de Cata Café. |
| L5 | 14.50 s | 16.00 s | 1.5 s | Si te gusta, la hacemos realidad. |

L4 y L5 son las justas: a ritmo natural duran alrededor de 2.4 s y 1.9 s. Al medir la toma se elige, en este orden: mover la entrada unos cuadros, usar la versión corta, o dejar que la última palabra de L5 termine sobre la end card. La voz no se acelera.
