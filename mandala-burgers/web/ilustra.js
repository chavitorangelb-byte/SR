// Ilustraciones en código (SVG): burgers por color de pan y un mandala genérico de pétalos.
// Nada de esto copia el logo: son formas propias de la pieza.
(function () {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const A = hex(a), B = hex(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  let uid = 0;

  // Capa extra según el platillo (lo que su menú dice que lleva cada una)
  const EXTRAS = {
    pepinillos: () => [48, 84, 120, 152].map((x, i) => `<g transform="translate(${x} ${121 + (i % 2) * 2})"><ellipse rx="15" ry="5.5" fill="#6FA53A"/><ellipse rx="10" ry="3" fill="#9CCB5A"/></g>`).join(''),
    tocino: () => `<path d="M24 121 q12 -9 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 v8 q-12 9 -24 0 t-24 0 t-24 0 t-24 0 t-24 0 t-24 0 t-24 0z" fill="#B8402E"/><path d="M24 123 q12 -9 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#F2B49A" stroke-width="2.4" stroke-linecap="round"/>`,
    pina: () => `<rect x="34" y="115" width="152" height="13" rx="6.5" fill="#F7D24B"/><path d="M52 115v13M76 115v13M100 115v13M124 115v13M148 115v13M170 115v13" stroke="#D9A521" stroke-width="2"/>`,
    guacamole: () => `<path d="M28 126 q8 -14 24 -10 q10 -8 24 -2 q14 -8 26 0 q14 -8 28 0 q14 -6 24 2 q14 -2 18 10 z" fill="#9BCB4E"/><circle cx="70" cy="120" r="2.4" fill="#D6232A"/><circle cx="128" cy="118" r="2.4" fill="#D6232A"/><circle cx="160" cy="122" r="2" fill="#F5F2EE"/>`,
    aros: () => [56, 110, 164].map((x) => `<ellipse cx="${x}" cy="120" rx="27" ry="8" fill="none" stroke="#E0A040" stroke-width="7"/><ellipse cx="${x}" cy="118.500" rx="27" ry="8" fill="none" stroke="#F3C877" stroke-width="2"/>`).join(''),
    cereza: () => `<rect x="34" y="117" width="152" height="11" rx="5.5" fill="#F7D24B"/><circle cx="64" cy="115" r="8" fill="#C2183A"/><circle cx="61" cy="112" r="2.4" fill="#fff" opacity=".6"/><circle cx="150" cy="115" r="8" fill="#C2183A"/><circle cx="147" cy="112" r="2.4" fill="#fff" opacity=".6"/>`,
    pepperoni: () => [50, 90, 130, 170].map((x) => `<ellipse cx="${x}" cy="121" rx="17" ry="6" fill="#B5321F"/><circle cx="${x - 5}" cy="120" r="1.6" fill="#E88A6A"/><circle cx="${x + 6}" cy="122" r="1.4" fill="#E88A6A"/>`).join(''),
    manzana: () => [46, 88, 130, 172].map((x) => `<path d="M${x - 18} 126 a18 12 0 0 1 36 0z" fill="#F3E3B0"/><path d="M${x - 18} 126 a18 12 0 0 1 36 0" fill="none" stroke="#D6232A" stroke-width="3"/>`).join(''),
    bbq: () => `<path d="M30 126 q6 -12 20 -9 q12 -9 26 -1 q14 -8 28 0 q14 -8 26 0 q12 -6 22 1 q12 0 16 9z" fill="#C8792E"/><path d="M44 121 q30 8 60 0 t64 0" fill="none" stroke="#7A2A12" stroke-width="3.500" stroke-linecap="round"/>`,
    buffalo: () => `<path d="M30 126 q6 -12 20 -9 q12 -9 26 -1 q14 -8 28 0 q14 -8 26 0 q12 -6 22 1 q12 0 16 9z" fill="#E0792C"/><path d="M44 121 q30 8 60 0 t64 0" fill="none" stroke="#F5F2EE" stroke-width="3.500" stroke-linecap="round"/>`,
  };

  // Burger plano con degradados, brillo, semillas y sombra de contacto. pan = color del pan (hex).
  window.burgerSVG = function (pan, extra, opts) {
    const o = Object.assign({ sombra: true }, opts || {});
    const id = 'b' + (++uid);
    const claro = mix(pan, '#ffffff', 0.34), oscuro = mix(pan, '#1a0a12', 0.3), base = mix(pan, '#1a0a12', 0.14);
    const queso = pan.toUpperCase() === '#F5C455' ? '#FF9838' : '#FFC23C';
    const semillas = [[70, 62, -20], [96, 44, 12], [126, 42, -8], [152, 58, 24], [84, 82, 8], [112, 66, -14], [140, 80, 10], [60, 88, 28], [164, 86, -22]]
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="2.5" transform="rotate(${r} ${x} ${y})" fill="#FFF4DA"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" class="burger" aria-hidden="true">
<defs>
<linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${claro}"/><stop offset=".55" stop-color="${pan}"/><stop offset="1" stop-color="${oscuro}"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${oscuro}"/></linearGradient>
<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A4630"/><stop offset="1" stop-color="#43220F"/></linearGradient>
<radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
${o.sombra ? `<ellipse cx="110" cy="188" rx="92" ry="10" fill="url(#${id}s)"/>` : ''}
<path d="M34 152h152a6 6 0 0 1 6 6v4a24 24 0 0 1-24 24H52a24 24 0 0 1-24-24v-4a6 6 0 0 1 6-6z" fill="url(#${id}b)"/>
<rect x="24" y="130" width="172" height="27" rx="13.500" fill="url(#${id}p)"/>
<path d="M36 137h92M140 137h40" stroke="#9A6044" stroke-width="2.600" stroke-linecap="round" opacity=".7"/>
<path d="M22 127h176l-16 9q-5 3-8 9q-4 9-9 0q-4-9-14-9h-36q-8 0-11 9q-4 12-9 0q-3-9-12-9H56q-7 0-9 6q-3 8-7 0q-2-6-8-9z" fill="${queso}"/>
${extra && EXTRAS[extra] ? EXTRAS[extra]() : ''}
<path d="M16 116q8-13 20-5q10-12 22-2q12-11 24 0q12-11 24 0q12-11 24 0q12-10 22 2q12-8 20 5q4 8-6 8H22q-10 0-6-8z" fill="#7DB93B"/>
<path d="M24 114q8-8 16 0q10-9 20 0q11-9 22 0q11-9 22 0q11-9 22 0q10-9 20 0q8-8 16 0" fill="none" stroke="#B5E25E" stroke-width="3" stroke-linecap="round"/>
<path d="M30 110C28 54 74 20 110 20s82 34 80 90a5 5 0 0 1-5 5H35a5 5 0 0 1-5-5z" fill="url(#${id}t)"/>
<path d="M52 74C60 48 84 34 104 32" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".38"/>
${semillas}
</svg>`;
  };

  // Mandala genérico: anillos de pétalos alargados y un anillo de puntos. Colores de la paleta, sin azul ni turquesa.
  window.mandalaSVG = function (opts) {
    const o = Object.assign({ fondo: 'none' }, opts || {});
    const anillo = (n, r0, largo, ancho, color, giro, op) => Array.from({ length: n }, (_, i) => {
      const a = giro + (360 / n) * i;
      return `<path transform="rotate(${a})" d="M0 ${-r0} C${ancho} ${-r0 - largo * 0.35} ${ancho} ${-r0 - largo * 0.75} 0 ${-r0 - largo} C${-ancho} ${-r0 - largo * 0.75} ${-ancho} ${-r0 - largo * 0.35} 0 ${-r0}z" fill="${color}" opacity="${op}"/>`;
    }).join('');
    const puntos = (n, r, rad, color) => Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n;
      return `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="${rad}" fill="${color}"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" class="mandala" aria-hidden="true">
${o.fondo !== 'none' ? `<rect x="-200" y="-200" width="400" height="400" fill="${o.fondo}"/>` : ''}
${anillo(16, 118, 66, 17, '#8E3FC9', 0, 0.9)}
${anillo(16, 112, 52, 13, '#E872C0', 11.25, 0.95)}
${anillo(12, 78, 54, 18, '#F0784C', 0, 1)}
${anillo(12, 74, 40, 13, '#F5C455', 15, 1)}
${puntos(24, 196, 3.2, '#A8D44A')}
${puntos(12, 68, 4, '#A8D44A')}
</svg>`;
  };
})();
