// La cinta: una sola forma dibujada con campos de distancia (SDF) en WebGL2.
// Trazo (polilínea con rango de dibujo) + formas (marco redondeado, disco, aro, pétalos).
// Las transformaciones interpolan los campos de distancia, no la opacidad.
const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes; uniform float uK;
uniform vec2 uPts[40]; uniform float uCum[40]; uniform int uN; uniform float uLen; uniform vec2 uRange; uniform float uW;
uniform int uTA, uTB; uniform vec4 uA1, uA2, uB1, uB2;
uniform float uM, uM2, uOW; uniform vec4 uFill;
uniform vec4 uBl1[6]; uniform vec4 uBl2[6]; uniform int uBN;
uniform vec3 uPal[6]; uniform float uPhase, uBands; uniform int uMode; uniform vec4 uSolid; uniform float uVol;

vec3 pal(float x){
  float i = floor(x); float f = fract(x);
  vec3 c0 = uPal[int(mod(i, 6.))], c1 = uPal[int(mod(i + 1., 6.))];
  return mix(c0, c1, smoothstep(.78, 1., f));
}
float sdRBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float sdVesica(vec2 p, float hl, float hw){
  if (hl <= hw * 1.02) return length(p) - hw;
  float d = (hl * hl - hw * hw) / (2. * hw); float r = hw + d;
  p = abs(p); float b = hl;
  return ((p.y - b) * d > p.x * b) ? length(p - vec2(0., b)) : length(p - vec2(-d, 0.)) - r;
}
float shape(int t, vec4 A, vec4 B, vec2 p, out vec3 col){
  vec2 q = p - A.xy;
  col = pal(atan(q.y, q.x) / 6.2831853 * 6. + uPhase);
  if (t == 1) return sdRBox(q, A.zw, B.x);
  if (t == 2) return length(q) - A.z;
  if (t == 4) return abs(length(q) - A.z) - A.w * .5;
  if (t == 3) {
    float d = 1e5;
    for (int i = 0; i < 6; i++) { if (i >= uBN) break;
      vec4 b1 = uBl1[i], b2 = uBl2[i]; vec2 r = p - b1.xy; float c = cos(b1.z), s = sin(b1.z);
      r = vec2(c * r.x + s * r.y, -s * r.x + c * r.y);
      float di = sdVesica(r, b1.w, b2.x);
      if (di < d) { d = di; col = b2.yzw; }
    }
    return d;
  }
  return 1e5;
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uK;
  float dP = 1e5; vec3 cP = vec3(0.);
  if (uMode == 1 || uMode == 3) {
    float sBest = 0.;
    for (int i = 0; i < 39; i++) { if (i >= uN - 1) break;
      vec2 a = uPts[i], b = uPts[i + 1]; vec2 ab = b - a; float L = max(length(ab), 1e-4);
      float h0 = (uRange.x * uLen - uCum[i]) / L, h1 = (uRange.y * uLen - uCum[i]) / L;
      if (h1 < 0. || h0 > 1.) continue;
      float h = clamp(dot(p - a, ab) / (L * L), max(0., h0), min(1., h1));
      float d = length(p - a - ab * h);
      if (d < dP) { dP = d; sBest = (uCum[i] + h * L) / uLen; }
    }
    dP -= uW * .5; cP = pal(sBest * uBands + uPhase);
  }
  float d = dP; vec3 col = cP; float dFill = 1e5;
  if (uMode >= 2) {
    vec3 cA, cB; float A = shape(uTA, uA1, uA2, p, cA); float B = A; cB = cA;
    if (uTB > 0) B = shape(uTB, uB1, uB2, p, cB);
    float dF = mix(A, B, uM2); vec3 cS = mix(cA, cB, uM2); dFill = dF;
    float dS = uOW > 0. ? abs(dF) - uOW * .5 : dF;
    if (uMode == 2) { d = dS; col = cS; } else { d = mix(dP, dS, uM); col = mix(cP, cS, uM); }
  }
  col = mix(col, uSolid.rgb, uSolid.a);
  float aa = .9 / uK;
  float al = 1. - smoothstep(-aa, aa, d);
  col *= 1. - .2 * smoothstep(-9., 0., d);          // borde un poco más oscuro: volumen de cinta impresa
  col += .1 * smoothstep(-5., -16., d);             // centro más claro
  if (uVol > 0. && uTA == 4) {                      // aro con volumen: sección de toro iluminada (único aro 3D del video)
    vec2 q = p - uA1.xy; float rr = length(q); float x = clamp((rr - uA1.z) / (uA1.w * .5), -1., 1.);
    vec3 n = normalize(vec3(q / max(rr, 1e-3) * x, sqrt(max(0., 1. - x * x)))); vec3 Ld = normalize(vec3(-.5, -.7, .62));
    float dif = max(dot(n, Ld), 0.); float sp = pow(max(reflect(-Ld, n).z, 0.), 26.);
    col = mix(col, col * (.42 + .9 * dif) + sp * .65, uVol);
  }
  o = vec4(col * al, al);
  if (uFill.a > 0. && uMode >= 2) { float fa = (1. - smoothstep(-aa, aa, dFill)) * uFill.a; o += vec4(uFill.rgb * fa, fa) * (1. - al); }
}`;

export function crearCinta(W, H, K, paleta) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL2 no disponible');
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.bindAttribLocation(pr, 0, 'a'); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  gl.uniform2f(U('uRes'), W, H); gl.uniform1f(U('uK'), K);
  gl.uniform3fv(U('uPal'), new Float32Array(paleta.flat()));
  const forma = (s) => {
    if (!s) return [0, [0, 0, 0, 0], [0, 0, 0, 0]];
    if (s.t === 'marco') return [1, [s.x, s.y, s.hw, s.hh], [s.r, 0, 0, 0]];
    if (s.t === 'disco') return [2, [s.x, s.y, s.r, 0], [0, 0, 0, 0]];
    if (s.t === 'aro') return [4, [s.x, s.y, s.r, s.w], [0, 0, 0, 0]];
    if (s.t === 'petalos') return [3, [s.x || 0, s.y || 0, 0, 0], [0, 0, 0, 0]];
    return [0, [0, 0, 0, 0], [0, 0, 0, 0]];
  };
  function dibujar(c) {
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!c || !c.modo) return cv;
    const pts = c.pts || [[0, 0], [1, 0]];
    const P = new Float32Array(80), C = new Float32Array(40); let L = 0;
    for (let i = 0; i < Math.min(40, pts.length); i++) {
      P[i * 2] = pts[i][0]; P[i * 2 + 1] = pts[i][1];
      if (i) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      C[i] = L;
    }
    gl.uniform2fv(U('uPts'), P); gl.uniform1fv(U('uCum'), C); gl.uniform1i(U('uN'), Math.min(40, pts.length)); gl.uniform1f(U('uLen'), Math.max(L, 1e-3));
    const r = c.rango || [0, 1]; gl.uniform2f(U('uRange'), r[0], Math.max(r[0], r[1])); gl.uniform1f(U('uW'), c.w || 20);
    const [ta, a1, a2] = forma(c.A), [tb, b1, b2] = forma(c.B);
    gl.uniform1i(U('uTA'), ta); gl.uniform4fv(U('uA1'), a1); gl.uniform4fv(U('uA2'), a2);
    gl.uniform1i(U('uTB'), tb); gl.uniform4fv(U('uB1'), b1); gl.uniform4fv(U('uB2'), b2);
    gl.uniform1f(U('uM'), c.m ?? 1); gl.uniform1f(U('uM2'), c.m2 ?? 0); gl.uniform1f(U('uOW'), c.ow || 0);
    gl.uniform4fv(U('uFill'), c.relleno || [0, 0, 0, 0]);
    const bl = c.petalos || []; const B1 = new Float32Array(24), B2 = new Float32Array(24);
    bl.slice(0, 6).forEach((b, i) => { B1.set([b.x, b.y, b.ang, b.hl], i * 4); B2.set([b.hw, ...b.col], i * 4); });
    gl.uniform4fv(U('uBl1'), B1); gl.uniform4fv(U('uBl2'), B2); gl.uniform1i(U('uBN'), Math.min(6, bl.length));
    gl.uniform1f(U('uPhase'), c.fase || 0); gl.uniform1f(U('uBands'), c.bandas ?? 5);
    gl.uniform4fv(U('uSolid'), c.solido || [0, 0, 0, 0]); gl.uniform1f(U('uVol'), c.vol || 0);
    gl.uniform1i(U('uMode'), c.modo);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return cv;
  }
  return { cv, dibujar };
}
