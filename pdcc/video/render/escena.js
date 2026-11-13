// "El reflejo" · frame(t) determinista. Una cámara, un campo de cristal, una línea de luz.
import { VERT, SCENE, BLUR, COMP, OUT } from './shaders.js';
const Q = new URLSearchParams(location.search);
const S = +(Q.get('s') || 0.5), SUB = +(Q.get('sub') || 8), FPS = 60;
const W = 1080, H = 1920, PW = Math.round(W * S), PH = Math.round(H * S);
const TL = await (await fetch('/brief/timeline.json')).json();
const F = f => f / FPS, WD = TL.palabras;

// ---------- utilidades ----------
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => cl((t - a) / (b - a));
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eSin = x => 0.5 - 0.5 * Math.cos(Math.PI * x);
const eO3 = x => 1 - Math.pow(1 - x, 3), eO4 = x => 1 - Math.pow(1 - x, 4), eO5 = x => 1 - Math.pow(1 - x, 5);
const eBack = x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
const TITLE = (w, px) => `${w} ${px}px "Barlow Condensed"`, TXT = (w, px) => `${w} ${px}px Inter`;

// ---------- assets ----------
const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
// El logo viene sobre negro: se enmascara por luminosidad (no se redibuja ni se recolorea).
async function logoMask(src) {
  const i = await img(src), c = new OffscreenCanvas(i.width, i.height), x = c.getContext('2d');
  x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let k = 0; k < p.length; k += 4) {
    const m = Math.max(p[k], p[k + 1], p[k + 2]) / 255, a = cl((m - 0.10) / 0.32);
    p[k + 3] = a * a * (3 - 2 * a) * 255;
  }
  x.putImageData(d, 0, 0); return c;
}
const LOGO = await logoMask('/assets/01b_logo_flyer_ortografia_correcta.jpg');
await Promise.all(['500', '600', '700'].map(w => document.fonts.load(TITLE(w, 80), 'ÁÉ')).concat(['400', '500', '600', '700'].map(w => document.fonts.load(TXT(w, 40), 'ñ¡'))));

// ---------- GL ----------
const cv = document.getElementById('c'); cv.width = PW; cv.height = PH;
const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('sin FBO flotante');
gl.getExtension('OES_texture_float_linear');
function prog_(fs) {
  const p = gl.createProgram();
  for (const [ty, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, nm); }
  return { p, u };
}
const P = { scene: prog_(SCENE), blur: prog_(BLUR), comp: prog_(COMP), out: prog_(OUT) };
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
function target(w, h) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  return { t, f, w, h };
}
const BW = Math.round(PW / 4), BH = Math.round(PH / 4);
const T = { scene: target(PW, PH), b0: target(BW, BH), b1: target(BW, BH), acc: target(PW, PH) };
const uiC = new OffscreenCanvas(PW, PH), ui = uiC.getContext('2d');
const uiT = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, uiT);
for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
function pass(pr, tg, tex = {}) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, tg ? tg.f : null); gl.viewport(0, 0, tg ? tg.w : PW, tg ? tg.h : PH);
  gl.useProgram(pr.p); let i = 0;
  for (const k in tex) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[k]); gl.uniform1i(pr.u[k], i++); }
  if (pr.u.uDes) gl.uniform2f(pr.u.uDes, W, H);
  return pr.u;
}
const draw = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

// ---------- mundo ----------
const PHONE = { x: 540, y: 960, hx: 420, hy: 820, r: 92 };
const PTOP = PHONE.y - PHONE.hy, PLEFT = PHONE.x - PHONE.hx;
const T_SWEEP0 = 0.5, T_SWEEP1 = 2.0;
const SC_RATING = 1530;
function camera(t) {
  const k = eSin(prog(t, 4.0, 5.0));
  return { z: lerp(1, 1.22, k), x: 540, y: 960, scroll: lerp(0, SC_RATING, k) };
}
const toS = (c, x, y) => [(x - c.x) * c.z + W / 2, (y - c.y) * c.z + H / 2];
// línea de luz, en coordenadas de mundo
function line(t, c) {
  let y, hw, I = 1, w = 2.4, head = 0.5, hI = 0;
  if (t < T_SWEEP0) {                       // golpe y anticipación
    const g = eO4(prog(t, 0, 0.085)); hw = lerp(4, 700, g);
    y = lerp(960, 400, eIO(prog(t, 0.1, T_SWEEP0))); hI = 1.6 * (1 - prog(t, 0, 0.3)); w = lerp(5, 2.4, prog(t, 0, 0.25));
  } else if (t < T_SWEEP1) {                // barrido de pulido
    y = lerp(400, 1420, eO3(prog(t, T_SWEEP0, T_SWEEP1))); hw = 700;
  } else if (t < F(196)) {                  // sube, se acorta y descubre el logo
    const k = eIO(prog(t, 2.0, F(196))); y = lerp(1420, PTOP + 312, k); hw = lerp(700, 300, eO3(prog(t, 2.0, 2.6)));
  } else {                                  // cae y se queda de subrayado del título
    const k = eIO(prog(t, F(196), F(222))); y = lerp(PTOP + 312, PTOP + 1058, k) - c.scroll; hw = lerp(300, 150, k); I = lerp(1, 0.85, k);
  }
  const a = toS(c, 540 - hw, y), b = toS(c, 540 + hw, y);
  return { a, b, I, w: w * c.z, head, hI, yW: y, flash: Math.pow(1 - prog(t, 0, 0.22), 2.2) * 1.5 };
}
function panels(t, c) {
  const L = [], add = (x, y, hx, hy, r, A, tint, el, bev, clip) => {
    const [sx, sy] = toS(c, x, y), iz = 1 / c.z;
    L.push({ inv: [iz, 0, 0, 0, iz, 0, -sx * iz, -sy * iz, 1], box: [hx, hy, r, A], par: [tint, el, bev, clip], scl: c.z });
  };
  const kPh = eIO(prog(t, 2.0, 2.75));
  add(PHONE.x, PHONE.y, PHONE.hx, PHONE.hy, PHONE.r, cl(kPh * 1.6), 0.78, 0, 16, 0);
  const py = y => PTOP + y - c.scroll;
  const kb = eBack(prog(t, F(200), F(226)));                       // botón del hero
  add(540, py(1320) + (1 - kb) * 40, 230 * kb, 56 * kb, 56 * kb, prog(t, F(200), F(210)), 0.55, 0.5 * kb, 9, 1);
  const kr = eO4(prog(t, F(246), F(280)));                         // tarjeta de calificación
  add(540, py(2135) + (1 - kr) * 90, 360, 265, 44, kr, 0.6, 0.8 * kr, 12, 1);
  const kc = eBack(prog(t, F(306), F(330)));                       // chip
  add(540, py(2315), 285 * kc, 40 * kc, 40 * kc, prog(t, F(306), F(314)), 0.35, 0.35 * kc, 6, 1);
  const kv = eO4(prog(t, F(318), F(352)));                         // reseña 1
  add(540, py(2580) + (1 - kv) * 160, 360, 120, 36, kv, 0.6, 0.8 * kv, 12, 1);
  return { L, kPh };
}
// estrellas: salen como puntos de luz del reflejo y se abren
const STAR0 = [[150, 520], [930, 610], [240, 1500], [860, 1380], [560, 330]];
function stars(t, c) {
  return STAR0.map((s0, i) => {
    const t0 = F(240 + i * 6), k = eIO(prog(t, t0, t0 + 0.42)), km = eBack(prog(t, t0 + 0.34, t0 + 0.6));
    const [tx, ty] = toS(c, 540 + (i - 2) * 112, PTOP + 2190 - c.scroll);
    const arc = Math.sin(k * Math.PI) * (i % 2 ? 70 : -70);
    return { x: lerp(s0[0], tx, k) + arc, y: lerp(s0[1], ty, k), r: 40 * c.z * lerp(0.75, 1, km), k: cl(km, 0, 1.15), A: prog(t, t0 - 0.05, t0 + 0.05) };
  });
}

// ---------- interfaz (canvas 2D, misma cámara) ----------
function glyphs(x, str, px, weight, ls, fam = TITLE) {
  x.font = fam(weight, px); const out = []; let cx = 0;
  for (const ch of str) { const w = x.measureText(ch).width; out.push({ ch, x: cx, w }); cx += w + ls; }
  return { g: out, w: cx - ls };
}
// palabra cinética: cada glifo sube desde su línea base tras una máscara
function kinetic(x, str, bx, by, px, t, t0, o = {}) {
  const { weight = 600, ls = px * 0.012, stag = 0.02, dur = 0.32, align = 'left', color = '#F4F4F4', fam = TITLE } = o;
  const m = glyphs(x, str, px, weight, ls, fam); let ox = bx; if (align === 'center') ox -= m.w / 2;
  x.fillStyle = color; x.textBaseline = 'alphabetic';
  m.g.forEach((g, i) => {
    const k = prog(t, t0 + i * stag, t0 + i * stag + dur); if (k <= 0) return;
    const e = eO5(k);
    x.save(); x.beginPath(); x.rect(ox + g.x - px * 0.1, by - px * 0.82, g.w + px * 0.2, px * 0.90); x.clip();
    x.globalAlpha = cl(k * 3); x.fillText(g.ch, ox + g.x, by + (1 - e) * px * 0.8); x.restore();
  });
  return m.w;
}
function rr(x, cx, cy, hx, hy, r) { x.beginPath(); x.roundRect(cx - hx, cy - hy, hx * 2, hy * 2, r); }
function drawUI(t, c, ln) {
  const x = ui; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, PW, PH);
  x.setTransform(S * c.z, 0, 0, S * c.z, S * (W / 2 - c.x * c.z), S * (H / 2 - c.y * c.z));
  const py = y => PTOP + y - c.scroll;
  // 1) palabras del gancho → pasan a ser el antetítulo de la página
  const km = eO4(prog(t, F(104), F(142)));
  x.font = TITLE(600, 48); const eyeLS = 7;
  const w1 = glyphs(x, 'DETALLADO', 48, 600, eyeLS).w, w2 = glyphs(x, 'BOUTIQUE', 48, 600, eyeLS).w, gap = 26;
  const ex = 540 - (w1 + gap + w2) / 2, ey = py(760);
  const word = (s, f0, bx0, by0, bx1) => {
    const px = lerp(212, 48, km);
    kinetic(x, s, lerp(bx0, bx1, km), lerp(by0, ey, km), px, t, F(f0), { ls: lerp(212 * 0.012, eyeLS, km) });
  };
  word('DETALLADO', WD.DETALLADO, 96, 650, ex); word('BOUTIQUE', WD.BOUTIQUE, 96, 850, ex + w1 + gap);
  // 2) página dentro del celular
  const kPh = prog(t, 2.0, 2.75);
  x.save(); rr(x, PHONE.x, PHONE.y, PHONE.hx - 3, PHONE.hy - 3, PHONE.r - 3); if (kPh >= 1) x.clip();
  // barra superior
  const kn = eO4(prog(t, F(150), F(180)));
  if (kn > 0) {
    x.globalAlpha = kn; x.fillStyle = '#F4F4F4'; x.font = TXT(600, 22); x.textBaseline = 'middle';
    let cx = PLEFT + 64; for (const ch of 'PRO DETAILING CAR CARE') { x.fillText(ch, cx, py(118)); cx += x.measureText(ch).width + 4.2; }
    for (let i = 0; i < 2; i++) { x.fillRect(PLEFT + 840 - 64 - 44, py(110 + i * 14), 44, 3); }
    x.globalAlpha = 1;
  }
  // logo: lo descubre la línea al subir
  const lw = 470, lh = lw * LOGO.height / LOGO.width, ly = py(330);
  if (t >= 2.0 && ln.yW < ly + lh || t >= F(196)) {
    x.save(); x.beginPath(); const top = t >= F(196) ? ly - 10 : Math.max(ln.yW, ly - 10);
    x.rect(540 - lw / 2 - 10, top, lw + 20, ly + lh + 10 - top); x.clip();
    x.drawImage(LOGO, 540 - lw / 2, ly, lw, lh); x.restore();
  }
  // título
  let tp = 230; x.font = TITLE(700, tp); const tw = x.measureText('ALTO NIVEL').width; if (tw > 690) tp *= 690 / tw;
  kinetic(x, 'ALTO NIVEL', 540, py(1000), tp, t, F(WD['ALTO NIVEL']), { weight: 700, align: 'center', stag: 0.03, dur: 0.42 });
  const ks = eO4(prog(t, F(210), F(236)));
  if (ks > 0) { x.globalAlpha = ks; x.fillStyle = '#F4F4F4'; x.font = TXT(500, 36); x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText('Zapopan, Jalisco', 540, py(1142) + (1 - ks) * 14); x.globalAlpha = 1; }
  const kb = prog(t, F(206), F(226));
  if (kb > 0) { x.globalAlpha = kb; x.fillStyle = '#F4F4F4'; x.font = TXT(600, 34); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Agenda tu cita', 540, py(1322)); x.globalAlpha = 1; }
  // calificación
  const kr = eO4(prog(t, F(246), F(280)));
  if (kr > 0) {
    const off = (1 - kr) * 90; x.globalAlpha = kr; x.fillStyle = '#F4F4F4'; x.textAlign = 'center';
    const val = lerp(0, 5, eO3(prog(t, F(252), F(312))));
    x.font = TITLE(700, 250); x.textBaseline = 'alphabetic'; x.fillText(val.toFixed(1), 540, py(2110) + off);
    x.font = TXT(600, 20); let s = 'CALIFICACIÓN EN GOOGLE', wS = 0; for (const ch of s) wS += x.measureText(ch).width + 5;
    x.textAlign = 'left'; let cx = 540 - wS / 2; for (const ch of s) { x.fillText(ch, cx, py(1903) + off); cx += x.measureText(ch).width + 5; }
    x.globalAlpha = 1;
  }
  const kc = prog(t, F(310), F(326));
  if (kc > 0) { x.globalAlpha = kc; x.fillStyle = '#F4F4F4'; x.font = TXT(500, 28); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('más de 160 reseñas en Google', 540, py(2316)); x.globalAlpha = 1; }
  const kv = eO4(prog(t, F(318), F(352)));
  if (kv > 0) {
    const off = (1 - kv) * 160; x.globalAlpha = kv; x.fillStyle = '#F4F4F4'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.font = TXT(600, 46); x.fillText('“¡El mejor servicio', 232, py(2572) + off); x.fillText('de detailing!”', 232, py(2632) + off);
    x.fillStyle = '#E1251B'; x.fillRect(232, py(2510) + off, 44, 4);
    x.globalAlpha = 1;
  }
  x.restore();
}

// ---------- cuadro ----------
function sub(t, wgt) {
  const c = camera(t), ln = line(t, c), { L, kPh } = panels(t, c), st = stars(t, c);
  const cam = [Math.sin(t * 0.5) * 26 + 12 * t, -c.scroll * 0.1, 30 * t + c.scroll * 0.22 + (c.z - 1) * 200];
  let u = pass(P.scene, T.scene);
  gl.uniform4f(u.uLine, ...ln.a, ...ln.b); gl.uniform4f(u.uLineP, ln.I, ln.w, ln.head, ln.hI);
  gl.uniform1f(u.uFlash, ln.flash); gl.uniform1f(u.uT, t); gl.uniform3f(u.uCam, ...cam);
  const revY = t < T_SWEEP0 ? -500 : t < T_SWEEP1 ? ln.a[1] : 4000;
  gl.uniform1f(u.uRevY, revY); gl.uniform1f(u.uRevGain, lerp(1, 0.7, kPh)); draw();
  u = pass(P.blur, T.b0, { uTex: T.scene.t }); gl.uniform2f(u.uStep, 0, 0); draw();   // reducción ×4
  for (let i = 0; i < 3; i++) {
    u = pass(P.blur, T.b1, { uTex: T.b0.t }); gl.uniform2f(u.uStep, (1 + i * 0.6) / BW, 0); draw();
    u = pass(P.blur, T.b0, { uTex: T.b1.t }); gl.uniform2f(u.uStep, 0, (1 + i * 0.6) / BH); draw();
  }
  drawUI(t, c, ln);
  gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, uiT);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uiC);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  u = pass(P.comp, T.acc, { uScene: T.scene.t, uBlur: T.b0.t, uUI: uiT });
  gl.uniform1i(u.uN, L.length); gl.uniform1f(u.uMorph, kPh < 1 ? eIO(kPh) : 1); gl.uniform1f(u.uW, wgt); gl.uniform3f(u.uCam, ...cam);
  gl.uniform4f(u.uLine, ...ln.a, ...ln.b); gl.uniform4f(u.uLineP, ln.I, ln.w, 0, 0);
  gl.uniformMatrix3fv(u.uInv, false, new Float32Array(L.flatMap(p => p.inv)));
  gl.uniform4fv(u.uBox, new Float32Array(L.flatMap(p => p.box))); gl.uniform4fv(u.uPar, new Float32Array(L.flatMap(p => p.par)));
  gl.uniform1fv(u.uScl, new Float32Array(L.map(p => p.scl)));
  gl.uniform4fv(u.uStar, new Float32Array(st.flatMap(s => [s.x, s.y, s.r, s.k]))); gl.uniform1fv(u.uStarA, new Float32Array(st.map(s => s.A)));
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); draw(); gl.disable(gl.BLEND);
}
// frame(t): t en segundos. 8 subcuadros con obturador de 180° a 60 fps.
window.frame = (t, shutter = 0.5 / FPS) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, T.acc.f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  for (let k = 0; k < SUB; k++) sub(t + (k / SUB) * shutter, 1 / SUB);
  const u = pass(P.out, null, { uTex: T.acc.t }); gl.uniform1f(u.uSeed, (t * 977) % 61); draw();
};
window.shot = (t, sh, q) => { window.frame(t, sh); return cv.toDataURL(q ? 'image/jpeg' : 'image/png', q || undefined).split(',')[1]; };
window.ready = true;
