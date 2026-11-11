# Brief de producción · Cata Café · Fase 2

Video vertical de 18 s que le enseña al dueño cómo se vería su página. Un solo plano continuo guiado por un trazo de café. La interfaz manda; los gráficos la sirven. Pieza privada, no se publica sin su permiso.

## Decisiones aprobadas

1. **"Tus métodos…" funciona como resumen.** Los métodos se ven de 4 a 6 s y la voz los nombra en 7.9 s. La locución no cambia; el kinetic type de esa línea es solo "EN EL CELULAR", hacia la revelación de 12.0 s.
2. **Los chips de horario y ubicación van fuera del teléfono,** como paneles de cristal a tamaño de cuadro, porque dentro del teléfono isométrico no llegan a 40 px.
3. **SFX sintetizados en código** (sin biblioteca de terceros), un cue por movimiento visible.
4. **Sin logo ni fotos por ahora:** el nombre va en texto neutro (Space Grotesk) y la taza, el V60, la bolsa, el grano y los vasitos se construyen en código con volumen. Si llega el logo en alta, entra en el encabezado y en la end card sin redibujarlo.
5. **Carpeta propia `cata-cafe/`,** sin tocar el proyecto de Florería Roma del repo.

**Corrección a la fase 1:** adelantar la última línea a 14.2 s le quita espacio a "Así se vería la página de Cata Café.", que ya va justa (1.9 s de ventana para unos 2.4 s de frase). Por eso el guion de ElevenLabs lleva versiones cortas de reserva en la misma toma; se decide al medirla (ver `voz/guion_elevenlabs.md`).

## Especificaciones

- **Duración:** 1080 cuadros a 60 fps (18.0 s): 960 de pieza y 120 de end card. A 120 BPM un tiempo son 30 cuadros y un compás, 120.
- **Formatos:** 9:16 de 1080 × 1920 (principal) y re-layout real a 1:1 de 1080 × 1080. Master a 60 fps y H.264 a 30 fps para WhatsApp e Instagram.
- **Render:** función determinista `frame(t)`; 8 subcuadros por cuadro para el motion blur; una sola cámara y un solo campo líquido (SDF) para toda la pieza. Motor: Node + Playwright (WebGL) + ffmpeg.
- **Zonas seguras 9:16:** contenido clave entre y 250 e y 1580. Texto de interfaz de 40 px o más; kinetic type de 96 px o más.
- **Paleta:** fondo #120E0B; terracota #B65832 (borde #A03D28, luz #C26939, medidos en la captura del logo); crema #FBF3D5; café líquido #3A1E10 con brillo #8A4A22; kraft #B89468 solo como material. Sin azules.
- **Tipografía:** Space Grotesk (kinetic type y nombre provisional) e Inter (interfaz). Locales, licencia OFL.
- **Cristal:** blur real de 32 px del fondo, saturación 140 %, borde de 1 px crema al 22 %, ruido 2 %, brillo especular fijo arriba-izquierda.
- **Luz:** fija arriba-izquierda en toda la pieza; sombras de contacto que crecen con la altura del objeto.
- **Trazo:** línea de café de 10 px (4 px en la punta) con volumen: brillo, borde oscuro y menisco. Es el único elemento que nunca desaparece.
- **3D, solo tres toques:** la bolsa con grano (compás 4), el teléfono isométrico a 30° (compás 6) y el giro final de cámara (compás 8).

## Qué se lee en pantalla (todo verificado)

| Dónde | Texto |
|---|---|
| Encabezado | Cata Café · Orgánico, cooperativo y de pueblos originarios |
| Métodos | V60 (los otros dos paneles son objetos sin texto) |
| Café en grano o molido | Canela · Medio · Medio alto · City · Vienés |
| Tarjeta | Cliente frecuente (puntos como formas, sin números ni reglas) |
| Botón | Hacer pedido |
| Chips | Lun–Sáb 7:30–16:00 · Dom 7:30–15:00 / Mercado Terán · Módulo IV |
| Ruta | Entrada principal · Pasaje Arteaga · Módulo de cristal |
| End card | Demo de cortesía de Elevate Negocios · pieza no oficial |

Nada de precios, teléfono, reseñas, seguidores, personas, zine ni ilustración de la manga. Los precios del menú kraft son rayas neutras.

## Kinetic type

Por glifo, stagger de 25 ms, máximo 3 palabras a la vez. Los cuadros exactos se amarran a la palabra de la voz en la fase 3.

| Texto | Aterriza en | Coreografía |
|---|---|---|
| UN SOLO TRAZO | "un solo trazo" (L1, hacia f110–160) | Cada palabra sale del anillo; "TRAZO" se escribe con el propio trazo |
| UNA PÁGINA | "página" (L2) | Sube con el scroll y se queda pegada al encabezado un tiempo |
| EN EL CELULAR | "celular" (L3, hacia f690–715) | Entra en profundidad y se vuelve el borde del teléfono |
| Cata Café | "Cata Café" (L4) y cierre | Lo escribe el trazo al recogerse |

Los nombres de los tuestes y los chips son interfaz, no kinetic type.

## Línea de tiempo (cuadros a 60 fps)

### Compás 1 · Hook · f0–119
- **f0** Golpe. La gota impacta el campo líquido; corona de salpicadura f0–18.
- **f6–54** El anillo se expande y su SDF se convierte en el primer panel de cristal (círculo → rectángulo redondeado).
- **f24** Entra L1.
- **f60–119** Cámara: push-in lento del 100 al 106 %. "UN SOLO TRAZO" en su palabra.
- Música: sub grave y pad.

### Compás 2 · Encabezado · f120–239
- **f120–150** La gota rebota del campo y se estira hacia arriba en un hilo.
- **f126–170** Aparece el V60 de cristal (cono con costillas, grosor y refracción) arriba del hilo; sombra de contacto.
- **f150–228** El hilo dibuja el contorno del encabezado: "Cata Café" (f168–204, por glifo) y la descripción (f198–228).
- Cámara: baja 120 px siguiendo el hilo.

### Compás 3 · Métodos · f240–359
- **f240** El hilo baja y la página se desplaza con él. Ticks de scroll en f240, f270 y f300.
- **f246** Entra L2. "UNA PÁGINA" en su palabra.
- **f252 / f270 / f288** Tres paneles de cristal; el primero dice "V60" y lleva el dripper; los otros dos llevan una Chemex y una prensa francesa como objetos, sin texto.
- **f300–359** El hilo pasa por detrás de los paneles y se ve desenfocado a través del cristal.
- Música: entra el pluck.

### Compás 4 · Café en grano o molido · f360–479
- **f360–400** Bolsa de kraft con grano (3D): entra girando de 25° a −10°; sombra de contacto que crece.
- **f384–432** El trazo la rodea una vuelta.
- **f432–450** El trazo se parte en cinco.
- **f438 / f446 / f454 / f462 / f470** Cinco vasitos de vidrio con grano, del más claro al más oscuro, cada uno con su nombre.
- **f474** Entra L3.

### Compás 5 · Cliente frecuente · f480–599
- **f480–520** La tarjeta sale de la barra (mostrador de madera con canto y grosor).
- **f520–570** Vuela, gira 12° y aterriza en la página como panel; brillo que la recorre f570–599.
- Puntos: círculos con forma de grano, sin números.
- Música: entra el shaker.

### Compás 6 · Revelación · f600–719 (teléfono completo en f720)
- **f600–660** Último tramo de scroll hasta el botón "Hacer pedido".
- **f660–719** Lift. La cámara se aleja; el trazo se vuelve el contorno del teléfono (SDF). "EN EL CELULAR" en su palabra. Riser.
- **f720** El teléfono queda en isométrico a 30° con la página completa: encabezado, métodos, tuestes, tarjeta y botón.

### Compás 7 · Pedido, horario y ubicación · f720–839
- **f720** Lift pleno de la música.
- **f744** Entra L4.
- **f750** Pulsación en "Hacer pedido"; onda de contacto f750–790. Sin número visible.
- **f768** Chip de horario. **f786** Chip de ubicación. Los dos fuera del teléfono, a tamaño de cuadro.
- **f792–834** El trazo dibuja la mini ruta: Entrada principal (f798), Pasaje Arteaga (f813), Módulo de cristal (f828).

### Compás 8 · Cierre · f840–959
- **f840–870** Respiro: solo pad. Paneles, chips y teléfono se recogen en una sola línea (SDF).
- **f870** Entra L5 (se ajusta al medir la toma).
- **f870–936** El trazo escribe "Cata Café".
- **f870–950** Giro de cámara de 14° alrededor del nombre (3D); el trazo muestra grosor y brillo.
- **f960** Golpe grave y corte a la end card.

### End card · f960–1079
- Fondo #120E0B, "Demo de cortesía de Elevate Negocios · pieza no oficial" en Inter de 44 px, en dos renglones. Cola del golpe.

## Re-layout 1:1

- Compases 1 a 5: los paneles se acomodan en horizontal (tres métodos en fila, cinco vasitos en una sola fila) y el hilo baja por el tercio izquierdo.
- Compases 6 y 7: teléfono a la izquierda (46 % del ancho); chips y ruta apilados a la derecha.
- Compás 8 y end card: nombre centrado, texto legal en dos renglones.

## Sonido

Mínimo 72 cues: compás 1, 8 (impacto, corona, anillo, panel, 3 de tipo, sub); compás 2, 9; compás 3, 10; compás 4, 12; compás 5, 8; compás 6, 8; compás 7, 11; compás 8, 5; end card, 1. Mezcla: voz a −16 LUFS, música 12 dB o más por debajo de cada palabra, master a −14 LUFS y −1.25 dBTP. Stems de voz, música y SFX.

## Pendiente de confirmar con el dueño

Vigencia del horario y la ubicación, la tarjeta de puntos (la voz la menciona), si el 449 309 55 24 es WhatsApp y el logo en alta.
