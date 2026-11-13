// "El reflejo" · frame(t) determinista. El celular muestra la página real (video/cap), con una cámara, un campo de cristal y una línea de luz.
import { VERT, SCENE, BLUR, COMP, OUT } from './shaders.js';
const Q = new URLSearchParams(location.search);
const S = +(Q.get('s') || 0.5), SUB = +(Q.get('sub') || 8), FPS = 60;
const SQ = Q.get('fmt') === '1x1';   // re-layout 1:1: celular a la derecha, texto cinético a la izquierda
const W = 1080, H = SQ ? 1080 : 1920, ZM = SQ ? 0.6 : 1, AX = SQ ? 790 : 540, AY = H / 2, PW = Math.round(W * S), PH = Math.round(H * S);
const TL = await (await fetch('/brief/timeline.json')).json();
const R = await (await fetch('/video/cap/cajas.json')).json();
const F = f => f / FPS, WD = TL.palabras;

// ---------- utilidades ----------
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => cl((t - a) / (b - a));
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eSin = x => 0.5 - 0.5 * Math.cos(Math.PI * x);
const eO3 = x => 1 - Math.pow(1 - x, 3), eO4 = x => 1 - Math.pow(1 - x, 4), eO5 = x => 1 - Math.pow(1 - x, 5);
const eBack = x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
// pista por claves [cuadro, valor]; entre claves, seno
const track = (t, K) => { const f = t * FPS; if (f <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (f <= K[i][0]) return lerp(K[i - 1][1], K[i][1], eSin((f - K[i - 1][0]) / (K[i][0] - K[i - 1][0]))); return K[K.length - 1][1]; };
const TITLE = (w, px) => `${w} ${px}px "Barlow Condensed"`, TXT = (w, px) => `${w} ${px}px Inter`;

// ---------- assets ----------
const img = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error(src)); i.src = src; });
async function logoMask(src) {   // el logo viene sobre negro: se enmascara por luminosidad (no se redibuja ni se recolorea)
  const i = await img(src), c = new OffscreenCanvas(i.width, i.height), x = c.getContext('2d');
  x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let k = 0; k < p.length; k += 4) { const m = Math.max(p[k], p[k + 1], p[k + 2]) / 255, a = cl((m - 0.10) / 0.32); p[k + 3] = a * a * (3 - 2 * a) * 255; }
  x.putImageData(d, 0, 0); return c;
}
const [LOGO, TIRA, BARRA, FIJA, HOJA] = await Promise.all([logoMask('/web/img/logo.jpg'), img('/video/cap/tira.png'), img('/video/cap/barra.png'), img('/video/cap/fija.png'), img('/video/cap/hoja.png')]);
await Promise.all(['500', '600', '700'].map(w => document.fonts.load(TITLE(w, 80), 'ÁÉ')).concat(['400', '500', '600'].map(w => document.fonts.load(TXT(w, 40), 'ñ¡í·'))));

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
const texPar = () => { for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); };
function target(w, h) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); texPar();
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  return { t, f, w, h };
}
const BW = Math.round(PW / 4), BH = Math.round(PH / 4);
const T = { scene: target(PW, PH), b0: target(BW, BH), b1: target(BW, BH), acc: target(PW, PH) };
const uiC = new OffscreenCanvas(PW, PH), ui = uiC.getContext('2d');
const uiT = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, uiT); texPar();
function pass(pr, tg, tex = {}) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, tg ? tg.f : null); gl.viewport(0, 0, tg ? tg.w : PW, tg ? tg.h : PH);
  gl.useProgram(pr.p); let i = 0;
  for (const k in tex) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[k]); gl.uniform1i(pr.u[k], i++); }
  if (pr.u.uDes) gl.uniform2f(pr.u.uDes, W, H);
  return pr.u;
}
const draw = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

// ---------- mundo ----------
// Celular: pantalla de 390×844 px CSS a escala CS, con marco de 18.
const CS = 804 / 390, PHONE = { x: 540, y: 960, hx: 420, hy: 888, r: 96 }, PL = 138, PT = 90, SH = 844 * CS;
const T_SWEEP0 = 0.5, T_SWEEP1 = 2.0, VH = 844;
const K_SCROLL = [[335, 0], [378, 1353], [392, 1353], [440, 1741], [478, 1960], [482, 1960], [512, 3031], [524, 3031], [550, 3340], [600, 3340], [640, 4160]];
const K_Z = [[236, 1], [282, 1.45], [335, 1.45], [372, 1.1], [650, 1.1], [700, SQ ? 1.1 : 0.70], [714, SQ ? 1.1 : 0.70], [745, 1], [856, 1], [930, 0.5]];
const K_CY = [[236, 960], [282, 1430], [335, 1430], [372, 960], [650, 960], [700, SQ ? 960 : 788], [714, SQ ? 960 : 788], [745, 960]];
const LAY = SQ
  ? { cx: 123, hw: 2200, big: [-660, 650, 850], star0: [[80, 200], [420, 900], [150, 700], [1000, 120], [300, 80]], logo: [540, 420], ly: 560, ly2: 545 }
  : { cx: 540, hw: 700, big: [96, 650, 850], star0: [[150, 520], [930, 610], [240, 1500], [860, 1380], [560, 330]], logo: [540, 800], ly: 962, ly2: 978 };
const camera = t => ({ z: track(t, K_Z) * ZM, x: 540, y: track(t, K_CY), scroll: track(t, K_SCROLL) });
const toS = (c, x, y) => [(x - c.x) * c.z + AX, (y - c.y) * c.z + AY];
const wx = x => PL + x * CS, wy = (y, c) => PT + (y - c.scroll) * CS, wyF = y => PT + y * CS;   // página / fijo a la pantalla del celular
// visibilidad general de la página (aparece con el celular, se apaga en el retroceso)
const pageA = t => prog(t, 2.0, 2.5) * (1 - prog(t, F(900), F(928)));
const hojaK = t => eO4(prog(t, F(814), F(846)));

// línea de luz → extremos en pantalla
function line(t, c) {
  const f = t * FPS; let a, b, I = 1, w = 2.4, hI = 0, yW = 0;
  const hor = (x, y, hw) => { a = toS(c, x - hw, y); b = toS(c, x + hw, y); };
  if (t < T_SWEEP0) {                         // golpe y anticipación
    hor(LAY.cx, lerp(960, 400, eIO(prog(t, 0.1, T_SWEEP0))), lerp(4, LAY.hw, eO4(prog(t, 0, 0.085))));
    hI = 1.6 * (1 - prog(t, 0, 0.3)); w = lerp(5, 2.4, prog(t, 0, 0.25));
  } else if (t < T_SWEEP1) { yW = lerp(400, 1420, eO3(prog(t, T_SWEEP0, T_SWEEP1))); hor(LAY.cx, yW, LAY.hw); }   // barrido de pulido
  else if (f < 196) { yW = lerp(1420, PT - 6, eIO(prog(t, 2.0, F(196)))); hor(lerp(LAY.cx, 540, eO3(prog(t, 2.0, 2.6))), yW, lerp(LAY.hw, 404, eO3(prog(t, 2.0, 2.6)))); }   // sube y descubre la página
  else if (f < 520) {                         // cae y queda como la línea del título de la portada
    const k = eIO(prog(t, F(196), F(222))), L = R.linea; yW = -1e4;
    hor(540, lerp(PT - 6, wy(L.y + 1, c), k), lerp(404, L.w * CS / 2 + 4, k)); I = lerp(1, 0.9, k);
  } else if (f < 700) {                       // subraya la frase de la reseña
    const r = R.frase[R.frase.length - 1], k = eO4(prog(t, F(550), F(568))); yW = -1e4;
    a = toS(c, wx(r.x), wy(r.y + r.h + 3, c)); b = toS(c, wx(r.x + r.w * k), wy(r.y + r.h + 3, c)); I = 0.9 * prog(t, F(549), F(552)); w = 2;
  } else if (f < 932) {                       // llega al botón y queda como su subrayado
    const k = eO4(prog(t, F(716), F(738))), B = R.fija, y = wyF(B.y + B.h + 9); yW = -1e4;
    hor(lerp(-420, wx(B.x + B.w / 2), k), y, lerp(260, B.w * CS * 0.28, k)); I = 1 - hojaK(t);
  } else {                                    // último barrido bajo el logo → raya del end card
    const k = eO4(prog(t, F(936), F(958))), e = eIO(prog(t, F(960), F(990))); yW = -1e4;
    a = [540 - lerp(0, 215, k) * lerp(1, 0.42, e), lerp(LAY.ly, LAY.ly2, e)]; b = [540 + lerp(0, 215, k) * lerp(1, 0.42, e), lerp(LAY.ly, LAY.ly2, e)]; hI = 1.1 * (1 - k) * prog(t, F(934), F(937));
  }
  return { a, b, I, w: w * Math.max(c.z / ZM, 0.8), hI, yW, flash: Math.pow(1 - prog(t, 0, 0.22), 2.2) * 1.5 + 0.5 * Math.pow(1 - prog(t, F(960), F(972)), 2) * (t >= F(960)) };
}
function panels(t, c, ln) {
  const L = [], pA = pageA(t), kPh = eIO(prog(t, 2.0, 2.75));
  const add = (x, y, hx, hy, r, A, tint, el, bev, clip) => { const [sx, sy] = toS(c, x, y), iz = 1 / c.z; L.push({ inv: [iz, 0, 0, 0, iz, 0, -sx * iz, -sy * iz, 1], box: [hx, hy, r, A], par: [tint, el, bev, clip], scl: c.z }); };
  add(PHONE.x, PHONE.y, PHONE.hx, PHONE.hy, PHONE.r, cl(kPh * 1.6) * (1 - prog(t, F(900), F(928))), 0.8, 0, 14, 0);
  let n = 0;
  for (const q of R.cristal) {                // las tarjetas de cristal de la página, en su lugar real
    const y0 = wy(q.y, c), y1 = wy(q.y + q.h, c); if (y1 < PT - 20 || y0 > PT + SH + 20 || n >= 7) continue; n++;
    const rev = ln.yW > -1e3 && t >= 2.0 ? cl((y0 + (y1 - y0) / 2 - ln.yW) / 60) : 1;
    add(wx(q.x + q.w / 2), (y0 + y1) / 2, q.w * CS / 2, q.h * CS / 2, q.r * CS, pA * rev, 0.6, 0.5, 9, 1);
  }
  add(540, wyF(R.barra.h / 2), 402, R.barra.h * CS / 2, 0, pA * (ln.yW > -1e3 && t >= 2.0 ? cl((PT + 50 - ln.yW) / 50) : 1), 0.88, 0, 2, 1);
  const kh = hojaK(t);
  if (kh > 0) {
    const off = (1 - kh) * R.hoja.h, hy = R.hoja.h / 2 + 30;
    add(540, wyF(R.hoja.y + off + hy), 402, hy * CS, 28 * CS, pA, 0.95, 0.9, 10, 1);
    add(wx(R.resumen.x + R.resumen.w / 2), wyF(R.resumen.y + off + R.resumen.h / 2), R.resumen.w * CS / 2, R.resumen.h * CS / 2, 16 * CS, pA * kh, 0.45, 0.3, 7, 1);
  }
  return { L, kPh };
}
// estrellas del sello: salen como puntos de luz del reflejo y se abren en su lugar real
const STAR0 = LAY.star0;
function stars(t, c) {
  const out = R.estrellas.map((r, i) => {
    const t0 = F(240 + i * 6), k = eIO(prog(t, t0, t0 + 0.42)), km = eBack(prog(t, t0 + 0.34, t0 + 0.6));
    const [tx, ty] = toS(c, wx(r.x + r.w / 2), wy(r.y + r.h / 2 + 0.5, c)), arc = Math.sin(k * Math.PI) * (i % 2 ? 70 : -70);
    return { x: lerp(STAR0[i][0], tx, k) + arc, y: lerp(STAR0[i][1], ty, k), r: r.w * CS * 0.56 * c.z * lerp(0.8, 1, km), k: cl(km, 0, 1.15), A: prog(t, t0 - 0.05, t0 + 0.05) * (1 - prog(t, F(350), F(356))) };
  });
  // el punto de luz que queda al final y se abre en el logo
  out[4] = t >= F(880) ? { x: LAY.logo[0], y: LAY.logo[1], r: 34, k: 0, A: prog(t, F(896), F(912)) * (1 - prog(t, F(934), F(946))) } : out[4];
  return out;
}

// ---------- interfaz (canvas 2D, misma cámara) ----------
function glyphs(x, str, px, weight, ls, fam = TITLE) {
  x.font = fam(weight, px); const out = []; let cx = 0;
  for (const ch of str) { const w = x.measureText(ch).width; out.push({ ch, x: cx, w }); cx += w + ls; }
  return { g: out, w: cx - ls };
}
function kinetic(x, str, bx, by, px, t, t0, o = {}) {   // cada glifo sube desde su línea base tras una máscara
  const { weight = 600, ls = px * 0.012, stag = 0.02, dur = 0.32, align = 'left', color = '#F4F4F4', fam = TITLE, out = 0 } = o;
  const m = glyphs(x, str, px, weight, ls, fam); let ox = bx; if (align === 'center') ox -= m.w / 2;
  x.fillStyle = color; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  m.g.forEach((g, i) => {
    const k = prog(t, t0 + i * stag, t0 + i * stag + dur); if (k <= 0) return;
    const e = eO5(k), ko = out ? eIO(prog(t, out + i * 0.012, out + i * 0.012 + 0.22)) : 0;
    x.save(); x.beginPath(); x.rect(ox + g.x - px * 0.1, by - px * 0.82, g.w + px * 0.2, px * 0.90); x.clip();
    x.globalAlpha = cl(k * 3) * (1 - ko); x.fillText(g.ch, ox + g.x, by + (1 - e) * px * 0.8 - ko * px * 0.5); x.restore();
  });
  return m.w;
}
function rr(x, cx, cy, hx, hy, r) { x.beginPath(); x.roundRect(cx - hx, cy - hy, hx * 2, hy * 2, r); }
const dImg = (x, im, r, yW) => x.drawImage(im, wx(r.x), yW, r.w * CS, r.h * CS);
function drawUI(t, c, ln) {
  const x = ui, f = t * FPS; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, PW, PH); x.globalAlpha = 1;
  const world = () => x.setTransform(S * c.z, 0, 0, S * c.z, S * (AX - c.x * c.z), S * (AY - c.y * c.z));
  const pA = pageA(t), kEnd = 1 - prog(t, F(900), F(928));
  world();
  // 1) palabras del gancho → pasan a ser el antetítulo real de la portada
  const km = eO4(prog(t, F(104), F(142))), afs = R.ante.fs * CS, als = afs * 0.34;
  const gA = glyphs(x, 'DETALLADO BOUTIQUE', afs, 600, als), ex = wx(R.ante.x), ey = wy(R.ante.y, c) + afs * 0.9;
  const word = (s, f0, bx0, by0, bx1) => kinetic(x, s, lerp(bx0, bx1, km), lerp(by0, ey, km), lerp(212, afs, km), t, F(f0), { ls: lerp(212 * 0.012, als, km) });
  if (kEnd > 0) { x.globalAlpha = kEnd; word('DETALLADO', WD.DETALLADO, LAY.big[0], LAY.big[1], ex); word('BOUTIQUE', WD.BOUTIQUE, LAY.big[0], LAY.big[2], ex + gA.g[10].x); }
  // 2) la página real dentro de la pantalla del celular
  if (pA > 0) {
    x.save(); rr(x, PHONE.x, PHONE.y, PHONE.hx - 18, PHONE.hy - 18, PHONE.r - 18); x.clip();
    x.save();
    if (ln.yW > -1e3 && t >= 2.0) { x.beginPath(); x.rect(0, ln.yW, W, 4000); x.clip(); }      // la línea la va descubriendo
    x.globalAlpha = pA;
    const sy = cl(c.scroll, 0, R.alto - VH) * 3;
    x.drawImage(TIRA, 0, sy, 1170, VH * 3, PL, PT, 804, SH);
    x.drawImage(LOGO, wx(R.logo.x), wy(R.logo.y, c), R.logo.w * CS, R.logo.h * CS);
    x.fillStyle = '#F4F4F4'; x.font = TITLE(700, R.b50.fs * CS); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillText('5.0', wx(R.b50.x), wy(R.b50.y, c) + R.b50.fs * CS * 0.9);
    x.restore();
    // título de la portada, por glifo, en el lugar exacto del h1
    x.globalAlpha = pA;
    ['ALTO', 'NIVEL'].forEach((s, i) => { const h = R.h1[i], fs = h.fs * CS; kinetic(x, s, 540, wy(h.y, c) + fs * 0.84, fs, t, F(118 + i * 9), { weight: 700, align: 'center', stag: 0.03, dur: 0.42, ls: fs * 0.005 }); });
    // barra superior (fija)
    const kb = ln.yW > -1e3 && t >= 2.0 ? cl((PT + 50 - ln.yW) / 50) : 1;
    x.globalCompositeOperation = 'destination-out'; x.globalAlpha = kb; x.fillStyle = '#000'; x.fillRect(PL, PT, 804, R.barra.h * CS); x.globalCompositeOperation = 'source-over';
    x.globalAlpha = pA * kb; x.drawImage(BARRA, PL, PT, 804, R.barra.h * CS);
    // botón fijo "Agenda tu cita": aparece al dejar la portada
    const kh = hojaK(t), kf = eO4(prog(t, F(345), F(368))) * (1 - kh);
    if (kf > 0) {
      const B = R.fija, press = 1 - 0.05 * Math.sin(Math.PI * prog(t, F(808), F(820))), bx = wx(B.x + B.w / 2), by = wyF(B.y + B.h / 2) + (1 - kf) * 200;
      for (const f0 of [780, 810]) {          // el anillo pulsa con el kick
        const k = prog(t, F(f0), F(f0 + 24)); if (k <= 0 || k >= 1) continue; const g = eO3(k) * 46;
        x.globalAlpha = pA * (1 - k); x.lineWidth = lerp(5, 1.5, k); x.strokeStyle = '#E1251B'; x.shadowColor = '#E1251B'; x.shadowBlur = 26 * S * c.z;
        rr(x, bx, by, B.w * CS / 2 + g, B.h * CS / 2 + g, B.h * CS / 2 + g); x.stroke(); x.shadowBlur = 0;
      }
      x.globalAlpha = pA * cl(kf * 2);
      x.drawImage(FIJA, bx - B.w * CS / 2 * press, by - B.h * CS / 2 * press, B.w * CS * press, B.h * CS * press);
    }
    // hoja de cita real (paso 3, mensaje listo)
    if (kh > 0) {
      const off = (1 - kh) * R.hoja.h * CS, hy0 = wyF(R.hoja.y) + off;
      x.globalAlpha = 0.62 * kh * pA; x.fillStyle = '#000'; x.fillRect(PL, PT, 804, SH);
      x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 1; x.beginPath(); x.roundRect(PL, hy0, 804, R.hoja.h * CS + 200, 28 * CS); x.fill(); x.globalCompositeOperation = 'source-over';
      x.globalAlpha = pA; x.drawImage(HOJA, PL, hy0, 804, R.hoja.h * CS);
    }
    x.restore();
  }
  // 3) elementos en espacio de pantalla
  x.setTransform(S, 0, 0, S, 0, 0); x.globalAlpha = 1;
  if (f > 660 && f < 740 && SQ) { kinetic(x, 'TU', 64, 470, 176, t, F(672), { weight: 700, out: F(708) }); kinetic(x, 'PÁGINA', 64, 640, 176, t, F(WD['TU PAGINA']), { weight: 700, out: F(710) }); }
  else if (f > 660 && f < 740) { const g = glyphs(x, 'TU PÁGINA', 220, 700, 220 * 0.012), x0 = 540 - g.w / 2; kinetic(x, 'TU', x0, 400, 220, t, F(672), { weight: 700, out: F(708) }); kinetic(x, 'PÁGINA', x0 + g.g[3].x, 400, 220, t, F(WD['TU PAGINA']), { weight: 700, out: F(710) }); }
  if (SQ) for (const [ls, f0, f1] of [[['CINCO', 'ESTRELLAS'], 242, 328], [['SERVICIOS'], 372, 474], [['RESEÑAS'], 512, 596], [['AGENDA', 'TU CITA'], 732, 850]])   // 1:1: el rótulo de cada sección vive a la izquierda
    if (f > f0 - 2 && f < f1 + 20) ls.forEach((l, i) => kinetic(x, l, 56, 540 + (i - (ls.length - 1) / 2) * 88 + 28, 80, t, F(f0 + i * 8), { weight: 700, out: F(f1) }));
  if (f >= 930 && f < 990) {                  // logo oficial, tamaño moderado
    const k = eO4(prog(t, F(932), F(958))), lw = 430 * lerp(0.55, 1, k), lh = lw * LOGO.height / LOGO.width;
    x.globalAlpha = cl(k * 1.6) * (1 - prog(t, F(960), F(974))); x.drawImage(LOGO, LAY.logo[0] - lw / 2, LAY.logo[1] - lh / 2, lw, lh); x.globalAlpha = 1;
  }
  if (f >= 960) {                             // end card
    const c1 = (s, y, px, f0, o = {}) => kinetic(x, s, 540, y, px, t, F(f0), { align: 'center', ...o });
    const Y = SQ ? [270, 410, 500, 690, 925, 985] : [610, 770, 900, 1120, 1400, 1470];
    c1('PRECIOS ACCESIBLES', Y[0], 62, 962, { weight: 600, ls: 9, stag: 0.012 });
    let px = 150; x.font = TITLE(700, px); const tw = x.measureText('DESDE $1,000 PESOS').width; if (tw > 880) px *= 880 / tw;
    c1('DESDE $1,000 PESOS', Y[1], px, 968, { weight: 700, stag: 0.018, dur: 0.4 });
    c1('POR TU PÁGINA', Y[2], 62, 976, { weight: 600, ls: 9, stag: 0.012 });
    c1('Paquete de 3 videos promocionales: $1,500', Y[3], 44, 990, { weight: 500, fam: TXT, ls: 0, stag: 0.006, dur: 0.3 });
    c1('Elevate Negocios · Aguascalientes', Y[4], 32, 1004, { weight: 500, fam: TXT, ls: 0.6, stag: 0.006, dur: 0.3 });
    c1('Demo de cortesía de Elevate Negocios · pieza no oficial', Y[5], 23, 1012, { weight: 400, fam: TXT, ls: 0.3, stag: 0.004, dur: 0.3 });
  }
}

// ---------- cuadro ----------
function sub(t, wgt) {
  const c = camera(t), ln = line(t, c), { L, kPh } = panels(t, c, ln), st = stars(t, c);
  const cam = [Math.sin(t * 0.5) * 26 + 12 * t, -c.scroll * 0.02, 30 * t + c.scroll * 0.09 + (c.z - 1) * 200];
  let u = pass(P.scene, T.scene);
  gl.uniform4f(u.uLine, ...ln.a, ...ln.b); gl.uniform4f(u.uLineP, ln.I, ln.w, 0.5, ln.hI);
  gl.uniform1f(u.uFlash, ln.flash); gl.uniform1f(u.uT, t); gl.uniform3f(u.uCam, ...cam);
  const revY = t < T_SWEEP0 ? -500 : t < T_SWEEP1 ? ln.a[1] : 4000;
  gl.uniform1f(u.uRevY, revY); gl.uniform1f(u.uRevGain, lerp(1, 0.75, kPh)); gl.uniform1f(u.uOffY, lerp(-200, 2100, eIO(prog(t, F(862), F(922))))); draw();
  u = pass(P.blur, T.b0, { uTex: T.scene.t }); gl.uniform2f(u.uStep, 0, 0); draw();
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
// frame(t): t en segundos. Subcuadros con obturador de 180°.
window.frame = (t, shutter = 0.5 / FPS) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, T.acc.f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  for (let k = 0; k < SUB; k++) sub(t + (k / SUB) * shutter, 1 / SUB);
  const u = pass(P.out, null, { uTex: T.acc.t }); gl.uniform1f(u.uSeed, (t * 977) % 61); draw();
};
window.shot = (t, sh, q) => { window.frame(t, sh); return cv.toDataURL(q ? 'image/jpeg' : 'image/png', q || undefined).split(',')[1]; };
window.ready = true;
