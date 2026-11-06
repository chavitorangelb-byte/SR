// Teclado genérico dibujado sobre la pantalla (no copia ningún sistema): barra de sugerencias, letras en DM Sans,
// tecla presionada con globo, mayúscula automática al inicio y sugerencias que siguen a lo que se escribe.
import { clamp, easeOutCubic, easeInOutCubic } from './util.js';

const KH = 291, TOP = 844 - KH, S = 3;
const FILA1 = 'qwertyuiop', FILA2 = 'asdfghjklñ', FILA3 = 'zxcvbnm';
const KW = 33.2, GAP = 5.4, X0 = (390 - (10 * KW + 9 * GAP)) / 2;
const X3 = (390 - (7 * KW + 6 * GAP)) / 2;
const filaY = [603, 657, 711, 765];

function tecla(ch) {
  const c = ch.toLowerCase();
  let i = FILA1.indexOf(c); if (i >= 0) return { x: X0 + i * (KW + GAP), y: filaY[0], w: KW };
  i = FILA2.indexOf(c); if (i >= 0) return { x: X0 + i * (KW + GAP), y: filaY[1], w: KW };
  i = FILA3.indexOf(c); if (i >= 0) return { x: X3 + i * (KW + GAP), y: filaY[2], w: KW };
  return null;
}

const SUGERENCIAS = { '': ['Hola', 'Feliz', 'Gracias'], F: ['F', 'Feliz', 'Fresa'], Fe: ['Fe', 'Feliz', 'Febrero'], 'Feliz ': ['cumpleaños', 'día', 'aniversario'],
  'Feliz c': ['c', 'cumpleaños', 'con'], 'Feliz cu': ['cu', 'cumpleaños', 'cuando'], 'Feliz cumpleaños': ['a', 'mamá', 'amor'] };

export function crearTeclado(teclas, { sube = [926, 942], baja = [970, 984] } = {}) {
  const valorEn = (f) => {
    let v = '';
    for (const t of teclas) if (t.f <= f) v = t.tipo === 'teclear' ? v + t.texto : v.replace(/\S*$/, '') + t.texto;
    return v;
  };
  const presionada = (f) => teclas.find((t) => f >= t.f && f < t.f + 6) || null;
  const desplaz = (f) => KH * (1 - easeOutCubic(clamp((f - sube[0]) / (sube[1] - sube[0])))) + KH * easeInOutCubic(clamp((f - baja[0]) / (baja[1] - baja[0])));

  return {
    activo: (f) => f >= sube[0] && f < baja[1],
    clave(f) { if (!(f >= sube[0] && f < baja[1])) return ''; const p = presionada(f); return `${Math.round(desplaz(f))}|${valorEn(f)}|${p ? p.f : ''}`; },
    // Toques que dibuja la escena (dedo sobre las teclas y las sugerencias), en px CSS del viewport de la página.
    toques() {
      return teclas.map((t) => {
        if (t.tipo === 'sugerencia') return { f: t.f, x: 195, y: TOP + 22 - 47 };
        const k = tecla(t.texto);
        return { f: t.f, x: k.x + k.w / 2, y: k.y + 22 - 47 };
      });
    },
    dibujar(ctx, f) {
      const dy = desplaz(f);
      if (dy >= KH - 0.5) return;
      const v = valorEn(f), p = presionada(f);
      const top = TOP + dy;
      ctx.save();
      ctx.scale(S, S);
      ctx.translate(0, top);
      ctx.fillStyle = '#D6D0D1'; ctx.fillRect(0, 0, 390, KH + 10);
      // sugerencias
      const parcial = Object.keys(SUGERENCIAS).includes(v) ? v : v;
      const sug = SUGERENCIAS[parcial] || ['', '', ''];
      ctx.strokeStyle = '#B8B0B2'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(130, 10); ctx.lineTo(130, 34); ctx.moveTo(260, 10); ctx.lineTo(260, 34); ctx.stroke();
      sug.forEach((s, i) => {
        if (p && p.tipo === 'sugerencia' && i === 1) { ctx.fillStyle = '#C3BBBD'; ctx.beginPath(); ctx.roundRect(136, 5, 118, 34, 8); ctx.fill(); }
        ctx.fillStyle = '#1E1A1B'; ctx.font = `${i === 1 ? 600 : 400} 17px "DM Sans"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s, 65 + i * 130, 22);
      });
      const mayus = v === '';
      const dibujarTecla = (x, y, w, txt, especial = false, abajo = false) => {
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.roundRect(x, y - TOP + 1, w, 44, 6); ctx.fill();
        ctx.fillStyle = abajo ? '#C3BBBD' : especial ? '#B6AEB0' : '#FFFFFF';
        ctx.beginPath(); ctx.roundRect(x, y - TOP, w, 44, 6); ctx.fill();
        ctx.fillStyle = '#1E1A1B'; ctx.font = `400 ${especial ? 15 : 22}px "DM Sans"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + w / 2, y - TOP + 23);
      };
      const letra = (c) => (mayus ? c.toUpperCase() : c);
      [...FILA1].forEach((c, i) => dibujarTecla(X0 + i * (KW + GAP), filaY[0], KW, letra(c), false, p && p.tipo === 'teclear' && p.texto.toLowerCase() === c));
      [...FILA2].forEach((c, i) => dibujarTecla(X0 + i * (KW + GAP), filaY[1], KW, letra(c), false, p && p.tipo === 'teclear' && p.texto.toLowerCase() === c));
      dibujarTecla(X0, filaY[2], 44, '⇧', true, mayus);
      [...FILA3].forEach((c, i) => dibujarTecla(X3 + i * (KW + GAP), filaY[2], KW, letra(c), false, p && p.tipo === 'teclear' && p.texto.toLowerCase() === c));
      dibujarTecla(390 - X0 - 44, filaY[2], 44, '⌫', true);
      dibujarTecla(X0, filaY[3], 88, '123', true);
      dibujarTecla(X0 + 88 + GAP, filaY[3], 390 - 2 * X0 - 2 * 88 - 2 * GAP, 'espacio', true);
      dibujarTecla(390 - X0 - 88, filaY[3], 88, 'intro', true);
      // globo de la tecla presionada
      if (p && p.tipo === 'teclear') {
        const k = tecla(p.texto);
        const gx = k.x + k.w / 2, gy = k.y - TOP;
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.roundRect(gx - 27, gy - 58, 54, 100, 10); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(gx - 26, gy - 60, 52, 104, 10); ctx.fill();
        ctx.fillStyle = '#1E1A1B'; ctx.font = '400 32px "DM Sans"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.texto, gx, gy - 28);
      }
      ctx.restore();
    },
  };
}
