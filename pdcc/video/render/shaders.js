// Shaders compartidos. Coordenadas en px de diseño (1080×1920), origen arriba-izquierda.
export const VERT = `#version 300 es
in vec2 a; out vec2 vUV;
void main(){ vUV = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2 uDes;      // tamaño de diseño
in vec2 vUV; out vec4 o;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float n1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(hash(vec2(i,7.)),hash(vec2(i+1.,7.)),f); }
// Luminarias del techo reflejadas en un plano de espejo visto en perspectiva.
// cam.x: desplazamiento lateral, cam.y: altura del horizonte, cam.z: avance.
vec3 dots(vec2 p, vec3 cam, float blurK){
  float hor = -2000. + cam.y, f = 900.;
  float dy = p.y - hor;
  float Z = f*2960./dy;
  float X = (p.x - uDes.x*0.5)*Z/f + cam.x;
  vec2 cell = vec2(150., 46.);
  vec2 g = vec2(X, Z + cam.z)/cell;
  vec2 id = floor(g); vec2 q = (fract(g)-0.5)*cell;
  float h = hash(id);
  float sx = f/Z;
  vec2 qs = q*vec2(sx, dy/Z);              // distancia en px de pantalla
  float rect = step(0.88, h);
  vec2 hs = mix(vec2(8.5), vec2(28., 9.), rect)*sx;
  vec2 dq = abs(qs) - hs + hs.y;
  float d = length(max(dq,0.)) + min(max(dq.x,dq.y),0.) - hs.y;
  float soft = 1.1 + blurK;
  float core = smoothstep(soft, -soft, d);
  float glow = exp(-max(d,0.)*max(d,0.)/(260.*sx*sx+blurK*60.))*0.20;
  float bri = (0.55 + 0.45*hash(id+3.1)) * smoothstep(0.55,1.0,sx) * step(0.25, hash(id+9.7));
  return vec3(1.0, 0.975, 0.93) * (core + glow) * bri;
}`;

export const SCENE = COMMON + `
uniform vec4 uLine;     // ax, ay, bx, by
uniform vec4 uLineP;    // intensidad, ancho del núcleo, cabeza(0..1 a lo largo), fuerza de la cabeza
uniform float uFlash, uRevY, uRevGain, uT;
uniform vec3 uCam;
void main(){
  vec2 p = vec2(vUV.x, 1.-vUV.y)*uDes;
  vec2 c = (p-uDes*0.5)/uDes.y;
  vec3 col = vec3(0.036) - 0.02*dot(c,c);
  // zona ya pulida por la línea
  float rev = smoothstep(uRevY+6., uRevY-70., p.y) * uRevGain;
  float fresh = exp(-max(uRevY-p.y,0.)/190.) * step(p.y, uRevY+6.);
  float micro = n1(p.y*0.9 + n1(p.x*0.004)*40.)*0.5 + n1(p.y*0.23)*0.5;
  col += rev * (0.012 + 0.010*micro + 0.035*exp(-pow((p.y-uDes.y*0.42)/520.,2.)));
  col += dots(p, uCam, 0.) * rev * (0.85 + 1.3*fresh);
  // línea de luz
  vec2 a = uLine.xy, b = uLine.zw; vec2 ab = b-a; float L = max(length(ab),1.); vec2 dir = ab/L;
  vec2 pa = p-a; float al = dot(pa,dir); float pe = dot(pa, vec2(-dir.y,dir.x));
  float ca = clamp(al,0.,L); float ed = abs(al-ca); float I = uLineP.x;
  float taper = smoothstep(0.,0.22*L,ca)*smoothstep(L,0.78*L,ca);
  float w = uLineP.y*(0.35+0.65*taper);
  float d = length(vec2(ed,pe));
  float core = exp(-d*d/(w*w));
  float halo = exp(-abs(pe)/20.)*exp(-ed/50.)*0.62*(0.5+0.5*taper)
             + exp(-abs(pe)/90.)*exp(-ed/160.)*0.17
             + exp(-abs(pe)/2.6)*exp(-ed/420.)*0.55;          // destello largo en su eje
  // reflejo especular que deja sobre la pintura (solo hacia abajo, en vetas)
  float below = max(pe,0.);
  float veta = 0.35 + 0.65*n1(p.x*0.045 + 3.) * n1(p.x*0.31);
  float trail = exp(-below/230.)*step(0.,pe)*step(ed,1.)*veta*0.17*taper;
  vec3 red = vec3(0.882,0.145,0.106);
  col += red*(halo+trail)*I + vec3(1.,0.96,0.94)*core*I;
  // cabeza caliente
  vec2 hp = a + dir*(uLineP.z*L); float hd = length((p-hp)*vec2(1.,1.9));
  col += (vec3(1.)*exp(-hd*hd/900.) + red*exp(-hd/70.)*0.8)*uLineP.w;
  // destello del golpe
  col += uFlash*(vec3(1.,0.55,0.5)*exp(-abs(p.y-a.y)/170.)*0.55 + 0.025);
  o = vec4(col,1.);
}`;

export const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uStep; in vec2 vUV; out vec4 o;
void main(){
  vec4 s = texture(uTex,vUV)*0.2270270270;
  s += (texture(uTex,vUV+uStep*1.3846153846)+texture(uTex,vUV-uStep*1.3846153846))*0.3162162162;
  s += (texture(uTex,vUV+uStep*3.2307692308)+texture(uTex,vUV-uStep*3.2307692308))*0.0702702703;
  o = s;
}`;

export const COMP = COMMON + `
#define NP 12
uniform sampler2D uScene, uBlur, uUI;
uniform int uN;
uniform mat3 uInv[NP];
uniform vec4 uBox[NP];   // hx, hy, radio, alfa
uniform vec4 uPar[NP];   // tinte, elevación, bisel, recorte al celular
uniform float uScl[NP];
uniform float uMorph;    // 0 = pantalla completa, 1 = celular (panel 0)
uniform vec4 uStar[5];   // x, y, radio, k (0 punto, 1 estrella)
uniform float uStarA[5];
uniform vec3 uCam; uniform float uW;
uniform vec4 uLine; uniform vec4 uLineP;
float sdRB(vec2 q, vec2 h, float r){ vec2 d = abs(q)-h+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }
float sdPanel(int i, vec2 p){
  vec2 q = (uInv[i]*vec3(p,1.)).xy;
  float d = sdRB(q, uBox[i].xy, uBox[i].z)*uScl[i];
  if(i==0){ float ds = sdRB(p-uDes*0.5, uDes*0.5+60., 0.); d = mix(ds, d, uMorph); }
  return d;
}
float sdStar(vec2 p, float r){
  const vec2 k1 = vec2(0.809016994,-0.587785252), k2 = vec2(-k1.x,k1.y);
  p.x = abs(p.x); p.y = -p.y;
  p -= 2.*max(dot(k1,p),0.)*k1; p -= 2.*max(dot(k2,p),0.)*k2;
  p.x = abs(p.x); p.y -= r;
  vec2 ba = 0.45*vec2(-k1.y,k1.x) - vec2(0,1);
  float h = clamp(dot(p,ba)/dot(ba,ba),0.,r);
  return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);
}
void main(){
  vec2 p = vec2(vUV.x, 1.-vUV.y)*uDes;
  vec3 col = texture(uScene, vUV).rgb;
  float dPhone = sdPanel(0, p);
  float inPhone = smoothstep(0.7,-0.7,dPhone);
  vec2 Ld = normalize(vec2(-0.6,-0.8)); float cover = 0.;
  for(int i=0;i<NP;i++){
    if(i>=uN) break;
    float A = uBox[i].w; if(A<=0.001) continue;
    float clipM = mix(1., inPhone, uPar[i].w);
    float d = sdPanel(i,p);
    float el = uPar[i].y;
    // sombra de contacto que crece con la elevación
    float ds = sdPanel(i, p - vec2(10.,18.)*el);
    col *= 1. - A*clipM*0.55*smoothstep(26.*el+2., -14.*el-1., ds)*step(0.001,el);
    if(d > 2.) continue;
    vec2 e = vec2(1.5,0.);
    vec2 gr = normalize(vec2(sdPanel(i,p+e.xy)-sdPanel(i,p-e.xy), sdPanel(i,p+e.yx)-sdPanel(i,p-e.yx))+1e-5);
    float bev = uPar[i].z;
    float t = clamp(-d/bev,0.,1.); float rim = (1.-t)*(1.-t);
    vec2 n = gr*rim;
    vec2 ruv = (p + n*22.)/uDes; ruv.y = 1.-ruv.y;
    vec3 bl = texture(uBlur, ruv).rgb;
    vec3 sharp = texture(uScene, ruv).rgb;
    bl = mix(bl, sharp, rim*0.35);                     // el canto refracta más nítido
    float l = dot(bl, vec3(0.2126,0.7152,0.0722)); bl = max(mix(vec3(l), bl, 1.4), 0.);
    float tint = uPar[i].x;
    vec3 g = bl*(1.-tint*0.45) + vec3(0.102,0.102,0.110)*tint;
    float lit = max(dot(gr, Ld),0.), shd = max(dot(gr,-Ld),0.);
    g += rim*(0.40*lit*lit + 0.015) - rim*0.05*shd;
    g += 0.06*smoothstep(1.3,0.,abs(d+bev))*lit;       // segunda arista: grosor del vidrio
    g += 0.14*smoothstep(1.1,0.,abs(d+0.8));           // borde de 1 px
    vec2 q = (uInv[i]*vec3(p,1.)).xy;
    g += 0.030*smoothstep(0.6,-1.0,q.y/uBox[i].y)*tint; // degradado interior desde arriba
    g += dots(p*1.0+vec2(0.,40.), uCam*vec3(1.6,1.,1.6)+vec3(70.,0.,90.), 5.)*0.085; // reflejos que viajan en el cristal
    g += (hash(p+float(i))-0.5)*0.02;
    float mk = smoothstep(0.7,-0.7,d)*A*clipM; cover = max(cover, mk);
    col = mix(col, g, mk);
  }
  vec4 ui = texture(uUI, vUV);
  col = col*(1.-ui.a) + ui.rgb;
  { // la línea de luz sigue nítida sobre el cristal
    vec2 a = uLine.xy, b = uLine.zw; vec2 ab = b-a; float L = max(length(ab),1.); vec2 dir = ab/L;
    vec2 pa = p-a; float al = dot(pa,dir); float pe = dot(pa, vec2(-dir.y,dir.x));
    float ca = clamp(al,0.,L); float ed = abs(al-ca);
    float taper = smoothstep(0.,0.22*L,ca)*smoothstep(L,0.78*L,ca);
    float w = uLineP.y*(0.35+0.65*taper); float dd = length(vec2(ed,pe));
    float halo = exp(-abs(pe)/14.)*exp(-ed/40.)*0.55*(0.5+0.5*taper) + exp(-abs(pe)/2.6)*exp(-ed/300.)*0.4;
    col += (vec3(0.882,0.145,0.106)*halo + vec3(1.,0.96,0.94)*exp(-dd*dd/(w*w)))*uLineP.x*cover;
  }
  for(int i=0;i<5;i++){
    float A = uStarA[i]; if(A<=0.001) continue;
    vec2 q = p-uStar[i].xy; float r = uStar[i].z, k = uStar[i].w;
    float d = mix(length(q)-r*0.34, sdStar(q, r), k);
    col = mix(col, vec3(0.957), smoothstep(0.8,-0.8,d)*A);
    col += vec3(1.,0.97,0.93)*exp(-max(d,0.)/(10.+18.*(1.-k)))*0.30*A;
  }
  o = vec4(col*uW, uW);
}`;

export const OUT = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform float uSeed; in vec2 vUV; out vec4 o;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec3 c = texture(uTex,vUV).rgb;
  c = mix(c, 0.82+0.18*(1.-exp(-(c-0.82)/0.18)), step(0.82,c)); // rodilla suave solo en los brillos
  c += (hash(gl_FragCoord.xy+uSeed)-0.5)*(1.6/255.);  // dither contra el banding
  o = vec4(c,1.);
}`;
