// Objetos con volumen dibujados en código. Luz fija arriba-izquierda. Todos se dibujan en coordenadas locales.
'use strict';
const ROAST = [['Canela', '#A9743F'], ['Medio', '#8B5731'], ['Medio alto', '#6B4023'], ['City', '#48281B'], ['Vienés', '#2D1912']];

function local(c, m, x, y, s, rot, fn) { c.save(); setM(c, m); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s, s); fn(); c.restore(); }
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, 7); }
function contact(c, x, y, rx, ry, a = 0.5) { // sombra de contacto, desplazada a la derecha
  const g = c.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save(); c.translate(x + rx * 0.12, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; ell(c, x, y, rx, rx); c.fill(); c.restore();
}

function bean(c, x, y, r, rot, color, oily = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const g = c.createRadialGradient(-r * 0.35, -r * 0.3, r * 0.05, 0, 0, r * 1.1);
  g.addColorStop(0, mixc(color, '#FFE2BD', 0.35 + oily * 0.2)); g.addColorStop(0.45, color); g.addColorStop(1, mixc(color, '#000000', 0.6));
  ell(c, 0, 0, r, r * 0.68); c.fillStyle = g; c.fill();
  c.beginPath(); c.moveTo(-r * 0.78, 0.02 * r); c.bezierCurveTo(-r * 0.3, -r * 0.22, r * 0.3, r * 0.22, r * 0.78, -0.02 * r);
  c.lineWidth = r * 0.13; c.strokeStyle = mixc(color, '#000000', 0.7); c.lineCap = 'round'; c.stroke();
  c.restore();
}

// Dripper V60 de vidrio. Origen: punta inferior (por donde cae el hilo). Alto ≈ 290.
function v60(c, f = 0) {
  const RW = 190, top = -290, coneB = -92;
  contact(c, 0, -20, 150, 16, 0.35);
  // base (plato) con grosor
  const gb = c.createLinearGradient(-130, 0, 130, 0); gb.addColorStop(0, 'rgba(255,246,225,0.55)'); gb.addColorStop(0.3, 'rgba(255,246,225,0.16)'); gb.addColorStop(1, 'rgba(255,246,225,0.07)');
  ell(c, 0, -62, 128, 20); c.fillStyle = 'rgba(20,10,6,0.55)'; c.fill();
  ell(c, 0, -70, 128, 20); c.fillStyle = gb; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,246,225,0.6)'; c.stroke();
  // cuello y boquilla
  c.beginPath(); c.moveTo(-34, coneB); c.lineTo(34, coneB); c.lineTo(20, -40); c.lineTo(9, 0); c.lineTo(-9, 0); c.lineTo(-20, -40); c.closePath();
  c.fillStyle = 'rgba(255,246,225,0.14)'; c.fill(); c.strokeStyle = 'rgba(255,246,225,0.45)'; c.stroke();
  // filtro de papel asomando
  c.beginPath(); c.moveTo(-RW - 6, top - 6); c.quadraticCurveTo(0, top - 44, RW + 6, top - 6); c.lineTo(RW - 8, top + 26); c.lineTo(-RW + 8, top + 26); c.closePath();
  const gp = c.createLinearGradient(-RW, 0, RW, 0); gp.addColorStop(0, '#FFF8E6'); gp.addColorStop(1, '#C9B892'); c.fillStyle = gp; c.fill();
  // cono de vidrio
  c.beginPath(); c.moveTo(-RW, top); c.lineTo(RW, top); c.lineTo(40, coneB); c.lineTo(-40, coneB); c.closePath();
  const gc = c.createLinearGradient(-RW, 0, RW, 0);
  gc.addColorStop(0, 'rgba(255,246,225,0.42)'); gc.addColorStop(0.18, 'rgba(255,246,225,0.10)'); gc.addColorStop(0.7, 'rgba(120,60,30,0.22)'); gc.addColorStop(1, 'rgba(255,246,225,0.20)');
  c.fillStyle = gc; c.fill();
  // café dentro (se ve a través del vidrio)
  c.save(); c.clip();
  const gk = c.createLinearGradient(0, top + 70, 0, coneB); gk.addColorStop(0, 'rgba(92,44,20,0.85)'); gk.addColorStop(1, 'rgba(40,16,8,0.95)');
  c.fillStyle = gk; c.fillRect(-RW, top + 78, RW * 2, 200);
  // costillas en espiral
  c.strokeStyle = 'rgba(255,246,225,0.30)'; c.lineWidth = 3;
  for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(i * 38 - 24, top); c.quadraticCurveTo(i * 26 + 18, (top + coneB) / 2, i * 8, coneB); c.stroke(); }
  // brillo especular a la izquierda
  const gs = c.createLinearGradient(-RW, 0, -RW + 120, 0); gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gs.addColorStop(0.5, 'rgba(255,255,255,0)');
  c.fillStyle = gs; c.fillRect(-RW, top, 140, 220);
  c.restore();
  c.strokeStyle = 'rgba(255,246,225,0.55)'; c.lineWidth = 2.5; c.stroke();
  // boca: elipse con grosor
  ell(c, 0, top, RW, 26); c.lineWidth = 7; c.strokeStyle = 'rgba(255,246,225,0.85)'; c.stroke();
  ell(c, 0, top + 3, RW - 9, 20); c.fillStyle = 'rgba(70,32,14,0.55)'; c.fill();
  // asa
  c.beginPath(); c.moveTo(RW - 30, top + 30); c.bezierCurveTo(RW + 80, top + 20, RW + 70, top + 150, 96, top + 150);
  c.lineWidth = 16; c.strokeStyle = 'rgba(255,246,225,0.28)'; c.lineCap = 'round'; c.stroke();
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.stroke();
}

// Chemex: origen en el centro. Alto ≈ 200.
function chemex(c) {
  contact(c, 0, 100, 80, 12, 0.5);
  const sh = () => { c.beginPath(); c.moveTo(-52, -100); c.lineTo(52, -100); c.lineTo(14, -12); c.bezierCurveTo(40, 10, 72, 50, 72, 84); c.quadraticCurveTo(72, 100, 56, 100); c.lineTo(-56, 100); c.quadraticCurveTo(-72, 100, -72, 84); c.bezierCurveTo(-72, 50, -40, 10, -14, -12); c.closePath(); };
  sh(); const g = c.createLinearGradient(-72, 0, 72, 0); g.addColorStop(0, 'rgba(255,246,225,0.40)'); g.addColorStop(0.25, 'rgba(255,246,225,0.10)'); g.addColorStop(1, 'rgba(255,246,225,0.18)');
  c.fillStyle = g; c.fill(); c.save(); c.clip();
  const gk = c.createLinearGradient(0, 40, 0, 100); gk.addColorStop(0, '#7A3A18'); gk.addColorStop(1, '#2A1008'); c.fillStyle = gk; c.fillRect(-80, 44, 160, 60);
  ell(c, 0, 44, 62, 7); c.fillStyle = '#A65A2C'; c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-58, -100, 9, 200); c.restore();
  sh(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,246,225,0.6)'; c.stroke();
  // collar de madera con cordón
  c.beginPath(); c.moveTo(-27, -40); c.lineTo(27, -40); c.lineTo(30, 14); c.lineTo(-30, 14); c.closePath();
  const gw = c.createLinearGradient(-30, 0, 30, 0); gw.addColorStop(0, '#D9A66B'); gw.addColorStop(0.5, '#9C6A3A'); gw.addColorStop(1, '#5E3A1C'); c.fillStyle = gw; c.fill();
  c.fillStyle = '#3A2010'; c.fillRect(-30, -16, 60, 5); ell(c, 0, -13, 6, 6); c.fillStyle = '#E8C99A'; c.fill();
}

// Prensa francesa: origen en el centro. Alto ≈ 210.
function prensa(c) {
  contact(c, 0, 104, 78, 12, 0.5);
  // asa
  c.beginPath(); c.moveTo(52, -50); c.bezierCurveTo(108, -50, 108, 60, 52, 60); c.lineWidth = 14; c.strokeStyle = '#1C1412'; c.lineCap = 'round'; c.stroke();
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,246,225,0.35)'; c.stroke();
  // vaso
  const g = c.createLinearGradient(-56, 0, 56, 0); g.addColorStop(0, 'rgba(255,246,225,0.42)'); g.addColorStop(0.22, 'rgba(255,246,225,0.10)'); g.addColorStop(1, 'rgba(255,246,225,0.2)');
  rr(c, -56, -70, 112, 170, 8); c.fillStyle = g; c.fill(); c.save(); c.clip();
  const gk = c.createLinearGradient(0, -20, 0, 100); gk.addColorStop(0, '#6E3416'); gk.addColorStop(1, '#261008'); c.fillStyle = gk; c.fillRect(-56, -22, 112, 130);
  c.fillStyle = '#C9C2B4'; c.fillRect(-56, -30, 112, 9); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-46, -70, 9, 170); c.restore();
  rr(c, -56, -70, 112, 170, 8); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,246,225,0.6)'; c.stroke();
  // armazón metálico
  const gm = c.createLinearGradient(-60, 0, 60, 0); gm.addColorStop(0, '#F4EEE0'); gm.addColorStop(0.4, '#8F887B'); gm.addColorStop(1, '#4A453D');
  c.fillStyle = gm; rr(c, -60, 84, 120, 18, 5); c.fill(); rr(c, -60, -78, 120, 14, 5); c.fill();
  // tapa y émbolo
  c.fillStyle = gm; c.fillRect(-3, -112, 6, 40); ell(c, 0, -112, 15, 11); c.fill();
  c.beginPath(); c.moveTo(-58, -78); c.quadraticCurveTo(0, -104, 58, -78); c.closePath(); c.fill();
}

// Bolsa de kraft con grano (toque 3D): gira sobre el eje vertical `yaw` (rad). Origen: centro de la base.
function bolsa(c, yaw, f) {
  const Wd = 250, Dp = 120, Ht = 380, cs = Math.cos(yaw), sn = Math.sin(yaw);
  const pr = (x, y, z) => [x * cs + z * sn, -y + (z * cs - x * sn) * 0.22]; // proyección oblicua
  contact(c, 10, 6, 210, 34, 0.6);
  const face = (pts, fill) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = fill; c.fill(); };
  const hw = Wd / 2, hd = Dp / 2;
  const side = sn > 0 ? -1 : 1; // cara lateral visible
  const shadeS = sn > 0 ? '#C9A679' : '#6E5334';
  // lateral
  const s0 = pr(side * hw, 0, hd), s1 = pr(side * hw, 0, -hd), s2 = pr(side * hw, Ht, -hd * 0.25), s3 = pr(side * hw, Ht, hd * 0.25);
  face([s0, s1, s2, s3], shadeS);
  // frente
  const a = pr(-hw, 0, hd), b = pr(hw, 0, hd), d = pr(-hw, Ht, hd * 0.25), e = pr(hw, Ht, hd * 0.25);
  const gf = c.createLinearGradient(a[0], 0, b[0], 0); gf.addColorStop(0, '#D2B084'); gf.addColorStop(0.5, '#B89468'); gf.addColorStop(1, '#8E6E48');
  face([a, b, e, d], gf);
  // pliegue superior enrollado
  const t0 = pr(-hw, Ht + 34, 0), t1 = pr(hw, Ht + 34, 0);
  face([d, e, t1, t0], '#A5825A'); c.lineWidth = 2; c.strokeStyle = 'rgba(60,36,16,0.5)'; c.beginPath(); c.moveTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.stroke();
  // arrugas del papel y sello redondo sin texto (forma neutra)
  c.save(); c.transform((b[0] - a[0]) / Wd, (b[1] - a[1]) / Wd, 0, 1, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  c.strokeStyle = 'rgba(70,45,22,0.22)'; c.lineWidth = 2;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-hw + 12 + hash(i) * 30, -40 - i * 62); c.quadraticCurveTo(hash(i + 9) * 60 - 30, -60 - i * 62, hw - 14, -34 - i * 64); c.stroke(); }
  const gs = c.createRadialGradient(-18, -232, 6, 0, -214, 70); gs.addColorStop(0, '#D0703F'); gs.addColorStop(1, '#9C3F22');
  ell(c, 0, -214, 66, 66); c.fillStyle = gs; c.fill();
  c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(-hw, -Ht, 34, Ht);
  c.restore();
  // grano al pie
  [[-150, 14, 0.4], [-112, 30, 2.1], [-170, 34, 1.2], [150, 22, 0.9], [118, 36, 2.7], [176, 40, 0.2], [-60, 40, 1.7], [40, 44, 2.3]].forEach((p, i) => bean(c, p[0], p[1], 17, p[2], ROAST[2 + (i % 2)][1]));
}

// Vasito de vidrio con grano. Origen: centro. Alto ≈ 92.
function vasito(c, color, idx) {
  contact(c, 0, 46, 54, 9, 0.5);
  const body = () => { c.beginPath(); c.moveTo(-44, -40); c.lineTo(44, -40); c.lineTo(36, 44); c.quadraticCurveTo(0, 52, -36, 44); c.closePath(); };
  body(); c.fillStyle = 'rgba(255,246,225,0.10)'; c.fill();
  c.save(); body(); c.clip();
  for (let i = 0; i < 26; i++) { const x = (hash(idx * 31 + i) - 0.5) * 78, y = -30 + hash(idx * 17 + i * 3) * 76; bean(c, x, y, 13, hash(i * 7 + idx) * 6.3, color, idx === 4 ? 1 : 0); }
  const g = c.createLinearGradient(-44, 0, 44, 0); g.addColorStop(0, 'rgba(255,255,255,0.42)'); g.addColorStop(0.2, 'rgba(255,255,255,0.04)'); g.addColorStop(0.8, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0.22)');
  c.fillStyle = g; c.fillRect(-46, -42, 92, 96); c.restore();
  body(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,246,225,0.55)'; c.stroke();
  // boca con granos encima
  ell(c, 0, -40, 44, 11); c.fillStyle = mixc(color, '#000000', 0.45); c.fill();
  for (let i = 0; i < 7; i++) bean(c, (i - 3) * 11 + (hash(i + idx) - 0.5) * 6, -42 - hash(i * 3 + idx) * 5, 12, hash(i * 5 + idx * 2) * 6.3, color, idx === 4 ? 1 : 0);
  ell(c, 0, -40, 44, 11); c.lineWidth = 3; c.strokeStyle = 'rgba(255,246,225,0.8)'; c.stroke();
}

// Tarjeta de cliente frecuente: w×h con grosor. Origen: esquina superior izquierda. `sheen` 0..1 recorre el brillo.
function tarjeta(c, w, h, f, textF0, sheen) {
  const r = 34;
  rr(c, 5, 9, w, h, r); c.fillStyle = '#5A2410'; c.fill(); // canto
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#CF6C3C'); g.addColorStop(0.55, COL.terra); g.addColorStop(1, '#98401F');
  rr(c, 0, 0, w, h, r); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  c.globalAlpha = 0.06; c.fillStyle = c.createPattern(noise, 'repeat'); c.fillRect(0, 0, w, h); c.globalAlpha = 1;
  if (sheen > 0 && sheen < 1) { const x = lerp(-w * 0.4, w * 1.2, sheen); const gs = c.createLinearGradient(x, 0, x + 180, 60); gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.5, 'rgba(255,240,215,0.42)'); gs.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gs; c.fillRect(0, 0, w, h); }
  c.restore();
  rr(c, 1.5, 1.5, w - 3, h - 3, r - 1); c.lineWidth = 2; const gb = c.createLinearGradient(0, 0, w * 0.5, h); gb.addColorStop(0, 'rgba(255,235,205,0.8)'); gb.addColorStop(0.4, 'rgba(255,235,205,0)'); c.strokeStyle = gb; c.stroke();
  gtext(c, 'Cliente frecuente', 50, 96, `600 54px ${IN}`, COL.crema, f, textF0);
  // puntos: formas de grano en bajo relieve, sin números ni reglas
  for (let i = 0; i < 8; i++) {
    const x = 84 + i * ((w - 168) / 7), y = h - 96;
    c.save(); c.translate(x, y); c.rotate(-0.5);
    ell(c, 1.5, 2.5, 30, 21); c.fillStyle = 'rgba(255,225,190,0.35)'; c.fill();
    ell(c, 0, 0, 30, 21); c.fillStyle = '#8A371A'; c.fill();
    c.beginPath(); c.moveTo(-23, 1); c.bezierCurveTo(-8, -7, 8, 7, 23, -1); c.lineWidth = 3; c.strokeStyle = 'rgba(40,12,4,0.7)'; c.stroke();
    c.restore();
  }
}

// Barra de madera (mostrador) con grosor. Origen: esquina superior izquierda de la cubierta. Ancho w.
function barra(c, w) {
  // cubierta (plano superior, más clara)
  const gt = c.createLinearGradient(0, 0, w, 0); gt.addColorStop(0, '#D7A870'); gt.addColorStop(1, '#A47443');
  c.beginPath(); c.moveTo(40, 0); c.lineTo(w - 40, 0); c.lineTo(w, 54); c.lineTo(0, 54); c.closePath(); c.fillStyle = gt; c.fill();
  // ranura de donde sale la tarjeta
  rr(c, w / 2 - 300, 20, 600, 12, 6); c.fillStyle = '#2A1508'; c.fill();
  // canto
  c.fillStyle = '#E6BE8A'; c.fillRect(0, 54, w, 10);
  // frente con tablas
  const gf = c.createLinearGradient(0, 64, 0, 520); gf.addColorStop(0, '#8E5F33'); gf.addColorStop(1, '#3E2412');
  c.fillStyle = gf; c.fillRect(0, 64, w, 460);
  for (let i = 1; i < 6; i++) { c.fillStyle = 'rgba(30,14,5,0.5)'; c.fillRect((w / 6) * i - 2, 64, 4, 460); c.fillStyle = 'rgba(255,220,170,0.12)'; c.fillRect((w / 6) * i + 2, 64, 2, 460); }
  for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(40,20,8,0.16)'; c.fillRect(hash(i) * w, 80 + hash(i + 5) * 380, 60 + hash(i + 2) * 90, 2); }
}
