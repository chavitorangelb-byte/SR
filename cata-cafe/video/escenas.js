// Línea de tiempo de Cata Café: una sola función determinista frame(f) para 9:16 y 1:1.
// La interfaz es la página real (web/index.html) capturada por tools/captura_ui.mjs: video/ui/page.png + ui.json.
// Coordenadas: "pantalla" = el viewport del celular (1080 × 2337); "página" = pantalla + scroll.
'use strict';
const ID = [1, 0, 0, 1, 0, 0];
let GP = null; // matriz global (colapso final)
{ const _setD = setD; setD = (c) => { _setD(c); if (GP) c.transform(...GP); };
  const _setM = setM; setM = (c, m) => { if (GP) { c.setTransform(S, 0, 0, S, 0, 0); c.transform(...GP); c.transform(...m); } else _setM(c, m); }; }

let UI, E, VH, IMG, BARIMG, V60IMG, LY, SCROLL, THREAD, TKEY, TIP, LOOP, BRANCH, BAG, EL, BY0;
const RG = 61, GX = 1058; // radio del cristal y canal derecho por donde baja el hilo
const keyed = (K, f) => { if (f <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (f <= K[i][0]) return lerp(K[i - 1][1], K[i][1], eio(seg(f, K[i - 1][0], K[i][0]))); return K[K.length - 1][1]; };
const sY = (Y, Fy, vcy, z) => Y - vcy - (Fy - DH / 2) / z; // scroll para que la y de página Y caiga en la y de cuadro Fy
const pageM = (m, s) => [m[0], m[1], m[2], m[3], m[4] - m[2] * s, m[5] - m[3] * s];

function build() {
  E = UI.els; VH = UI.vh;
  const tueEnd = E.escala.y + E.escala.h;
  if (V) {
    const S1 = sY(E.hero.y, 250, 1168, 0.8), S3 = sY(E.metSh.y, 260, 1168, 1), S4 = sY(E.tueSh.y, 260, 1168, 1), S4b = sY(tueEnd, 1560, 1168, 1), S5 = sY(E.tarSh.y, 300, 1168, 1), S6 = sY(E.tarSh.y, 250, 1700, 1);
    const hb = 250 + E.hero.h * 0.8, mb = 260 + (E.chips.y + E.chips.h - E.metSh.y), cb = 250 + (E.card.y + E.card.h - E.tarSh.y);
    LY = { cam: [[0, flat(540, 1168, 0.8)], [236, flat(540, 1168, 0.8)], [300, flat(540, 1168, 1)], [598, flat(540, 1168, 1)], [650, flat(540, 1700, 1)], [660, flat(540, 1700, 1)],
        [720, iso(305, 255, 0.46)], [742, iso(305, 255, 0.46)], [772, iso(70, 300, 0.42)], [960, iso(64, 294, 0.426), (t) => t]],
      scroll: [[0, S1], [236, S1], [300, S3], [356, S3], [404, S4], [446, S4], [474, S4b], [486, S4b], [524, S5], [598, S5], [650, S6], [722, S6], [748, 92]],
      kt1: [hb + 160, 120, hb + 330, 160], kt2: [mb + 20, 0, mb + 180, 150], kt3: [0, 0, (cb + 1403) / 2 + 40, 118],
      bagY: E.tueSh.y + 1250, bagS: 1.3, barraGap: 120,
      chipX: 540, chipW: 500, chipY: [420, 620], routeY: [880, 1020, 1160], nameY: 930, nameW: 860, endY: 930 };
  } else {
    const S1 = sY(E.hero.y, 40, 1168, 0.62), S3 = sY(E.metSh.y, 40, 1168, 0.7), S4 = sY(E.tueSh.y, 40, 1168, 0.8), S4b = sY(tueEnd, 1040, 1168, 0.8), S5 = sY(E.tarSh.y, 40, 1168, 0.8), S6 = sY(E.tarSh.y, 30, 1718, 0.8);
    const hb = 40 + E.hero.h * 0.62, mb = 40 + (E.chips.y + E.chips.h - E.metSh.y) * 0.7, cb = 30 + (E.card.y + E.card.h - E.tarSh.y) * 0.8;
    LY = { cam: [[0, flat(540, 1168, 0.62)], [236, flat(540, 1168, 0.62)], [300, flat(540, 1168, 0.7)], [356, flat(540, 1168, 0.7)], [404, flat(540, 1168, 0.8)], [598, flat(540, 1168, 0.8)],
        [650, flat(540, 1718, 0.8)], [660, flat(540, 1718, 0.8)], [720, iso(388, 70, 0.325)], [742, iso(388, 70, 0.325)], [772, iso(80, 100, 0.31)], [960, iso(76, 96, 0.313), (t) => t]],
      scroll: [[0, S1], [236, S1], [300, S3], [356, S3], [404, S4], [446, S4], [474, S4b], [486, S4b], [524, S5], [598, S5], [650, S6], [722, S6], [748, 92]],
      kt1: [hb + 130, 100, hb + 275, 135], kt2: [mb + 110, 80, mb + 250, 140], kt3: [0, 0, (cb + 880) / 2 + 34, 100],
      bagY: E.tueSh.y + 1120, bagS: 1.2, barraGap: 90,
      chipX: 440, chipW: 580, chipY: [110, 290], routeY: [540, 680, 820], nameY: 520, nameW: 860, endY: 520 };
  }
  CAMKEYS = LY.cam; SCROLL = LY.scroll;
  if (Q.get('cam')) { const [cx, cy, z] = Q.get('cam').split(',').map(Number); CAMKEYS = [[0, flat(cx, cy, z)]]; }
  // punta del V60 del encabezado: de ahí cae el hilo
  TIP = [E.v60.x + E.v60.w * (140 / 300), E.v60.y + E.v60.h * (240 / 250)];
  const hbP = E.hero.y + E.hero.h;
  THREAD = prepPath([TIP, [TIP[0] + 3, TIP[1] + 70], [960, TIP[1] + 140], [1040, TIP[1] + 180], [GX, TIP[1] + 250], [GX, hbP], [GX, E.metSh.y], [GX, E.chips.y + E.chips.h], [GX, E.r0.y], [GX, E.r4.y + E.r4.h],
    [GX, E.menu.y + E.menu.h], [GX, E.card.y], [GX, E.card.y + E.card.h * 0.4], [E.card.x + E.card.w - 6, E.card.y + E.card.h * 0.5]], 8);
  const li = (i) => lenAtIndex(THREAD, i);
  TKEY = [[130, 0], [160, li(3)], [228, li(5)], [246, li(6)], [340, li(7)], [404, li(8)], [474, li(9)], [516, li(10)], [526, li(11)], [560, THREAD.len]];
  // bolsa (toque 3D), la vuelta del trazo y las cinco ramas hacia las tarjetas de tueste
  const sB = LY.bagS, bcy = LY.bagY - 205 * sB;
  BAG = { x: 540, y: LY.bagY, s: sB };
  LOOP = prepPath(Array.from({ length: 33 }, (_, i) => { const a = Math.PI + (i / 32) * Math.PI * 2; return [540 + 215 * sB * Math.cos(a), bcy + 300 * sB * Math.sin(a)]; }), 6);
  const xL = 540 - 215 * sB;
  BRANCH = [0, 1, 2, 3, 4].map((i) => { const r = E['r' + i], cy = r.y + r.h / 2; return prepPath([[xL, bcy], [60, lerp(bcy, cy, 0.35)], [22, lerp(bcy, cy, 0.75)], [46, cy]], 6); });
  BY0 = E.card.y + E.card.h + LY.barraGap;
  // elementos de la página: [clave, tipo, cuadro de entrada, extra]
  EL = [['logo', 'pop', 150], ['h1', 'wipe', 168, 36], ['lema', 'wipe', 198, 24], ['donde', 'wipe', 208, 18], ['btn1', 'pop', 214], ['btn2', 'pop', 220],
    ['metSh', 'wipe', 246, 20], ['met0', 'grow', 252, 'R'], ['met1', 'grow', 270, 'R'], ['met2', 'grow', 288, 'R'], ['chips', 'wipe', 300, 30],
    ['tueSh', 'wipe', 350, 20], ['grind', 'pop', 356], ['r0', 'grow', 438, 'L'], ['r1', 'grow', 446, 'L'], ['r2', 'grow', 454, 'L'], ['r3', 'grow', 462, 'L'], ['r4', 'grow', 470, 'L'], ['escala', 'wipe', 480, 16],
    ['menuSh', 'wipe', 472, 12], ['tabs', 'pop', 474], ['menu', 'grow', 476, 'R'], ['menuNota', 'wipe', 482, 12],
    ['tarSh', 'wipe', 500, 20], ['tarNota', 'wipe', 704, 14], ['demo', 'wipe', 706, 10], ['visSh', 'wipe', 706, 10], ['visita', 'grow', 706, 'R'], ['links', 'pop', 710], ['pie', 'wipe', 710, 10]];
}

function heroRect(f) {
  const h = E.hero, cx = h.x + h.w / 2, cy = h.y + h.h / 2, a = eo(seg(f, 0, 30)), R = 240 * a, b = eio(seg(f, 24, 58));
  const hw = lerp(R, h.w / 2, b), hh = lerp(R, h.h / 2, b), r = lerp(R, RG, b);
  return { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2, r, th: f < 30 ? lerp(18, 9, a) : lerp(9, 0, eio(seg(f, 44, 84))) };
}
function grown(e, f0, side, f) {
  const t = seg(f, f0, f0 + 24); if (t <= 0) return null; const k = back(eo(t), 0.7), ax = side === 'L' ? e.x : e.x + e.w, ay = e.y + e.h / 2;
  return { x: lerp(ax, e.x, k), y: lerp(ay, e.y, k), w: e.w * k, h: e.h * k, r: RG * Math.min(1, k), k };
}
function crop(c, e, pad = 3) { c.drawImage(IMG, e.x - pad, e.y - pad, e.w + 2 * pad, e.h + 2 * pad, e.x - pad, e.y - pad, e.w + 2 * pad, e.h + 2 * pad); }
function trace(c, m, x, y, w, h, r, p, width, color = COL.terra) { // el trazo recorre un borde
  if (p <= 0 || width <= 0.2) return;
  const per = 2 * (w + h);
  c.save(); setM(c, m); rr(c, x, y, w, h, r); c.setLineDash([per * p, per]); c.lineCap = 'round';
  c.lineWidth = width + 3; c.strokeStyle = 'rgba(40,14,6,0.8)'; c.stroke();
  c.lineWidth = width; c.strokeStyle = color; c.stroke(); c.restore();
}
const clipScreen = (c, m) => { setM(c, m); c.beginPath(); c.roundRect(0, 0, 1080, VH, 124); c.clip(); };

// ---------- estado del campo líquido ----------
function fieldState(f, m, mp) {
  const z = zoomOf(m), st = { rip: [], blobs: [], caps: [], box: null, glows: [] };
  if (f >= 960) { st.glows.push([DW * 0.2, DH * 0.3, 700, 0.10]); return st; }
  const hc = [E.hero.x + E.hero.w / 2, E.hero.y + E.hero.h / 2];
  const R = [[0, hc, 3.4], [7, hc, 1.8], [17, hc, 1.1], [132, TIP, 0.8]];
  [228, 300, 362, 432, 482, 570].forEach((f0) => R.push([f0, pointAt(THREAD, keyed(TKEY, f0)), 0.7]));
  R.filter((r) => f > r[0] && f - r[0] < 150).slice(-6).forEach((r) => { const p = P(mp, r[1][0], r[1][1]); st.rip.push([p[0], p[1], f - r[0], r[2] * Math.min(1, z + 0.3)]); });
  [[750, 2.2], [758, 1.2]].forEach(([f0, a]) => { if (f > f0 && f - f0 < 150) { const p = P(m, 540, E.bar.y + E.bar.h / 2); st.rip.push([p[0], p[1], f - f0, a]); } });
  if (f > 846) st.rip.push([540, LY.nameY + 60, f - 846, 1.4]);
  if (f < 46) { // corona de la gota y montículo central
    const t = seg(f, 0, 30);
    for (let i = 0; i < 11; i++) { const a = (i / 11) * 6.283 + hash(i + 20) * 0.5, d = 30 + (150 + hash(i) * 280) * eo(t), p = P(mp, hc[0] + Math.cos(a) * d, hc[1] + Math.sin(a) * d * 0.8 + 80 * t * t); st.blobs.push([p[0], p[1], (7 + hash(i + 3) * 15) * (1 - t * t) * z]); }
    const p = P(mp, hc[0], hc[1]); st.blobs.push([p[0], p[1], 78 * (1 - eo(seg(f, 0, 44))) * z]);
  }
  if (f < 152) { // gota de rebote: sube a la punta del V60 y ahí se estira en hilo
    const t = eo5(seg(f, 2, 70)), p = P(mp, lerp(hc[0], TIP[0], t), lerp(hc[1], TIP[1] + 6, t) - Math.sin(t * Math.PI) * 220 + Math.sin(f * 0.12) * 3 * t);
    st.blobs.push([p[0], p[1], 19 * z * (1 - eio(seg(f, 132, 152)))]);
  }
  const hr = heroRect(f);
  if (f < 84 && hr.th > 0.05) { const p = P(mp, hc[0], hc[1]); st.box = { x: p[0], y: p[1], hw: (hr.w / 2) * z, hh: (hr.h / 2) * z, r: hr.r * z, th: hr.th * z }; }
  for (let i = 0; i < 8; i++) { const p = P(mp, i % 2 ? 140 : 930, 250 + i * 1350); if (p[1] > -700 && p[1] < DH + 700 && st.glows.length < 4) st.glows.push([p[0], p[1], 560 * z, 0.16]); }
  return st;
}

// ---------- teléfono ----------
const BZ = { x: -30, y: -30, w: 1140, h: 2397, r: 150 };
function phoneBack(c, m, f, k) {
  if (k <= 0) return;
  const th = 44 * k, z = zoomOf(m);
  const bl = P(m, BZ.x, BZ.y + BZ.h), br = P(m, BZ.x + BZ.w, BZ.y + BZ.h);
  c.save(); setM(c, ID); c.filter = `blur(${26 * S}px)`; c.fillStyle = `rgba(0,0,0,${0.7 * k})`; // sombra de contacto, crece con el giro
  c.beginPath(); c.moveTo(bl[0], bl[1] - 20); c.lineTo(br[0], br[1] - 20); c.lineTo(br[0] + 150 * k, br[1] + 34); c.lineTo(bl[0] + 110 * k, bl[1] + 34); c.closePath(); c.fill(); c.restore();
  for (let i = 14; i >= 1; i--) { // grosor: el cuerpo se extruye hacia atrás (arriba-derecha)
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

// ---------- la página real ----------
function pageContent(c, m, mp, f, sc) {
  // encabezado (hero): el anillo de la gota se vuelve su panel de cristal
  if (f > 4) {
    const hr = heroRect(f), h = E.hero;
    glass(c, mp, hr.x, hr.y, hr.w, hr.h, hr.r);
    c.save(); setM(c, mp); rr(c, hr.x, hr.y, hr.w, hr.h, hr.r); c.clip();
    const vk = back(eo(seg(f, 124, 160)), 1.2);
    if (vk > 0) { c.save(); c.translate(TIP[0], TIP[1]); c.rotate((1 - eo(seg(f, 124, 170))) * -0.3); c.scale(vk, vk); c.translate(-TIP[0], -TIP[1]); c.drawImage(V60IMG, E.v60.x, E.v60.y, E.v60.w, E.v60.h); c.restore(); }
    c.restore();
  }
  EL.forEach(([k, type, f0, x]) => {
    if (f < f0) return; const e = E[k];
    const top = (e.y - sc), vis = top < VH + 400 && top + e.h > -400; if (!vis) return;
    if (type === 'grow') {
      const g = grown(e, f0, x, f); if (!g) return;
      glass(c, mp, g.x, g.y, g.w, g.h, g.r);
      c.save(); setM(c, mp); rr(c, g.x, g.y, g.w, g.h, g.r); c.clip(); crop(c, e); c.restore();
      trace(c, mp, g.x, g.y, g.w, g.h, g.r, eio(seg(f, f0, f0 + 30)), lerp(8, 0, seg(f, f0 + 24, f0 + 46)));
    } else if (type === 'pop') {
      const kk = back(eo(seg(f, f0, f0 + 16)), 1.5); if (kk <= 0) return;
      c.save(); setM(c, mp); c.translate(e.x + e.w / 2, e.y + e.h / 2); c.scale(kk, kk); c.translate(-e.x - e.w / 2, -e.y - e.h / 2); crop(c, e, 12); c.restore();
    } else {
      const p = eo(seg(f, f0, f0 + x));
      c.save(); setM(c, mp); c.beginPath(); c.rect(e.x - 6, e.y - 6, (e.w + 12) * p, e.h + 12); c.clip(); crop(c, e); c.restore();
      if (k === 'h1' && p < 1) { bead(c, mp, e.x + (e.w + 12) * p * 0.62, e.y + e.h - 6, 12); } // la gota del trazo escribe el nombre
    }
  });
  // bolsa con grano (toque 3D): el trazo la rodea y se parte en cinco
  if (f >= 360 && f < 490) {
    const lw = 9, la = LOOP.len * eio(seg(f, 384, 432)), l0 = LOOP.len * eio(seg(f, 434, 456));
    stroke(c, mp, LOOP, l0, la, lw);
    const bk = back(eo(seg(f, 360, 386)), 1.1) * (1 - eio(seg(f, 432, 454)));
    if (bk > 0.01) local(c, mp, BAG.x, BAG.y - (1 - eo(seg(f, 360, 392))) * 90, BAG.s * bk, 0, () => bolsa(c, lerp(0.44, -0.17, eio(seg(f, 360, 404))) + Math.sin(f * 0.02) * 0.02 * seg(f, 404, 440), f));
    if (la > l0) { c.save(); setM(c, mp); c.beginPath(); c.rect(0, BAG.y - 205 * BAG.s, 1080, 600); c.clip(); stroke(c, mp, LOOP, l0, la, lw); c.restore(); if (f < 434) { const h = pointAt(LOOP, la); bead(c, mp, h[0], h[1], 11); } }
    BRANCH.forEach((br, i) => {
      const f0 = 432 + i * 2, end = stroke(c, mp, br, br.len * eio(seg(f, 464 + i * 2, 486 + i * 2)), br.len * eio(seg(f, f0, f0 + 16 + i * 2)), 7);
      if (end && f < 470) bead(c, mp, end[0], end[1], 10 * (1 - seg(f, 456, 470)));
    });
  }
  // tarjeta de cliente frecuente: sale de la barra y aterriza en su lugar de la página
  if (f >= 462) {
    const cd = E.card, bo = f < 520 ? (1 - eo(seg(f, 462, 488))) * 1100 : ei(seg(f, 572, 602)) * 1400, BY = BY0 + bo;
    const p1 = eo(seg(f, 482, 522)), p2 = eio(seg(f, 520, 570));
    const cy = lerp(lerp(BY0 + 120, cd.y - 90, p1), cd.y, p2), rot = lerp(lerp(-0.02, -0.11, p1), 0, p2), s2 = lerp(lerp(0.9, 1.06, p1), 1, p2), lift = p1 * (1 - p2);
    if (f < 602) local(c, mp, 0, BY, 1, 0, () => { c.beginPath(); c.moveTo(40, 0); c.lineTo(1040, 0); c.lineTo(1080, 54); c.lineTo(0, 54); c.closePath(); c.fillStyle = '#C0915A'; c.fill(); });
    if (f >= 482) {
      c.save(); setM(c, mp);
      if (p2 <= 0) { c.beginPath(); c.rect(-200, BY - 6000, 1500, 6000 + 26); c.clip(); }
      if (p2 > 0) { c.save(); c.filter = `blur(${(14 + 26 * lift) * zoomOf(m) * S}px)`; c.fillStyle = 'rgba(0,0,0,0.5)'; rr(c, cd.x + 12 + 40 * lift, cd.y + 20 + 70 * lift, cd.w, cd.h, 66); c.fill(); c.restore(); }
      c.translate(cd.x + cd.w / 2, cy + cd.h / 2); c.rotate(rot); c.scale(s2, s2); c.translate(-cd.x - cd.w / 2, -cd.y - cd.h / 2);
      c.drawImage(IMG, cd.x - 4, cd.y - 4, cd.w + 8, cd.h + 24, cd.x - 4, cd.y - 4, cd.w + 8, cd.h + 24);
      const sh = seg(f, 572, 600); // brillo que la recorre al aterrizar
      if (sh > 0 && sh < 1) { rr(c, cd.x, cd.y, cd.w, cd.h, 66); c.clip(); const x = lerp(cd.x - cd.w * 0.4, cd.x + cd.w * 1.2, sh), gs = c.createLinearGradient(x, 0, x + 260, 90); gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.5, 'rgba(255,240,215,0.45)'); gs.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gs; c.fillRect(cd.x, cd.y, cd.w, cd.h); }
      c.restore();
      trace(c, mp, cd.x, cd.y, cd.w, cd.h, 66, eio(seg(f, 562, 592)), lerp(7, 0, seg(f, 586, 604)), COL.terraL);
    }
    if (f < 602) local(c, mp, 0, BY, 1, 0, () => { c.save(); c.beginPath(); c.rect(-10, 26, 1100, 900); c.clip(); barra(c, 1080); c.restore(); });
  }
}
// elementos fijos de la pantalla: barra superior y botón "Hacer pedido"
function stickyUI(c, m, f, sc) {
  const dk = eo(seg(f, 672, 702));
  if (dk > 0) {
    const t = E.top, y = Math.max(0, t.y - sc) - (1 - dk) * 260;
    glass(c, m, 0, y, 1080, t.h, 0, { tint: 'rgba(18,14,11,0.55)', border: 'rgba(251,243,213,0.14)' });
    c.save(); setM(c, m); c.drawImage(IMG, t.x, t.y, t.w, t.h, 0, y, t.w, t.h); c.restore();
  }
  const b = E.bar, bk = back(eo(seg(f, 606, 630)), 1.2);
  if (bk > 0) {
    const pr = Math.sin(seg(f, 750, 774) * Math.PI), s2 = bk * (1 - 0.06 * pr), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    [0, 9].forEach((d) => { const t = seg(f, 750 + d, 796 + d); if (t > 0 && t < 1) { c.save(); setM(c, m); ell(c, cx, cy, 80 + 640 * eo(t), 80 + 640 * eo(t)); c.lineWidth = 14 * (1 - t); c.strokeStyle = 'rgba(251,243,213,0.85)'; c.stroke(); c.restore(); } });
    c.save(); setM(c, m); c.translate(cx, cy + 10 * pr); c.scale(s2, s2); c.translate(-cx, -cy);
    c.filter = `blur(${18 * zoomOf(m) * S}px)`; c.fillStyle = 'rgba(0,0,0,0.55)'; rr(c, b.x + 8, b.y + 26, b.w, b.h, 78); c.fill(); c.filter = 'none';
    c.drawImage(BARIMG, b.x, b.y, b.w, b.h);
    if (pr > 0.02) { ell(c, cx, cy, 70 * pr, 70 * pr); c.fillStyle = 'rgba(251,243,213,0.4)'; c.fill(); }
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
  if (f >= 130 && f < 240) { // UN SOLO TRAZO
    const [y1, s1, y2, s2] = LY.kt1, F1 = `700 ${s1}px ${SG}`, wUN = glyphs('UN', F1).w, wS = glyphs('SOLO', F1).w, gap = s1 * 0.3, x0 = 540 - (wUN + gap + wS) / 2;
    ktLine(c, y1, s1, 214, f, () => { gtext(c, 'UN', x0, y1, F1, COL.crema, f, 130, { mode: 'drop', stagger: 1.8 }); gtext(c, 'SOLO', x0 + wUN + gap, y1, F1, COL.crema, f, 149, { mode: 'left', stagger: 1.8 }); });
    ktLine(c, y2, s2, 218, f, () => inkText(c, 'TRAZO', 540, y2, `700 ${s2}px ${SG}`, f, 166, { align: 'center', stagger: 2.5, draw: 12, fillDur: 12, color: COL.terraL, ink: COL.crema }));
  }
  if (f >= 296 && f < 380) { // UNA PÁGINA
    const [y1, s1, y2, s2] = LY.kt2;
    if (s1) { ktLine(c, y1, s1, 346, f, () => gtext(c, 'UNA', 540, y1, `500 ${s1}px ${SG}`, 'rgba(251,243,213,0.8)', f, 299, { align: 'center', mode: 'drop', stagger: 1.6 })); ktLine(c, y2, s2, 350, f, () => gtext(c, 'PÁGINA', 540, y2, `700 ${s2}px ${SG}`, COL.crema, f, 311, { align: 'center', stagger: 1.9 })); }
    else ktLine(c, y2, s2, 348, f, () => { const F = `700 ${s2}px ${SG}`, F0 = `500 ${s2}px ${SG}`, w1 = glyphs('UNA', F0).w, w2 = glyphs('PÁGINA', F).w, g = s2 * 0.28, x0 = 540 - (w1 + g + w2) / 2;
      gtext(c, 'UNA', x0, y2, F0, 'rgba(251,243,213,0.8)', f, 299, { mode: 'drop', stagger: 1.6 }); gtext(c, 'PÁGINA', x0 + w1 + g, y2, F, COL.crema, f, 311, { stagger: 1.9 }); });
  }
  if (f >= 628 && f < 724) { // EN EL CELULAR → se va hacia el teléfono
    const y2 = LY.kt3[2], s2 = LY.kt3[3], q = eio(seg(f, 700, 723)), T = P(m, 540, VH / 2);
    const F = `700 ${s2}px ${SG}`, F0 = `500 ${s2}px ${SG}`, w1 = glyphs('EN EL', F0).w, w2 = glyphs('CELULAR', F).w, g = s2 * 0.28, x0 = 540 - (w1 + g + w2) / 2;
    c.save(); c.translate(lerp(0, T[0], q), lerp(0, T[1], q)); c.scale(1 - q, 1 - q); c.translate(lerp(0, -540, q), lerp(0, -y2, q));
    ktLine(c, y2, s2, null, f, () => { gtext(c, 'EN EL', x0, y2, F0, 'rgba(251,243,213,0.8)', f, 630, { mode: 'left', stagger: 1.6 }); gtext(c, 'CELULAR', x0 + w1 + g, y2, F, COL.crema, f, 657, { stagger: 1.8 }); });
    c.restore();
  }
  if (f >= 752 && f < 872) { // chips, ruta y el trazo que los une
    const X = LY.chipX, Wc = LY.chipW, [c1, c2] = LY.chipY, [r1, r2, r3] = LY.routeY, s0 = P(m, 1112, 760), CH = 168;
    const path = prepPath([s0, [X - 34, c1 + 150], [X - 22, c1 + CH / 2], [X - 22, c2 + CH / 2], [X - 10, c2 + CH + 30], [X + 34, r1], [X + 34, r2], [X + 34, r3]], 5);
    const K = [[752, 0], [764, lenAtIndex(path, 2)], [776, lenAtIndex(path, 3)], [790, lenAtIndex(path, 5)], [801, lenAtIndex(path, 6)], [812, path.len]];
    const end = stroke(c, ID, path, 0, keyed(K, f), 7);
    if (end && f < 818) bead(c, ID, end[0], end[1], 9);
    [[['Lun–Sáb 7:30–16:00', 'Dom 7:30–15:00'], c1, 764], [['Mercado Terán', 'Módulo IV'], c2, 776]].forEach(([ls, y, f0]) => {
      const k = back(eo(seg(f, f0, f0 + 22)), 0.9); if (k <= 0) return;
      const w = Wc * k, h = CH * k, x = X, yy = y + (CH - h) / 2;
      glass(c, ID, x, yy, w, h, 40 * Math.min(1, k), { tint: 'rgba(251,243,213,0.10)' });
      setD(c); c.save(); c.beginPath(); c.rect(x, yy, w, h); c.clip();
      gtext(c, ls[0], x + 38, y + 72, `600 42px ${IN}`, COL.crema, f, f0 + 8, { stagger: 0.7 });
      gtext(c, ls[1], x + 38, y + 128, `600 42px ${IN}`, 'rgba(251,243,213,0.86)', f, f0 + 14, { stagger: 0.7 });
      c.restore();
    });
    [['Entrada principal', r1, 790], ['Pasaje Arteaga', r2, 801], ['Módulo de cristal', r3, 812]].forEach(([t, y, f0]) => {
      const k = back(eo(seg(f, f0, f0 + 14)), 2); if (k <= 0) return;
      bead(c, ID, X + 34, y, 17 * k, COL.terra); setD(c);
      gtext(c, t, X + 74, y + 15, `500 42px ${IN}`, COL.crema, f, f0 + 3, { stagger: 0.4, dur: 12 });
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
    c.lineCap = 'round'; c.beginPath(); c.moveTo(x1 - 540, 0); c.lineTo(x2 - 540, 0); c.lineWidth = 11 * grow; // la línea en la que se recogió todo
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
  const m = camAt(f), sc = keyed(SCROLL, f), mp = pageM(m, sc), isoK = eio(seg(f, 660, 720)), inPhone = f >= 660;
  GP = null;
  drawField(f, fieldState(f, m, mp));
  B.setTransform(1, 0, 0, 1, 0, 0); B.drawImage(cGL, 0, 0);
  if (f >= 960) { A.setTransform(1, 0, 0, 1, 0, 0); A.drawImage(cB, 0, 0); endCard(A, f); return; }
  const sq = eio(seg(f, 844, 868)), showPage = f < 868; // colapso: todo se recoge en una línea
  if (sq > 0) { const k = 1 - sq * 0.997, y0 = LY.nameY + 62; GP = [1, 0, 0, k, 0, y0 * (1 - k)]; }
  if (showPage) {
    phoneBack(B, m, f, isoK);
    if (f > 672) { // pantalla: cristal oscuro que entra desde los bordes
      blurInto(cBb2, Bb2, cB, 34);
      const d = eio(seg(f, 672, 716)) * 545;
      B.save(); setM(B, m); B.beginPath(); B.roundRect(0, 0, 1080, VH, 124); if (d < 540) B.rect(d, d, 1080 - 2 * d, VH - 2 * d); B.clip('evenodd');
      B.setTransform(1, 0, 0, 1, 0, 0); B.drawImage(cBb2, 0, 0, W, H); B.fillStyle = 'rgba(16,12,9,0.66)'; B.fillRect(0, 0, W, H); B.restore();
    }
    B.save(); if (inPhone) clipScreen(B, m);
    if (f > 4) { const r = heroRect(f); shadow(B, mp, r.x, r.y, r.w, r.h, r.r, seg(f, 20, 60)); }
    EL.forEach(([k, type, f0, x]) => { if (type !== 'grow' || f < f0) return; const e = E[k]; if (e.y - sc > VH + 400 || e.y + e.h - sc < -400) return; const g = grown(e, f0, x, f); if (g) shadow(B, mp, g.x, g.y, g.w, g.h, g.r, clamp(g.k)); });
    if (f >= 130) { const end = stroke(B, mp, THREAD, 0, keyed(TKEY, f), 11); if (end && f < 580) bead(B, mp, end[0], end[1], 12 * (1 - seg(f, 560, 580))); } // hilo maestro
    B.restore();
  }
  blurInto(cBb, Bb, cB, 32);
  A.setTransform(1, 0, 0, 1, 0, 0); A.drawImage(cB, 0, 0);
  if (showPage) {
    A.save(); if (inPhone) clipScreen(A, m);
    pageContent(A, m, mp, f, sc);
    if (f >= 130 && f < 420) stroke(A, mp, THREAD, 0, Math.min(keyed(TKEY, f), lenAtIndex(THREAD, 4)), 11); // el servido cae del V60 por delante del cristal
    stickyUI(A, m, f, sc);
    A.restore();
    if (isoK > 0) { // contorno del teléfono dibujado por el trazo, cámara frontal y barra de inicio
      trace(A, m, BZ.x, BZ.y, BZ.w, BZ.h, BZ.r, eio(seg(f, 660, 712)), lerp(16, 0, eio(seg(f, 700, 736))), COL.terra);
      A.save(); setM(A, m); ell(A, 540, 30, 14 * isoK, 14 * isoK); A.fillStyle = '#050403'; A.fill(); A.lineWidth = 3; A.strokeStyle = 'rgba(251,243,213,0.25)'; A.stroke();
      rr(A, 540 - 130 * isoK, VH - 26, 260 * isoK, 10, 5); A.fillStyle = 'rgba(251,243,213,0.6)'; A.fill(); A.restore();
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
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No carga ' + src)); i.src = src; });
(async () => {
  try {
    UI = await (await fetch('ui/ui.json')).json();
    [IMG, BARIMG, V60IMG] = await Promise.all([loadImg('ui/page.png'), loadImg('ui/bar.png'), loadImg('ui/v60.png')]);
    await Promise.all([`700 40px ${SG}`, `500 40px ${SG}`, `500 40px ${IN}`, `600 40px ${IN}`, `700 40px ${IN}`].map((s) => document.fonts.load(s)));
    if (!document.fonts.check(`700 40px ${SG}`)) throw new Error('Falta Space Grotesk');
    build(); window.ready = true;
  } catch (e) { window.initError = String(e); }
})();
