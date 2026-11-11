// Línea de tiempo de Cata Café: una sola función determinista frame(f) para 9:16 y 1:1.
'use strict';
const ID = [1, 0, 0, 1, 0, 0];
let GP = null; // matriz global (colapso final)
{ const _setD = setD; setD = (c) => { _setD(c); if (GP) c.transform(...GP); };
  const _setM = setM; setM = (c, m) => { if (GP) { c.setTransform(S, 0, 0, S, 0, 0); c.transform(...GP); c.transform(...m); } else _setM(c, m); }; }

// ---------- layout por formato ----------
const LY = V ? {
  cam: [[0, flat(540, 380, 1)], [60, flat(540, 380, 1)], [119, flat(540, 374, 1.05)], [172, flat(540, 380, 1)], [236, flat(540, 380, 1)],
    [300, flat(540, 840, 1)], [356, flat(540, 840, 1)], [404, flat(540, 1330, 1)], [476, flat(540, 1330, 1)], [520, flat(540, 1930, 1)],
    [598, flat(540, 1930, 1)], [650, flat(540, 2060, 1)], [660, flat(540, 2060, 1)], [720, iso(305, 255, 0.46)], [742, iso(305, 255, 0.46)], [772, iso(70, 300, 0.42)], [960, iso(64, 294, 0.426), (t) => t]],
  kt1: [1200, 150, 1390, 190], kt2: [1300, 110, 1480, 190], kt3: [1340, 110, 1520, 180],
  chipX: 540, chipW: 500, chipY: [420, 620], routeY: [880, 1020, 1160], nameY: 930, nameW: 860, endY: 930,
} : {
  cam: [[0, flat(540, 262, 0.72)], [236, flat(540, 262, 0.72)], [300, flat(540, 920, 1)], [356, flat(540, 920, 1)], [404, flat(540, 1320, 1)],
    [476, flat(540, 1320, 1)], [520, flat(540, 1990, 1)], [598, flat(540, 1990, 1)], [650, flat(540, 2000, 1)], [660, flat(540, 2000, 1)],
    [720, iso(388, 70, 0.325)], [742, iso(388, 70, 0.325)], [772, iso(80, 100, 0.31)], [960, iso(76, 96, 0.313), (t) => t]],
  kt1: [810, 120, 965, 160], kt2: [770, 90, 910, 150], kt3: [900, 76, 1020, 130],
  chipX: 440, chipW: 580, chipY: [110, 290], routeY: [540, 680, 820], nameY: 520, nameW: 860, endY: 520,
};
CAMKEYS = LY.cam;

// ---------- página ----------
const PAN = {
  head: { x: 60, y: 60, w: 960, h: 340, r: 44 },
  mA: { x: 60, y: 440, w: 500, h: 520, r: 44, f0: 252, ax: 560, ay: 700 },
  mB: { x: 600, y: 440, w: 420, h: 250, r: 40, f0: 270, ax: 600, ay: 565 },
  mC: { x: 600, y: 710, w: 420, h: 250, r: 40, f0: 288, ax: 600, ay: 835 },
  roast: { x: 60, y: 1000, w: 960, h: 640, r: 44, f0: 348, ax: 60, ay: 1320 },
};
const CARD = { x: 110, y: 1700, w: 860, h: 340 }, BTN = { x: 110, y: 2110, w: 860, h: 140 };
const ROWY = (i) => 1100 + i * 112;

function headRect(f) {
  const a = eo(seg(f, 0, 30)), R = 170 * a, b = eio(seg(f, 24, 58));
  const hw = lerp(R, 480, b), hh = lerp(R, 170, b), r = lerp(R, 44, b);
  return { x: 540 - hw, y: 230 - hh, w: hw * 2, h: hh * 2, r, th: f < 30 ? lerp(16, 8, a) : lerp(8, 0, eio(seg(f, 44, 84))) };
}
function grown(p, f) {
  const t = seg(f, p.f0, p.f0 + 24); if (t <= 0) return null; const k = back(eo(t), 0.8);
  return { x: lerp(p.ax, p.x, k), y: lerp(p.ay, p.y, k), w: p.w * k, h: p.h * k, r: p.r * Math.min(1, k) };
}
const panelRect = (id, f) => (id === 'head' ? (f > 4 ? headRect(f) : null) : grown(PAN[id], f));

// hilo maestro (coordenadas de página)
const THREAD = prepPath([[540, -40], [540, 60], [540, 400], [552, 418], [580, 446], [580, 700], [580, 950], [560, 978], [300, 982], [60, 984], [30, 1010],
  [30, 1320], [30, 1630], [60, 1660], [540, 1662], [1020, 1660], [1050, 1690], [1050, 2140], [1040, 2176], [975, 2180]]);
const TKEY = [[130, 0], [150, 1], [228, 2], [246, 4], [300, 5], [340, 6], [354, 9], [362, 10], [420, 11], [470, 12], [482, 13], [500, 15], [560, 17], [606, 19]]
  .map(([f, i]) => [f, lenAtIndex(THREAD, i)]);
function keyed(K, f) { if (f <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (f <= K[i][0]) return lerp(K[i - 1][1], K[i][1], eio(seg(f, K[i - 1][0], K[i][0]))); return K[K.length - 1][1]; }

const LOOP = prepPath(Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * Math.PI * 2; return [245 + 205 * Math.cos(a), 1352 + 292 * Math.sin(a)]; }), 5);
const BRANCH = [0, 1, 2, 3, 4].map((i) => prepPath([[450, 1352], [458, (1352 + ROWY(i)) / 2], [474, ROWY(i)]], 4));

function trace(c, m, x, y, w, h, r, p, width, color = COL.terra) { // el trazo recorre un borde
  if (p <= 0 || width <= 0.2) return;
  const per = 2 * (w + h);
  c.save(); setM(c, m); rr(c, x, y, w, h, r); c.setLineDash([per * p, per]); c.lineCap = 'round';
  c.lineWidth = width + 3; c.strokeStyle = 'rgba(40,14,6,0.8)'; c.stroke();
  c.lineWidth = width; c.strokeStyle = color; c.stroke(); c.restore();
}

// ---------- estado del campo líquido ----------
const RIPS = [[0, 540, 230, 3.4], [7, 540, 230, 1.8], [17, 540, 230, 1.1], [150, 540, 60, 0.9], [228, 540, 400, 0.7], [300, 580, 700, 0.6], [362, 30, 1010, 0.6],
  [432, 450, 1352, 0.9], [482, 60, 1660, 0.5], [570, 540, 1870, 1.0], [606, 975, 2180, 0.7], [750, 540, 2180, 2.2], [758, 540, 2180, 1.2]];
function fieldState(f, m) {
  const z = zoomOf(m), st = { rip: [], blobs: [], caps: [], box: null, glows: [] };
  if (f >= 960) { st.glows.push([DW * 0.2, DH * 0.3, 700, 0.10]); return st; }
  RIPS.filter((r) => f > r[0] && f - r[0] < 150).slice(-NR).forEach((r) => { const p = P(m, r[1], r[2]); st.rip.push([p[0], p[1], f - r[0], r[3] * Math.min(1, z + 0.3)]); });
  if (f > 846 && f < 960) st.rip.push([540, LY.nameY + 60, f - 846, 1.4]);
  // gota: corona, montículo central y gota de rebote que sube a la punta del V60
  if (f < 46) {
    const t = seg(f, 0, 30);
    for (let i = 0; i < 11; i++) { const a = (i / 11) * 6.283 + hash(i + 20) * 0.5, d = 30 + (120 + hash(i) * 230) * eo(t), p = P(m, 540 + Math.cos(a) * d, 230 + Math.sin(a) * d * 0.8 + 70 * t * t); st.blobs.push([p[0], p[1], (6 + hash(i + 3) * 13) * (1 - t * t) * z]); }
    const p = P(m, 540, 230); st.blobs.push([p[0], p[1], 64 * (1 - eo(seg(f, 0, 44))) * z]);
  }
  if (f < 152) { const t = eo5(seg(f, 2, 70)), y = lerp(230, -26, t) + Math.sin(f * 0.12) * 3 * t, p = P(m, 540, y); st.blobs.push([p[0], p[1], 17 * z * (1 - eio(seg(f, 132, 152)))]); }
  const hr = headRect(f);
  if (f < 84 && hr.th > 0.05) { const p = P(m, 540, 230); st.box = { x: p[0], y: p[1], hw: (hr.w / 2) * z, hh: (hr.h / 2) * z, r: hr.r * z, th: hr.th * z }; }
  [[900, 250, 520, 0.16], [120, 1150, 560, 0.15], [960, 1800, 520, 0.16], [250, 2420, 520, 0.13]].forEach((g) => { const p = P(m, g[0], g[1]); st.glows.push([p[0], p[1], g[2] * z, g[3]]); });
  return st;
}

// ---------- teléfono ----------
const BZ = { x: -30, y: -30, w: 1140, h: 2400, r: 150 };
function phoneBack(c, m, f, k) {
  if (k <= 0) return;
  const th = 44 * k, z = zoomOf(m);
  // sombra de contacto en el piso, crece con el giro
  const bl = P(m, BZ.x, BZ.y + BZ.h), br = P(m, BZ.x + BZ.w, BZ.y + BZ.h);
  c.save(); setM(c, ID); c.filter = `blur(${26 * S}px)`; c.fillStyle = `rgba(0,0,0,${0.7 * k})`;
  c.beginPath(); c.moveTo(bl[0], bl[1] - 20); c.lineTo(br[0], br[1] - 20); c.lineTo(br[0] + 150 * k, br[1] + 34); c.lineTo(bl[0] + 110 * k, bl[1] + 34); c.closePath(); c.fill(); c.restore();
  // grosor: el cuerpo se extruye hacia atrás (arriba-derecha)
  for (let i = 14; i >= 1; i--) {
    const o = (th * i) / 14;
    c.save(); setM(c, ID); c.translate(o * C30, -o * 0.5); c.transform(...m);
    rr(c, BZ.x, BZ.y, BZ.w, BZ.h, BZ.r);
    const g = c.createLinearGradient(0, 0, 1080, 2340); g.addColorStop(0, '#8C7A68'); g.addColorStop(0.5, '#3A2E26'); g.addColorStop(1, '#17110D');
    c.fillStyle = g; c.fill(); c.restore();
  }
  c.save(); setM(c, m); rr(c, BZ.x, BZ.y, BZ.w, BZ.h, BZ.r); c.fillStyle = '#0B0806'; c.fill();
  const g = c.createLinearGradient(0, 0, 700, 1500); g.addColorStop(0, 'rgba(255,240,215,0.85)'); g.addColorStop(0.4, 'rgba(255,240,215,0.12)'); g.addColorStop(1, 'rgba(255,240,215,0.3)');
  c.lineWidth = 2.2 / z; c.strokeStyle = g; c.stroke(); c.restore();
}

// ---------- contenido de la página (sobre el cristal) ----------
function pageContent(c, m, f) {
  // encabezado
  const hr = panelRect('head', f);
  if (hr) {
    glass(c, m, hr.x, hr.y, hr.w, hr.h, hr.r);
    if (f >= 160) {
      c.save(); setM(c, m);
      inkText(c, 'Cata Café', 112, 236, `700 132px ${SG}`, f, 168, { stagger: 4, draw: 14, fillDur: 14, tracking: -2 });
      gtext(c, 'Orgánico, cooperativo', 116, 308, `500 42px ${IN}`, 'rgba(251,243,213,0.86)', f, 198, { stagger: 0.8 });
      gtext(c, 'y de pueblos originarios', 116, 362, `500 42px ${IN}`, 'rgba(251,243,213,0.86)', f, 208, { stagger: 0.8 });
      c.restore();
    }
  }
  // métodos
  ['mA', 'mB', 'mC'].forEach((id) => {
    const p = PAN[id], g = grown(p, f); if (!g) return;
    glass(c, m, g.x, g.y, g.w, g.h, g.r);
    trace(c, m, g.x, g.y, g.w, g.h, g.r, eio(seg(f, p.f0, p.f0 + 30)), lerp(7, 0, seg(f, p.f0 + 24, p.f0 + 46)));
    const k = back(eo(seg(f, p.f0 + 10, p.f0 + 32)), 1.2); if (k <= 0) return;
    if (id === 'mA') { local(c, m, 310, 812, 0.86 * k, 0, () => v60(c, f)); c.save(); setM(c, m); gtext(c, 'V60', 110, 922, `700 104px ${SG}`, COL.crema, f, p.f0 + 16, { stagger: 2.2 }); c.restore(); }
    if (id === 'mB') local(c, m, 810, 565, 0.98 * k, 0, () => chemex(c));
    if (id === 'mC') local(c, m, 806, 836, 0.96 * k, 0, () => prensa(c));
  });
  // café en grano o molido
  const g = grown(PAN.roast, f);
  if (g) {
    glass(c, m, g.x, g.y, g.w, g.h, g.r);
    trace(c, m, g.x, g.y, g.w, g.h, g.r, eio(seg(f, 348, 380)), lerp(7, 0, seg(f, 374, 396)));
    const lw = lerp(8, 3.5, eio(seg(f, 452, 476))), la = LOOP.len * eio(seg(f, 384, 432));
    stroke(c, m, LOOP, 0, la, lw); // la vuelta completa (la mitad de atrás queda tapada por la bolsa)
    const bk = back(eo(seg(f, 360, 386)), 1.1);
    if (bk > 0) local(c, m, 245, 1566 - (1 - eo(seg(f, 360, 392))) * 70, bk, 0, () => bolsa(c, lerp(0.44, -0.17, eio(seg(f, 360, 404))) + Math.sin(f * 0.02) * 0.02 * seg(f, 404, 440), f));
    if (la > 0) { // la mitad de enfrente pasa por delante de la bolsa
      c.save(); setM(c, m); c.beginPath(); c.rect(0, 1352, 1080, 400); c.clip(); stroke(c, m, LOOP, 0, la, lw); c.restore();
      if (f < 436) { const h = pointAt(LOOP, la); bead(c, m, h[0], h[1], 9); }
    }
    ROAST.forEach((r, i) => {
      const f0 = 432 + i * 2, bp = eio(seg(f, f0, f0 + 18));
      const end = stroke(c, m, BRANCH[i], 0, BRANCH[i].len * bp, lw * 0.8);
      if (end && f < 476) bead(c, m, end[0], end[1], 8 * (1 - seg(f, 460, 476)));
      const cf = 438 + i * 8, k = back(eo(seg(f, cf, cf + 16)), 1.6);
      if (k > 0) local(c, m, 526, ROWY(i), 0.92 * k, 0, () => vasito(c, r[1], i));
      c.save(); setM(c, m); gtext(c, r[0], 606, ROWY(i) + 17, `600 46px ${IN}`, COL.crema, f, cf + 4, { stagger: 1.2 }); c.restore();
    });
  }
  // tarjeta de cliente frecuente: sale de la barra y aterriza en la página
  if (f >= 462) {
    const bo = f < 520 ? (1 - eo(seg(f, 462, 488))) * 800 : ei(seg(f, 572, 602)) * 1100, BY = 2130 + bo;
    const p1 = eo(seg(f, 482, 522)), p2 = eio(seg(f, 520, 570));
    const cy = lerp(lerp(2240, 1620, p1), CARD.y, p2), rot = lerp(lerp(-0.02, -0.11, p1), 0, p2), sc = lerp(lerp(0.9, 1.07, p1), 1, p2);
    const lift = p1 * (1 - p2);
    if (f < 602) local(c, m, 0, BY, 1, 0, () => { c.beginPath(); c.moveTo(40, 0); c.lineTo(1040, 0); c.lineTo(1080, 54); c.lineTo(0, 54); c.closePath(); c.fillStyle = '#C0915A'; c.fill(); });
    if (f >= 482) {
      c.save(); setM(c, m);
      if (p2 <= 0) { c.beginPath(); c.rect(-200, -4000, 1500, 4000 + BY + 26); c.clip(); }
      if (p2 > 0) { c.save(); c.filter = `blur(${(14 + 26 * lift) * zoomOf(m) * S}px)`; c.fillStyle = 'rgba(0,0,0,0.5)'; rr(c, CARD.x + 12 + 40 * lift, CARD.y + 20 + 70 * lift, CARD.w, CARD.h, 34); c.fill(); c.restore(); }
      c.translate(CARD.x + CARD.w / 2, cy + CARD.h / 2); c.rotate(rot); c.scale(sc, sc); c.translate(-CARD.w / 2, -CARD.h / 2);
      tarjeta(c, CARD.w, CARD.h, f, 506, seg(f, 572, 600));
      c.restore();
      trace(c, m, CARD.x, CARD.y, CARD.w, CARD.h, 34, eio(seg(f, 562, 592)), lerp(6, 0, seg(f, 586, 604)), COL.terraL);
    }
    if (f < 602) local(c, m, 0, BY, 1, 0, () => { c.save(); c.beginPath(); c.rect(-10, 26, 1100, 700); c.clip(); barra(c, 1080); c.restore(); });
  }
  // botón de pedido
  const bk = back(eo(seg(f, 606, 630)), 1.0);
  if (bk > 0) {
    const pr = Math.sin(seg(f, 750, 774) * Math.PI), sc = 1 - 0.06 * pr;
    // onda de contacto
    [0, 9].forEach((d) => { const t = seg(f, 750 + d, 796 + d); if (t > 0 && t < 1) { c.save(); setM(c, m); ell(c, 540, 2180, 80 + 620 * eo(t), 80 + 620 * eo(t)); c.lineWidth = 14 * (1 - t); c.strokeStyle = 'rgba(251,243,213,0.85)'; c.stroke(); c.restore(); } });
    c.save(); setM(c, m); c.translate(lerp(975, 540, bk), 2180); c.scale(bk * sc, bk * sc); c.translate(-430, -70);
    c.filter = `blur(${16 * zoomOf(m) * S}px)`; c.fillStyle = 'rgba(0,0,0,0.5)'; rr(c, 10, 22, 860, 140, 70); c.fill(); c.filter = 'none';
    rr(c, 0, 9 * (1 - pr), 860, 140, 70); c.fillStyle = '#5E2610'; c.fill();
    const gb = c.createLinearGradient(0, 0, 0, 140); gb.addColorStop(0, mixc('#D8753F', '#A84A22', pr)); gb.addColorStop(1, mixc('#A84A22', '#8A3A1A', pr));
    rr(c, 0, 0, 860, 140, 70); c.fillStyle = gb; c.fill();
    rr(c, 2, 2, 856, 136, 68); c.lineWidth = 2.5; const gh = c.createLinearGradient(0, 0, 0, 140); gh.addColorStop(0, 'rgba(255,230,200,0.85)'); gh.addColorStop(0.5, 'rgba(255,230,200,0)'); c.strokeStyle = gh; c.stroke();
    gtext(c, 'Hacer pedido', 430, 91, `700 60px ${IN}`, COL.crema, f, 618, { align: 'center', stagger: 1.2 });
    if (pr > 0.02) { ell(c, 430, 70, 60 * pr, 60 * pr); c.fillStyle = 'rgba(251,243,213,0.35)'; c.fill(); }
    c.restore();
  }
}

// ---------- capa de diseño: tipografía cinética, chips, ruta ----------
function ktLine(c, y, size, exitF, f, fn) {
  c.save(); c.beginPath(); c.rect(0, y - size * 1.04, DW, size * 1.36); c.clip();
  if (exitF != null && f > exitF) c.translate(0, -ei(seg(f, exitF, exitF + 18)) * size * 1.4);
  fn(); c.restore();
}
function overlay(c, f, m) {
  setD(c);
  // UN SOLO TRAZO
  if (f >= 130 && f < 240) {
    const [y1, s1, y2, s2] = LY.kt1, F1 = `700 ${s1}px ${SG}`, wUN = glyphs('UN', F1).w, wS = glyphs('SOLO', F1).w, gap = s1 * 0.3, x0 = 540 - (wUN + gap + wS) / 2;
    ktLine(c, y1, s1, 214, f, () => { gtext(c, 'UN', x0, y1, F1, COL.crema, f, 130, { mode: 'drop', stagger: 1.8 }); gtext(c, 'SOLO', x0 + wUN + gap, y1, F1, COL.crema, f, 149, { mode: 'left', stagger: 1.8 }); });
    ktLine(c, y2, s2, 218, f, () => inkText(c, 'TRAZO', 540, y2, `700 ${s2}px ${SG}`, f, 166, { align: 'center', stagger: 2.5, draw: 12, fillDur: 12, color: COL.terraL, ink: COL.crema }));
  }
  // UNA PÁGINA
  if (f >= 296 && f < 420) {
    const [y1, s1, y2, s2] = LY.kt2;
    ktLine(c, y1, s1, 346, f, () => gtext(c, 'UNA', 540, y1, `500 ${s1}px ${SG}`, 'rgba(251,243,213,0.8)', f, 299, { align: 'center', mode: 'drop', stagger: 1.6 }));
    ktLine(c, y2, s2, 350, f, () => gtext(c, 'PÁGINA', 540, y2, `700 ${s2}px ${SG}`, COL.crema, f, 311, { align: 'center', stagger: 1.9 }));
  }
  // EN EL CELULAR → se va hacia el teléfono
  if (f >= 628 && f < 724) {
    const [y1, s1, y2, s2] = LY.kt3, q = eio(seg(f, 700, 723)), T = P(m, 540, 1170);
    c.save(); c.translate(lerp(0, T[0], q), lerp(0, T[1], q)); c.scale(1 - q, 1 - q); c.translate(lerp(0, -540, q), lerp(0, -y2, q));
    ktLine(c, y1, s1, null, f, () => gtext(c, 'EN EL', 540, y1, `500 ${s1}px ${SG}`, 'rgba(251,243,213,0.8)', f, 630, { align: 'center', mode: 'left', stagger: 1.6 }));
    ktLine(c, y2, s2, null, f, () => gtext(c, 'CELULAR', 540, y2, `700 ${s2}px ${SG}`, COL.crema, f, 657, { align: 'center', stagger: 1.8 }));
    c.restore();
  }
  // chips, ruta y el trazo que los une
  if (f >= 752 && f < 872) {
    const X = LY.chipX, Wc = LY.chipW, [c1, c2] = LY.chipY, [r1, r2, r3] = LY.routeY, s0 = P(m, 1112, 760), CH = 168;
    const path = prepPath([s0, [X - 34, c1 + 150], [X - 22, c1 + CH / 2], [X - 22, c2 + CH / 2], [X - 10, c2 + CH + 30], [X + 34, r1], [X + 34, r2], [X + 34, r3]], 5);
    const K = [[752, 0], [768, lenAtIndex(path, 2)], [786, lenAtIndex(path, 3)], [798, lenAtIndex(path, 5)], [813, lenAtIndex(path, 6)], [828, path.len]];
    const end = stroke(c, ID, path, 0, keyed(K, f), 7);
    if (end && f < 834) bead(c, ID, end[0], end[1], 9);
    const TXT = [[['Lun–Sáb 7:30–16:00', 'Dom 7:30–15:00'], c1, 768], [['Mercado Terán', 'Módulo IV'], c2, 786]];
    TXT.forEach(([ls, y, f0]) => {
      const k = back(eo(seg(f, f0, f0 + 22)), 0.9); if (k <= 0) return;
      const w = Wc * k, h = CH * k, x = X, yy = y + (CH - h) / 2;
      glass(c, ID, x, yy, w, h, 40 * Math.min(1, k), { tint: 'rgba(251,243,213,0.10)' });
      setD(c); c.save(); c.beginPath(); c.rect(x, yy, w, h); c.clip();
      gtext(c, ls[0], x + 38, y + 72, `600 42px ${IN}`, COL.crema, f, f0 + 8, { stagger: 0.7 });
      gtext(c, ls[1], x + 38, y + 128, `600 42px ${IN}`, 'rgba(251,243,213,0.86)', f, f0 + 14, { stagger: 0.7 });
      c.restore();
    });
    [['Entrada principal', r1, 798], ['Pasaje Arteaga', r2, 813], ['Módulo de cristal', r3, 828]].forEach(([t, y, f0]) => {
      const k = back(eo(seg(f, f0, f0 + 14)), 2); if (k <= 0) return;
      bead(c, ID, X + 34, y, 17 * k, COL.terra); setD(c);
      gtext(c, t, X + 74, y + 15, `500 42px ${IN}`, COL.crema, f, f0 + 3, { stagger: 0.7 });
    });
  }
}

// ---------- cierre: el trazo se recoge y escribe el nombre con giro de cámara ----------
function finale(c, f) {
  const y0 = LY.nameY, uy = y0 + 62;
  if (f < 846) return;
  const th = lerp(-0.30, 0.12, eio(seg(f, 862, 956))), cs = Math.cos(th), sn = Math.sin(th);
  let size = 160; size *= LY.nameW / glyphs('Cata Café', `700 160px ${SG}`, -2).w;
  const font = `700 ${size.toFixed(1)}px ${SG}`;
  const grow = eo(seg(f, 846, 870)), x1 = lerp(70, 110, eio(seg(f, 866, 900))), x2 = lerp(1030, 970, eio(seg(f, 866, 900)));
  const N = 12;
  for (let k = N; k >= 0; k--) {
    c.save(); setD(c); c.translate(540 - k * 3.2 * sn, uy + k * 0.6); c.transform(cs, -sn * 0.10, 0, 1, 0, 0);
    const col = k === 0 ? null : mixc('#5A2410', COL.terra, 1 - k / N);
    // subrayado: la línea en la que se recogió todo
    c.lineCap = 'round'; c.beginPath(); c.moveTo(x1 - 540, 0); c.lineTo(x2 - 540, 0); c.lineWidth = 11 * grow;
    c.strokeStyle = k === 0 ? COL.terraL : col; c.stroke();
    if (f >= 868) inkText(c, 'Cata Café', 0, y0 - uy, font, f, 868, { align: 'center', stagger: 4.5, draw: 14, fillDur: 14, tracking: -2, color: k === 0 ? COL.crema : col, ink: k === 0 ? COL.terraL : col, lw: k === 0 ? 4 : 2 });
    c.restore();
  }
}

function endCard(c, f) {
  setD(c); const y = LY.endY;
  const p = eo5(seg(f, 962, 990)); c.save(); c.lineCap = 'round'; c.beginPath(); c.moveTo(540 - 90 * p, y); c.lineTo(540 + 90 * p, y); c.lineWidth = 6; c.strokeStyle = COL.terra; if (p > 0) c.stroke(); c.restore();
  gtext(c, 'Demo de cortesía de Elevate Negocios', 540, y - 46, `600 46px ${IN}`, COL.crema, f, 964, { align: 'center', stagger: 0.5 });
  gtext(c, 'pieza no oficial', 540, y + 84, `500 42px ${IN}`, 'rgba(251,243,213,0.72)', f, 974, { align: 'center', stagger: 0.6 });
}

// ---------- un subcuadro ----------
function subframe(f) {
  const m = camAt(f), isoK = eio(seg(f, 660, 720));
  GP = null;
  drawField(f, fieldState(f, m));
  B.setTransform(1, 0, 0, 1, 0, 0); B.drawImage(cGL, 0, 0);
  if (f >= 960) { A.setTransform(1, 0, 0, 1, 0, 0); A.drawImage(cB, 0, 0); endCard(A, f); return; }
  const sq = eio(seg(f, 840, 868)); // colapso: todo se recoge en una línea
  const showPage = f < 868;
  if (sq > 0) { const k = 1 - sq * 0.997, y0 = LY.nameY + 62; GP = [1, 0, 0, k, 0, y0 * (1 - k)]; }
  if (showPage) {
    ['head', 'mA', 'mB', 'mC', 'roast'].forEach((id) => { const r = panelRect(id, f); if (r) shadow(B, m, r.x, r.y, r.w, r.h, r.r, clamp(r.w / PAN[id].w) * (id === 'head' ? seg(f, 20, 60) : 1)); });
    phoneBack(B, m, f, isoK);
    if (f > 672) { // pantalla: cristal oscuro que entra desde los bordes
      blurInto(cBb2, Bb2, cB, 34);
      const d = eio(seg(f, 672, 716)) * 545;
      B.save(); setM(B, m); B.beginPath(); B.roundRect(0, 0, 1080, 2340, 124); if (d < 540) B.rect(d, d, 1080 - 2 * d, 2340 - 2 * d); B.clip('evenodd');
      B.setTransform(1, 0, 0, 1, 0, 0); B.drawImage(cBb2, 0, 0, W, H); B.fillStyle = 'rgba(16,12,9,0.66)'; B.fillRect(0, 0, W, H); B.restore();
    }
    // hilo maestro
    const tl = keyed(TKEY, f);
    if (f >= 130) { const end = stroke(B, m, THREAD, 0, tl, 10); if (end && f < 640) bead(B, m, end[0], end[1], 11 * (1 - seg(f, 620, 640))); }
  }
  blurInto(cBb, Bb, cB, 32);
  A.setTransform(1, 0, 0, 1, 0, 0); A.drawImage(cB, 0, 0);
  if (showPage) {
    // V60 grande: de su punta cae el hilo
    if (f >= 120 && f < 420) { const k = back(eo(seg(f, 124, 160)), 1.3); if (k > 0) local(A, m, 540, -40, k, (1 - eo(seg(f, 124, 170))) * -0.25, () => v60(A, f)); }
    pageContent(A, m, f);
    if (isoK > 0) { // contorno del teléfono dibujado por el trazo, cámara frontal y barra de inicio
      trace(A, m, BZ.x, BZ.y, BZ.w, BZ.h, BZ.r, eio(seg(f, 660, 712)), lerp(16, 0, eio(seg(f, 700, 736))), COL.terra);
      A.save(); setM(A, m); ell(A, 540, 34, 15 * isoK, 15 * isoK); A.fillStyle = '#050403'; A.fill(); A.lineWidth = 3; A.strokeStyle = 'rgba(251,243,213,0.25)'; A.stroke();
      rr(A, 540 - 130 * isoK, 2298, 260 * isoK, 11, 6); A.fillStyle = 'rgba(251,243,213,0.6)'; A.fill(); A.restore();
    }
    overlay(A, f, m);
  }
  GP = null;
  finale(A, f);
}

// ---------- cuadro con motion blur: promedio de `sub` subcuadros dentro del obturador ----------
window.renderFrame = (f, { sub = 8, shutter = 0.5, type = 'image/png', q = 0.95 } = {}) => {
  for (let i = 0; i < sub; i++) {
    let t = f + ((i + 0.5) / sub - 0.5) * shutter;
    if (f < 960) t = Math.min(t, 959.999); else t = Math.max(t, 960); // el único corte duro: la end card
    subframe(Math.max(0, t));
    octx.globalAlpha = 1 / (i + 1); octx.drawImage(cA, 0, 0);
  }
  octx.globalAlpha = 1;
  return out.toDataURL(type, q);
};
Promise.all([document.fonts.load(`700 40px ${SG}`), document.fonts.load(`500 40px ${SG}`), document.fonts.load(`500 40px ${IN}`), document.fonts.load(`600 40px ${IN}`), document.fonts.load(`700 40px ${IN}`)])
  .then(() => { if (!document.fonts.check(`700 40px ${SG}`)) window.initError = 'Falta Space Grotesk'; window.ready = true; })
  .catch((e) => { window.initError = String(e); });
