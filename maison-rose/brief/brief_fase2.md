# Brief de producción · Maison Rose · Fase 2

Pieza spec de "El pliegue": una cinta rosa-dorada que se dobla como hojaldre, revela el producto, se vuelve su logo, luego un teléfono con su página y al final el subrayado del botón de WhatsApp. Un solo plano continuo.

Los cuadros de voz y de kinetic type de este documento son nominales. Se bloquean a la toma real en la fase 3.

## Especificaciones

- **Duración:** 1080 cuadros a 60 fps (18.0 s): 16 s de pieza y 2 s de end card. A 120 BPM un tiempo son 30 cuadros y un compás, 120.
- **Formatos:** 9:16 de 1080 × 1920 (principal) y re-layout real a 1:1 de 1080 × 1080. Master a 60 fps y H.264 a 30 fps para WhatsApp e Instagram.
- **Zonas seguras en 9:16:** nada importante arriba de y 250 ni debajo de y 1580.
- **Paleta:** cacao #1B1210 (fondo), crema #F3E6D6, rosa #E5A898 (cinta y acentos), caramelo #C98B4E, chocolate #4A2A1C. Sin azul.
- **Tipografía:** Playfair Display (serif de alto contraste, ya está en el repo) para titulares y kinetic type; DM Sans para apoyo y end card; un script suave solo para "Maison Rose" del cierre (lo elijo entre fuentes de licencia abierta en la fase 4 y lo enseño en la prueba de dirección).
- **Cinta:** tira con grosor de 10 px y ancho de 150 px, cara rosa #E5A898 y canto caramelo #C98B4E, con sombra propia en cada doblez. Simulada como cinta, no como máscara.
- **Glass:** blur real de 28 a 40 px de lo que hay detrás, saturación 140 %, borde de 1 px, ruido 2 %, grosor y reflejo visibles.
- **Isométrico:** 30°, luz fija arriba a la izquierda, sombras de contacto que crecen al aterrizar.
- **Motion blur:** 8 subcuadros por cuadro.

## Reglas de fotos (de la fase 1)

Las fotos son capturas con la mitad de detalle real. Ancho máximo en cuadro:

| Uso | Ancho máx. |
|---|---|
| Panel protagonista (02 en la revelación, 05/04/03 en pasteles) | 620 px |
| Tarjeta isométrica y panel en profundidad | 460 px |
| Muro de menú | 360 px |
| Logo (asset 00) | 400 px |

Recortes aprobados: 02 sin el borde inferior, 05 solo el flan, 06 sin el icono, 07 cerrado a manos y berlinesas, 08 sin insignia ni franja, 10 sin barras. El asset 08 no lleva rótulo de producto.

## Cambios al prompt original

1. **"Pâtisserie française" no aparece en pantalla ni en la voz.** El prompt la condiciona a confirmación de la dueña.
2. **El logo entra por máscara, no por redibujo.** La cinta se acomoda al contorno de la silueta (campo de distancia sacado de los pixeles del propio asset 00) y el asset real se revela dentro de ese contorno. Así no hay fundido de opacidad y la marca no se redibuja.
3. **Los chips de categorías viven dentro de la pantalla del teléfono.** Así el kinetic "TU PROPIA PÁGINA" puede aterrizar en la voz sin pasar de cuatro palabras de kinetic a la vez.
4. **El "corte" al end card es un doblez.** La cinta barre el cuadro como último pliegue y deja el fondo cacao con el end card; el golpe grave cae en ese doblez (f960). Se respeta el cero cortes duros.
5. **Icono de WhatsApp en un solo color (crema),** como glifo dentro del botón de cristal, sin verde, para no romper la paleta.
6. **SFX hechos en código,** igual que en Florería Roma, porque el prompt dejó la biblioteca sin definir.

## Riesgo de tiempos

A ritmo natural (medido en la toma de Florería Roma: unas 5.5 sílabas por segundo más pausas), tres frases no caben en su ventana:

| Frase | Ventana | Estimado |
|---|---|---|
| L3 "Ocho sabores de galletas, recién horneadas." | 2.1 s | 2.9 s |
| L4 "Imagina todo esto en tu propia página." | 2.1 s | 2.5 s |
| L5 "Flan parisino. Mille-feuille. Trianon." | 1.9 s | 2.4 s |

Además, el end card tiene cuatro líneas y dos segundos: la voz cabe justa (1.6 s) pero no alcanza a leerse todo.

No se acelera la voz. Con la toma real en mano aplico, en este orden:

1. Si falta menos de 0.5 s en total, recorro los inicios dentro de la misma sección.
2. Si falta más, añado un compás (2 s) al muro de menú, que es donde va L4: la pieza queda en 18 s + 2 s.
3. El end card se alarga a 3 s solo si lo apruebas; si no, queda en 2 s con una línea grande y tres chicas.

## Voz (nominal)

| # | Entra | Frase |
|---|---|---|
| L1 | f30 · 0.50 s | Cada pliegue cuenta. |
| L2 | f180 · 3.00 s | Hojaldres, berlinesas y pasteles. |
| L3 | f360 · 6.00 s | Ocho sabores de galletas, recién horneadas. |
| L4 | f492 · 8.20 s | Imagina todo esto en tu propia página. |
| L5 | f624 · 10.40 s | Flan parisino. Mille-feuille. Trianon. |
| L6 | f744 · 12.40 s | Pide por WhatsApp. |
| L7 | f864 · 14.40 s | Maison Rose. San Jerónimo. |
| L8 | f978 · 16.30 s | Tu página, desde mil pesos. |

## Línea de tiempo

Pistas: Cámara, Cinta, Foto, Glass, Tipo, Voz, Música. Entre paréntesis, el número de cues de SFX de la escena.

### 1 · Golpe · f0–f29 · 0.00–0.50 s (4 SFX)

- **f0 · Música.** Sub grave y golpe de contrabajo. Fondo cacao con degradado radial muy sutil.
- **f0–f14 · Cinta.** Cruza el cuadro en diagonal, de abajo a la izquierda (x −80, y 1500) a arriba a la derecha (x 1160, y 560), con motion blur fuerte.
- **f14–f29 · Cinta.** Primer doblez: la punta se pliega sobre sí misma a 180° en x 820, y 760 y deja ver el canto caramelo. Crujido de hojaldre en f22.
- **Cámara.** Fija, con un empuje de 2 % que arranca en f0.

### 2 · Pliegues · f30–f119 · 0.50–2.00 s (9 SFX)

- **f30, f60, f90 · Cinta.** Tres dobleces más, uno por tiempo. Cada uno baja una capa y la apila sobre la anterior; quedan cuatro capas centradas en y 900 con sombra de contacto entre ellas.
- **f30 · Voz.** L1.
- **f30 · Tipo.** "CADA" entra por glifo desde el canto de la primera capa (stagger 25 ms), Playfair 150 px, crema, en y 430.
- **f42 · Tipo.** "PLIEGUE" se despliega: cada letra gira 90° sobre su base, como una capa que cae.
- **f66 · Tipo.** "CUENTA" aterriza en y 1380 con un golpe seco y un rebote de 6 px; "CADA PLIEGUE" se queda arriba.
- **f96–f119 · Tipo.** Las tres palabras se doblan hacia atrás y salen por debajo de la capa más cercana.
- **Cámara.** Dolly lento hacia las capas, de 100 % a 108 %.

### 3 · Revelación y logo · f120–f179 · 2.00–3.00 s (7 SFX)

- **f120–f150 · Cinta y Foto.** La capa superior se abre como tapa y de adentro sale el panel de cristal con la galleta partida (02), a 620 px de ancho, centrado en y 880. El panel tiene grosor y un reflejo que cruza de izquierda a derecha. Sonido de galleta que se parte en f126.
- **f150–f174 · Cinta.** La cinta se suelta de las capas, rodea el panel y se asienta sobre el contorno de la silueta del logo. El panel se achica hacia el centro por morph de campo de distancia (rectángulo redondeado a círculo).
- **f162–f179 · Foto.** El asset 00 se revela dentro del contorno, enmascarado en círculo, a 400 px, en x 540, y 900.
- **Cámara.** Se detiene en 108 %.

### 4 · Teléfono y categorías · f180–f359 · 3.00–6.00 s (12 SFX)

- **f180 · Música.** Lift: entra el acordeón y los brushes.
- **f174–f204 · Glass.** El círculo del logo se estira a rectángulo redondeado (morph SDF) y gana grosor: es el marco de cristal del teléfono, 560 × 1150 px, centrado en y 920. El logo queda arriba dentro de la pantalla, a 150 px.
- **f180 · Voz.** L2.
- **f210 · Glass y Tipo.** Tarjeta isométrica HOJALDRES (06) cae desde arriba a la izquierda y se estampa. Rótulo "HOJALDRES" en Playfair 76 px sobre el borde inferior de la tarjeta.
- **f240 · Glass y Tipo.** Tarjeta BERLINESAS (07), desde la derecha.
- **f300 · Glass y Tipo.** Tarjeta PASTELES (03), desde abajo.
- **Cada estampado.** Sombra de contacto que crece en 6 cuadros, onda en el campo líquido del fondo y pulso de 3 px en el marco del teléfono.
- **f312–f359 · Glass.** Las tres tarjetas giran a frontal y entran a la pantalla como la fila de categorías de la página.
- **Cámara.** Órbita de −8° a +8° alrededor del teléfono; cierra con un push de 6 %.

### 5 · Galletas · f360–f479 · 6.00–8.00 s (9 SFX)

- **f360 · Voz.** L3.
- **f360 · Tipo.** "OCHO" entra enorme (Playfair 260 px) por detrás del teléfono y lo cruza en profundidad; "SABORES" aterriza debajo en f378.
- **f360, f384, f408 · Foto.** Paneles de cristal con 01, 10 y 02 a tres profundidades (460, 400 y 340 px de ancho) que se deslizan desde la derecha con parallax; el teléfono se recorre a la izquierda y queda desenfocado detrás.
- **f414 · Tipo.** "OCHO SABORES" se pliega y sale; "GALLETAS" aterriza en y 420.
- **f450 · Tipo.** "RECIÉN HORNEADAS" sube desde el borde del panel más cercano, con un hilo de vapor hecho con la cinta (una onda fina, no humo).
- **Cámara.** Tracking lateral de 90 px a la derecha.

### 6 · Muro de menú · f480–f599 · 8.00–10.00 s (10 SFX)

- **f480–f510 · Foto.** Los paneles de galletas se reacomodan y entran 04, 05, 09 y 08 como muro isométrico de 2 × 2 (360 px cada uno) que orbita 10° alrededor del teléfono.
- **f486, f498, f510, f522 · Glass.** Chips de cristal dentro de la pantalla del teléfono: HOJALDRES · BERLINESAS · PASTELES · GALLETAS (DM Sans 30 px).
- **f492 · Voz.** L4.
- **f550 · Tipo.** "TU PROPIA" y "PÁGINA" (Playfair 130 px) aterrizan a la derecha del teléfono, sobre las palabras de la voz; la cinta subraya "PÁGINA" en f570.
- **Cámara.** Órbita suave continua; el teléfono vuelve al centro en f580.

### 7 · Pasteles · f600–f719 · 10.00–12.00 s (9 SFX)

- **f600–f624 · Foto.** El muro se pliega como abanico y queda solo el flan (05) como panel de 620 px en y 860.
- **f624 · Voz y Tipo.** L5. "FLAN PARISINO" aterriza en y 1330, Playfair 110 px.
- **f660 · Foto.** El panel gira sobre su eje vertical y por la otra cara llega el mille-feuille (04). En **f672**, "MILLE-FEUILLE" releva al nombre anterior.
- **f696 · Foto.** Segundo giro: Trianon (03). En **f708**, "TRIANON".
- **Cada aterrizaje.** Golpe de celesta, sombra que crece y un doblez corto de la cinta detrás del panel.
- **Cámara.** Push-in de 4 % por pastel, con asentamiento.

### 8 · WhatsApp · f720–f839 · 12.00–14.00 s (8 SFX)

- **f720–f744 · Glass.** El panel del Trianon se aplana y se estira a píldora de cristal (morph SDF) de 820 × 150 px en y 980; el pastel queda desenfocado detrás, dentro del teléfono.
- **f744 · Voz y Tipo.** L6. "PIDE POR WHATSAPP" dentro del botón (DM Sans 54 px, crema) con el glifo de WhatsApp a la izquierda; cada palabra entra con su palabra de la voz.
- **f756–f780 · Cinta.** Baja y se tiende bajo el botón como subrayado con grosor.
- **f780, f810 · Cinta.** El subrayado pulsa con el kick (ensancha 20 % y vuelve).
- **f798 · Glass.** Tap: el botón se hunde 4 px, onda de contacto y clic.
- **Cámara.** Fija con respiración de 1 %.

### 9 · Cierre · f840–f959 · 14.00–16.00 s (5 SFX)

- **f840 · Música.** Respiro: salen los brushes y queda celesta con contrabajo.
- **f840–f900 · Cámara y Glass.** Pull-back; el botón entra a la pantalla, el teléfono se cierra a círculo y vuelve a ser el asset 00 a 400 px en y 820.
- **f864 · Voz y Tipo.** L7. "Maison Rose" en script (120 px, crema) debajo del logo, escrito por la cinta de izquierda a derecha; "SAN JERÓNIMO" en DM Sans 40 px con tracking amplio en f894.
- **f930–f959 · Cinta.** Se levanta de la firma y prepara el último doblez.

### End card · f960–f1079 · 16.00–18.00 s (4 SFX)

- **f960 · Cinta y Música.** La cinta barre el cuadro como doblez final; golpe grave. Queda fondo cacao.
- **f966–f990 · Tipo.** Cuatro líneas, de arriba a abajo:
  - "Precios accesibles desde $1,000 pesos por tu página" (Playfair 64 px, crema, dos renglones)
  - "Paquete de 3 videos promocionales: $1,500" (DM Sans 40 px, rosa)
  - "Elevate Negocios · Aguascalientes" (DM Sans 36 px, crema)
  - "Demo de cortesía de Elevate Negocios · pieza no oficial" (DM Sans 26 px, crema al 70 %)
- **f978 · Voz.** L8.
- **f1050–f1079.** Cuadro quieto para que se pueda leer en pausa.

Total: 77 cues de SFX.

## Música

120 BPM, compás de 2 s, en código. Capas por sección:

| Sección | Capa nueva |
|---|---|
| 0–2 s | Sub y contrabajo en pizzicato |
| 2–3 s | Celesta, motivo de tres notas |
| 3–6 s | Lift: acordeón suave y brushes |
| 6–8 s | Contratiempo de brushes y segunda voz de celesta |
| 8–12 s | Acordeón completo |
| 12–14 s | Kick marcado que mueve el subrayado |
| 14–16 s | Respiro: celesta y contrabajo |
| 16–18 s | Golpe grave y cola |

La música baja al menos 12 dB bajo cada palabra de la voz. Mezcla: voz a −16 LUFS, master a −14 LUFS y −1.25 dBTP.

## Re-layout 1:1

- El teléfono mide 400 × 820 px y va a la izquierda (x 300); el kinetic type va a la derecha, alineado a la izquierda, a 70 % del tamaño de 9:16.
- Las tarjetas de categorías se estampan en columna a la derecha del teléfono, no alrededor.
- El muro de menú pasa de 2 × 2 a una fila de 4 detrás del teléfono.
- Los paneles de pasteles bajan a 520 px y el nombre va a su derecha.
- El botón de WhatsApp mide 760 × 130 px, centrado.
- El end card conserva las cuatro líneas, con la primera en 54 px.
