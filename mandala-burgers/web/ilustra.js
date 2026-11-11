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

  // Iconos de la lista: hotdog, papas y aros de cebolla.
  window.iconoSVG = function (tipo) {
    const cab = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" class="icono" aria-hidden="true">';
    if (tipo === 'hotdog') return cab + `<ellipse cx="60" cy="90" rx="50" ry="6" fill="#000" opacity=".16"/>
<path d="M12 56a14 14 0 0 1 14-14h68a14 14 0 0 1 14 14v6a22 22 0 0 1-22 22H34a22 22 0 0 1-22-22z" fill="#E9A54A"/>
<rect x="4" y="34" width="112" height="26" rx="13" fill="#C4472E"/><path d="M14 42h74" stroke="#E97C5E" stroke-width="4" stroke-linecap="round"/>
<path d="M16 47q9-12 18 0t18 0t18 0t18 0t16 0" fill="none" stroke="#F5C455" stroke-width="5" stroke-linecap="round"/>
<path d="M12 60h96v2a22 22 0 0 1-22 22H34a22 22 0 0 1-22-22z" fill="#F2BC66"/><circle cx="36" cy="72" r="2" fill="#FFF4DA"/><circle cx="62" cy="76" r="2" fill="#FFF4DA"/><circle cx="86" cy="70" r="2" fill="#FFF4DA"/></svg>`;
    if (tipo === 'aros') return cab + `<ellipse cx="60" cy="90" rx="46" ry="6" fill="#000" opacity=".16"/>` +
      [[42, 60, 26], [78, 58, 24], [60, 38, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#D9952F" stroke-width="12"/><circle cx="${x}" cy="${y - 2}" r="${r}" fill="none" stroke="#F3C877" stroke-width="4"/>`).join('') + '</svg>';
    return cab + `<ellipse cx="60" cy="92" rx="40" ry="6" fill="#000" opacity=".16"/>` +
      [[34, 8, -14], [46, 2, -6], [58, 6, 2], [70, 0, 8], [82, 8, 16], [52, 14, -2], [66, 12, 6]].map(([x, y, r]) => `<rect x="${x}" y="${y}" width="10" height="58" rx="3" transform="rotate(${r} ${x + 5} 60)" fill="#F5C455"/><rect x="${x}" y="${y}" width="4" height="58" rx="2" transform="rotate(${r} ${x + 5} 60)" fill="#FBE08E"/>`).join('') +
      `<path d="M26 44h68l-8 44a6 6 0 0 1-6 5H40a6 6 0 0 1-6-5z" fill="#D6232A"/><path d="M26 44h68l-2 10H28z" fill="#F0554F"/><circle cx="60" cy="70" r="9" fill="#F5F2EE"/></svg>`;
  };

  // Fogata personal con bombones (canvas). t en segundos; tueste 0..1 dora los bombones.
  window.dibujarFogata = function (c, w, h, t, tueste) {
    const cx = w / 2, base = h * 0.66, u = Math.min(w / 360, h / 262);
    c.save();
    const g = c.createRadialGradient(cx, base - 50 * u, 0, cx, base - 50 * u, 190 * u);
    g.addColorStop(0, 'rgba(240,120,76,.55)'); g.addColorStop(0.5, 'rgba(240,120,76,.14)'); g.addColorStop(1, 'rgba(240,120,76,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const llama = (ancho, alto, col, fase, dx) => {
      const k = Math.sin(t * 5.2 + fase), k2 = Math.sin(t * 8.1 + fase * 2.3);
      const a = ancho * u, al = alto * u * (1 + 0.1 * k2), x = cx + dx * u, px = x + k * 9 * u;
      c.beginPath(); c.moveTo(x - a, base - 8 * u);
      c.bezierCurveTo(x - a * 1.25, base - al * 0.5, x - a * 0.3 + k * 5 * u, base - al * 0.72, px, base - al);
      c.bezierCurveTo(x + a * 0.5 + k * 5 * u, base - al * 0.7, x + a * 1.25, base - al * 0.45, x + a, base - 8 * u);
      c.closePath(); c.fillStyle = col; c.fill();
    };
    llama(44, 120, '#F0784C', 0, -8); llama(34, 96, '#F0784C', 2.1, 22); llama(30, 92, '#F5A04C', 4.0, -26);
    llama(26, 78, '#F5C455', 1.2, 4); llama(15, 48, '#FFF1C9', 3.3, 2);
    // brasero
    c.fillStyle = '#2B2B31'; c.beginPath(); c.moveTo(cx - 74 * u, base - 14 * u); c.lineTo(cx + 74 * u, base - 14 * u); c.lineTo(cx + 54 * u, base + 26 * u); c.lineTo(cx - 54 * u, base + 26 * u); c.closePath(); c.fill();
    c.fillStyle = '#44444C'; c.beginPath(); c.roundRect(cx - 82 * u, base - 22 * u, 164 * u, 14 * u, 7 * u); c.fill();
    c.fillStyle = 'rgba(245,196,85,.9)'; c.beginPath(); c.roundRect(cx - 60 * u, base - 19 * u, 60 * u, 3 * u, 2 * u); c.fill();
    // bombones en su palito
    const tu = Math.max(0, Math.min(1, tueste));
    const mez = (a, b, k) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')';
    [[-1, 0], [1, 0.6]].forEach(([lado, fase]) => {
      const bx = cx + lado * (58 + Math.sin(t * 1.3 + fase) * 4) * u, by = base - (118 + Math.sin(t * 1.7 + fase) * 5) * u;
      c.strokeStyle = '#C9A26A'; c.lineWidth = 5 * u; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx + lado * 170 * u, base - 30 * u); c.lineTo(bx, by); c.stroke();
      c.save(); c.translate(bx, by); c.rotate(lado * -0.5);
      c.fillStyle = mez([255, 250, 240], [226, 160, 84], tu); c.beginPath(); c.roundRect(-24 * u, -20 * u, 48 * u, 40 * u, 13 * u); c.fill();
      c.fillStyle = mez([255, 255, 255], [246, 205, 140], tu); c.beginPath(); c.roundRect(-18 * u, -15 * u, 22 * u, 9 * u, 5 * u); c.fill();
      c.globalAlpha = tu; c.fillStyle = '#8A4A1E'; c.beginPath(); c.roundRect(-24 * u, 6 * u, 48 * u, 14 * u, [0, 0, 13 * u, 13 * u]); c.fill(); c.globalAlpha = 1;
      c.restore();
    });
    // chispas lentas
    for (let i = 0; i < 9; i++) {
      const v = ((t * (0.16 + (i % 4) * 0.035) + i * 0.137) % 1), x = cx + Math.sin(i * 2.4 + v * 5) * (30 + i * 7) * u, y = base - 40 * u - v * 150 * u;
      c.globalAlpha = (1 - v) * 0.9; c.fillStyle = i % 2 ? '#F5C455' : '#FFD9A0'; c.beginPath(); c.arc(x, y, (2.6 - v * 1.4) * u, 0, 7); c.fill();
    }
    c.restore();
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
