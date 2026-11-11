# Mandala Burgers · Fase 1: assets y brief con tiempos

Pieza spec privada de Elevate Negocios. Vertical 9:16, 27 s (24 s + 3 s de end card), 60 fps, 1620 cuadros, BPM 100 (compás = 144 cuadros).
La fuente de verdad de los tiempos es `brief/timeline.json`; los datos de contacto viven en `config/negocio.json`.

## 1. Assets revisados

| Archivo | Tamaño | Uso | Límite |
|---|---|---|---|
| `logo-circulo.png` | 880×880, RGBA, transparente fuera del círculo | Encabezado de la página, revelación S7, end card | ≤ 1.0x (880 px). Solo mover, escalar, desenfocar, enmascarar |
| `logo-wordmark.jpg` | 1175×939, fondo crema (246,242,239) | Pie de la página en la versión de computadora | Sobre crema #F5F2EE (diferencia de 1 nivel, no se nota). ≤ 1.0x |
| `foto_ig_01_halloween_burger.jpg` | 439×585 | Tarjeta pequeña "De su Instagram" | ≤ 439 px de ancho en lienzo, empuje hasta 1.12x |
| `foto_ig_02_moksha_pan_jalapeno.jpg` | 439×581 | Tarjeta pequeña "De su Instagram" | Igual |

- **ref-maps (7 fotos de clientes):** no se insertan en el video ni se versionan en el repositorio (`.gitignore`). Solo sirven de referencia de forma y color para ilustrar panes, hotdog y papas.
- **capturas-originales:** traen nombres y fotos de clientes; no entran al proyecto.
- Hoja de inventario: `review/fase1/inventario_assets.jpg`.

## 2. Decisiones que propongo (con criterio, para aprobar)

1. **Héroe con ilustración, no con la foto de Halloween.** La foto 01 trae "TRICK OR EAT?"; como imagen principal haría ver la página de temporada pasada. Va la burger ilustrada en el héroe y las dos fotos reales entran como tarjetas pequeñas en una tira "De su Instagram", a 300 px de ancho (por debajo de su tamaño real).
2. **La foto 02 no va junto a la tarjeta de Moksha.** La foto muestra pan verde y su menú pinta Moksha en rosa. Para no afirmar nada, la foto aparece solo en la tira de Instagram, con su propio rótulo.
3. **El filtro tiene 5 colores, no 6.** De la lista permitida salen amarillo, azul, rosa, morado y rojo. No hay burger con título verde ni naranja, así que el mandala de la cinta se abre en 5 pétalos de pan (más "Todos"). Verde limón y naranja quedan como colores de marca en acentos. No se escribe "6 colores 6 sabores".
4. **"Elige el color de tu día"** se usa como título de sección, tal como pide el diseño, y queda marcado como "confirmar con el dueño" (viene de una foto de cliente).
5. **Azul solo como dato:** el punto de pan de Karma y Loto y las ilustraciones de pan azul. Kayko queda fuera por nombrar una marca.
6. **Platillos en la interfaz:** Point, Karma, Moksha, Garden · Purusha, Mandala, Artha, Holi · Mahant, Loto · Point Dog · Frenchies, Gajos, Aros de cebolla, Porkypapas · Nubes asadas, Six S'mores Kit, Panque del abuelo, Helado. Sin Mandalotes, Kayko, Raga, Flotante, refrescos ni alcohol.
7. **Reseñas:** las tres frases cortas del encargo, sin nombres, sin estrellas ni calificación.
8. **SFX:** el encargo dice "[tu biblioteca de SFX]" y no llegó ninguna. Los sintetizo en código (mínimo 70 cues, hoja con cuadros), como la música. Si tienes biblioteca, pásala y la uso.
9. **Voz:** el guion va en una sola llamada con pausas. Dos líneas necesitan aire interno para que el kinetic type caiga en su palabra: "Elige tu color. | Pa' el clásico | o pa' el atrevido." y "Hotdogs, papas, | y nubes asadas | en tu mesa." En la fase 2 muevo cada palabra del kinetic type al cuadro real de su palabra hablada (tolerancia ±2 cuadros).

## 3. Tiempos por cuadro

### Escenas
| Escena | Tiempo | Cuadros | Qué pasa |
|---|---|---|---|
| S1 Hook | 0.00–2.40 | f0–f144 | Cinta cruza, escribe la búsqueda, Enter, nace el marco del celular |
| S2 La página llega | 2.40–4.80 | f144–f288 | Celular en perspectiva 18° que se endereza; encabezado y héroe |
| S3 El color de tu día | 4.80–9.60 | f288–f576 | Pétalos → puntos de pan; filtro; tarjetas con inclinación; hotdogs y entradas |
| S4 Respiro | 9.60–12.00 | f576–f720 | Nubes asadas: fogata, bombones, chispas |
| S5 Pide en un toque | 12.00–16.80 | f720–f1008 | Cinta → botón de WhatsApp; burbuja; reseñas |
| S6 Visítanos | 16.80–19.20 | f1008–f1152 | Cinta traza el mapa; tarjeta de cristal con horario y dirección |
| S7 Revelación y cierre | 19.20–24.00 | f1152–f1440 | Celular + navegador; aro de cinta y logo; pausa en f1404 |
| S8 End card | 24.00–27.00 | f1440–f1620 | Panel de cristal oscuro con contacto |

### Movimientos clave
| Cuadro | s | Movimiento |
|---|---|---|
| f0–f8 | 0.00 | La cinta cruza de lado a lado; destello f8–f11 |
| f12–f96 | 0.20 | Escribe "hamburguesas de colores aguascalientes" en la barra |
| f102 | 1.70 | Enter |
| f114 | 1.90 | La cinta empieza el marco del celular (SDF) |
| f144–f204 | 2.40 | Celular entra en perspectiva y se endereza |
| f186 | 3.10 | Encabezado con logo |
| f204–f252 | 3.40 | Titular, subtítulo y botón mostaza |
| f288 | 4.80 | Cinta → pétalos → puntos de color |
| f360 | 6.00 | Tap en un color; filtro |
| f366 / f384 / f438 / f456 | 6.10–7.60 | Tarjetas Point, Moksha, Purusha, Mandala |
| f504 | 8.40 | Scroll a Hotdogs y Entradas |
| f576 | 9.60 | Scroll a Postres; fogata |
| f744 | 12.40 | Cinta → botón de WhatsApp |
| f768 | 12.80 | Tap; burbuja de chat f780–f840 |
| f864 | 14.40 | Reseñas: f870, f906, f942 |
| f1008–f1068 | 16.80 | Cinta traza el mapa; pin f1074 |
| f1080 | 18.00 | Tarjeta de cristal; chips f1104 y f1116 |
| f1152–f1236 | 19.20 | Lift; entra el navegador |
| f1296–f1356 | 21.60 | Pantallas se alejan; aro de cinta y logo por máscara |
| f1404 | 23.40 | Pausa total |
| f1440 | 24.00 | End card |
| f1620 | 27.00 | Campanada final |

### Kinetic type (provisional hasta bloquear la voz)
| Cuadro | s | Texto | Se comporta como |
|---|---|---|---|
| f30 | 0.50 | HAMBURGUESAS | Golpea con squash |
| f72 | 1.20 | DE COLORES | Color letra a letra |
| f174 | 2.90 | TU PÁGINA | Página que carga |
| f300 | 5.00 | ELIGE | Dedo que toca |
| f330 | 5.50 | TU COLOR | Se tiñe del color tocado |
| f384 | 6.40 | PA' EL / CLÁSICO | Se apila como burger |
| f456 | 7.60 | PA' EL / ATREVIDO | Estampa torcida que se endereza |
| f516 | 8.60 | HOTDOGS | Se estira a lo largo |
| f624 | 10.40 | NUBES / ASADAS | Se infla y se dora |
| f660 | 11.00 | EN TU MESA | Se posa |
| f756 | 12.60 | PIDE | Se estampa |
| f792 | 13.20 | POR / WHATSAPP | Burbuja de chat |
| f936 | 15.60 | MANDALOVERS | Late |
| f1020 | 17.00 | JUEVES / A DOMINGO | Cae como pin |
| f1176 | 19.60 | EN CELULAR | Angosto |
| f1218 | 20.30 | EN COMPU | Se ensancha |
| f1320 | 22.00 | COLOR | Un color de pan por glifo |
| f1356 | 22.60 | EN CADA / BURGER | La composición más grande |

Reglas: máximo 3 o 4 palabras a la vez, ninguna línea de más de 960 px, mínimo 54 px, entrada 140 % → 100 % con squash y 2 cuadros de sacudida, stagger de 20 a 35 ms por glifo (1 a 2 cuadros).

### Voz
| Cuadro | s | Línea |
|---|---|---|
| f24 | 0.40 | Hamburguesas de colores. |
| f168 | 2.80 | Así se vería tu página. |
| f300 | 5.00 | Elige tu color. Pa' el clásico o pa' el atrevido. |
| f516 | 8.60 | Hotdogs, papas, y nubes asadas en tu mesa. |
| f756 | 12.60 | Pide por WhatsApp, en un toque. |
| f924 | 15.40 | Mandalovers, de jueves a domingo. |
| f1176 | 19.60 | En celular y en computadora. |
| f1344 | 22.40 | Color en cada burger. |

### Música (Mi mayor, capa nueva por compás)
f0 golpe · f144 palmas y hi-hat · f288 bajo · f432 clavinet y acordes · f576 respiro (marimba y pad) · f720 groove completo · f864 coros de palmas y melodía · f1008–f1152 riser · f1152 lift · f1404 solo sub · f1620 campanada.

## 4. Sistema técnico (para las fases 3 a 6)
- Motor único: `frame(t)` determinista en una página de render, capturada con Playwright y codificada con ffmpeg. 8 subcuadros por cuadro para el motion blur.
- Cinta, mandala y partículas en canvas/WebGL con campos de distancia; las transformaciones interpolan SDF, no opacidad.
- La página se construye primero como HTML real (filtro por color, enlace `wa.me/524494140043`), se captura por secciones y se anima dentro del celular.
- Tipografías OFL en local: Fredoka SemiBold (kinetic type y títulos) y Nunito (interfaz).
- 3D solo en tres toques: paralaje con desenfoque, celular en perspectiva, tarjetas inclinadas con destello (más el aro final con volumen).

## 5. Pendiente de confirmar con el dueño antes de enseñar la pieza
Precios, horario, WhatsApp, nombre oficial, la frase "Elige el color de tu día" y permiso para citar reseñas.
