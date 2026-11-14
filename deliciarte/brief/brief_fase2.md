# Brief de producción · DeliciArte Pastelería · Fase 2

Un solo plano continuo guiado por "la línea de betún": una línea crema con volumen de duya (tubo con brillo especular y sombra suave) que escribe la DA, se vuelve el círculo del logo, brota en rosetas, se hace el marco del celular, rodea cada pastel como listón y termina como subrayado del botón de WhatsApp. Los pasteles reales son los protagonistas; la línea los presenta.

La línea de tiempo exacta vive en `brief/timeline.mjs` (cuadros a 60 fps). La usan el render, los SFX y la música.

## Cambios al prompt (decisión de dirección)

1. **Los visuales se acomodan a la locución.** En el prompt, "Imagina todo esto en tu propia página" (8.20 s) caía sobre el muro de postres y "Y postres para cada antojo" (10.40 s) sobre los chips. Ahora el tramo 8–10 s es la página dentro del celular y el muro de postres se junta con los chips en 10–12 s. Así cada imagen corresponde a lo que dice la voz.
2. **Kinetic amarrado a la voz.** "A TU MEDIDA" no se dice en la voz, así que no se usa. Quedan: SABOR / inigualable · A TU GUSTO · DISEÑOS ÚNICOS / tu celebración · TU PROPIA / PÁGINA · CADA ANTOJO · DeliciArte / PASTELERÍA. Cada palabra aterriza en su palabra de la toma.
3. **La línea se corta en dos y cada mitad escribe una letra:** una la D y otra la A. La idea sigue siendo una sola línea, y así no hace falta un trazo invisible entre las dos letras.
4. **Las tarjetas se estampan en los kicks de 4.00, 4.50 y 5.00 s.** El celular termina de formarse a los 3.70 s; si las tarjetas entraran antes, se encimarían con él.
5. **La DA de la línea se dibuja grande (unos 620 px) y se funde en el anillo crema del logo**, que se ve a 640 px de diámetro (abajo del máximo de 700 px que da su resolución). El logo real solo aparece como asset 00: se revela con una máscara circular, se escala y se mueve.

## Especificaciones

- **Duración:** 1080 cuadros a 60 fps: 16 s de pieza y 2 s de end card. A 120 BPM, un tiempo dura 30 cuadros y un compás, 120.
- **Formatos:** 9:16 de 1080 × 1920 (principal) y re-layout real a 1:1 de 1080 × 1080. Master a 60 fps y H.264 a 30 fps.
- **Zonas seguras en 9:16:** nada importante arriba de y 250 ni debajo de y 1580.
- **Paleta:** fondo vino profundo #24080E con viñeta; vino de marca #7A1F2B; crema #F6EDE1 para la línea y la tipografía; arena #C9A27E para acentos; rosa betún #E8A0B4 solo en toques. Sin azul en el diseño.
- **Tipografía:** Jost (sans geométrica limpia, 400–600) para titulares y la interfaz, y Sacramento (script monolínea delgada, parecida a su neón y a su monograma) para el acento. Ambas OFL y locales.
- **Línea de betún:** campo de distancia (SDF) en GPU. Grosor 18 px en la DA y 6–8 px como marco o listón. Se sombrea como tubo: normal desde el gradiente del campo, luz fija arriba-izquierda, brillo especular y sombra de contacto suave. Todos los morphs interpolan dos campos de distancia, con un leve ruido líquido a la mitad del morph; ninguno es un fundido de opacidad.
- **Cristal:** el celular, los chips, el botón y las franjas de etiqueta desenfocan lo que tienen detrás (σ 34 px en el cuadro de 1080), saturación 140 %, borde de 1 px y grano del 2 %. Las fotos entran como paneles con grosor (bisel), reflejo en el borde y sombra de contacto que crece al aterrizar.
- **Isométrico:** tarjetas y paneles rotados 30° con cámara de FOV 22° (casi paralela), luz fija arriba-izquierda y sombras de contacto.
- **Cámara:** una sola cámara física para todo el plano: dolly, órbita al isométrico, travelling de parallax, pull-back y push-in. 8 subcuadros por cuadro (motion blur con obturador de 180° y antialias temporal).
- **Fotos:** nunca más grandes que su máximo en pantalla (`assets/assets_report.json`). La 04 va a 480 px como máximo y la 05 a 600.

## Guion visual (cuadros a 60 fps)

| Cuadros | Tiempo | Qué pasa | Voz y kinetic |
|---|---|---|---|
| f0–f29 | 0.00–0.50 | **Golpe.** En f0 la línea ya va cruzando en diagonal sobre el vino, con sub grave. En f24 se corta: la mitad derecha sale disparada y la izquierda se enrosca. | — |
| f30–f119 | 0.50–2.00 | **DA.** La mitad izquierda escribe la D (f34–f92) y la derecha regresa y escribe la A (f48–f100). Push-in lento. | L1 en f30. SABOR (sans, sube glifo por glifo) aterriza en "Sabor"; *inigualable* (script, se escribe con máscara) en "inigualable". |
| f120–f209 | 2.00–3.50 | **Logo y rosetas.** Morph SDF de la DA al anillo (f120–f146). El logo se revela dentro del anillo (f140–f168). El anillo brota en cinco rosetas (f166–f192), que se dilatan y revelan la foto 02 (f184–f212). Las rosetas se funden en el contorno de la pantalla y el cuerpo de cristal del celular se forma alrededor (f196–f222). | L2 en f180. |
| f210–f359 | 3.50–6.00 | **Tarjetas.** La cámara orbita al isométrico (f206–f246). Tres tarjetas de cristal salen de la pantalla y se estampan en los kicks: PASTELES PERSONALIZADOS (01) en f240, CUMPLEAÑOS (03) en f270 y CORAZÓN DE BETÚN (05) en f300. La línea rodea cada una como listón al aterrizar. | A TU GUSTO aterriza en "a tu gusto". |
| f360–f479 | 6.00–8.00 | **Parallax.** La cámara atraviesa las tarjetas; 06 (al frente) y 02 (atrás) flotan como paneles de cristal a distinta profundidad, con travelling lateral. La línea las rodea, primero una y luego la otra. | L3 en f360. DISEÑOS ÚNICOS y luego *tu celebración*. |
| f480–f599 | 8.00–10.00 | **Su página.** Pull-back: los paneles vuelan a la pantalla y se acomodan como su página (logo, "DeliciArte", "sabor inigualable", cuadrícula de pasteles). La línea dibuja el borde del celular. | L4 en f492. TU PROPIA / PÁGINA. |
| f600–f719 | 10.00–12.00 | **Catálogo y postres.** Tres chips de cristal (PASTELES · POSTRES · CAFÉ) salen del celular; la línea pasa entre ellos. En "postres" se activa ese chip y 07 y 04 suben y orbitan suave en isométrico. | L5 en f624. CADA ANTOJO. |
| f720–f839 | 12.00–14.00 | **WhatsApp.** Push-in: el botón de cristal "PIDE POR WHATSAPP" con su ícono sale al frente. La línea se vuelve su subrayado y late con el kick (f750, f780, f810). Toque en f780. | L6 en f744. |
| f840–f959 | 14.00–16.00 | **Cierre.** Pull-back: el contorno del celular se hace anillo (SDF) y el celular se cierra en el círculo del logo. Respiro musical. | L7 en f864. DeliciArte / PASTELERÍA. |
| f960–f1079 | 16.00–18.00 | **End card** sobre vino, con golpe grave en el corte: "Precios accesibles desde $1,000 pesos por tu página" (con $1,000 grande y la línea como subrayado), "Paquete de 3 videos promocionales: $1,500", "Elevate Negocios · Aguascalientes" y "Demo de cortesía de Elevate Negocios · pieza no oficial". | L8 en f978. |

## Textos en pantalla (todos verificados)

DeliciArte · Pastelería · sabor inigualable · Pasteles personalizados · Cumpleaños · Corazón de betún · Pastelitos cuchareables · Rollos de canela · PASTELES · POSTRES · CAFÉ · Pide por WhatsApp. No aparecen precios del negocio, teléfono, dirección, horario, usuario de Instagram, nombres de personajes ni de personas.

## 1:1

Re-layout, no recorte: celular de 800 px de alto al centro, kinetic a los lados en lugar de arriba y abajo, tarjetas en abanico horizontal y end card compacta.

## Música y sonido

- **Música:** original y hecha en código, a 120 BPM. Piano suave y celesta desde f0, pizzicato desde f120, cuerdas y bajo desde f240 y lift en f180, cuando aparece el celular. Respiro de f840 a f960 y golpe grave en f960.
- **SFX:** al menos 70 cues amarrados a los eventos de `timeline.mjs`: trazo, corte, brotes, estampados, cristal, parallax, chips, clic y pulsos.
- **Mezcla:** voz cerca de −16 LUFS; master a −14 LUFS y −1.25 dBTP. La música va al menos 12 dB debajo de cada palabra.
