/* Motor del video: junta las escenas en una sola línea de tiempo de GSAP, pausada.
   window.__seek(t) pone el video en el segundo t (determinista: mismo t = mismo cuadro).
   Cada escena se registra con TCBVideo.escena({ id, inicio, dur, z, mantener, notas, html, armar }). */
(function () {
  const C = window.TCB_VIDEO, D = window.TCB, q = new URLSearchParams(location.search);
  const f = q.get('f') === 'h' ? 'h' : 'v', F = C.formatos[f], captura = q.has('captura');
  const escenas = [];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kin = (txt, cls = '') => `<span class="kin ${cls}">${Array.from(txt).map(c => c === ' ' ? '<span class="esp"> </span>' : `<span class="ch">${esc(c)}</span>`).join('')}</span>`;
  const V = window.TCBVideo = {
    f, W: F.ancho, H: F.alto, u: Math.min(F.ancho, F.alto) / 100, C, D, esc, kin, escenas,
    escena: (e) => escenas.push(e),
    /* letras que se construyen: suben, aparecen y se ensanchan */
    entrar(tl, k, en, o = {}) {
      const ch = k.querySelectorAll('.ch'), fin = parseFloat(getComputedStyle(k).getPropertyValue('--an-fin')) || 125;
      tl.fromTo(ch, { yPercent: 75, opacity: 0, '--an': 62 }, { yPercent: 0, opacity: 1, '--an': fin, duration: .8, stagger: .04, ease: 'back.out(1.5)', ...o }, en);
    },
    async iniciar() {
      const L = document.getElementById('lienzo');
      document.body.classList.toggle('captura', captura);
      L.dataset.f = f; L.style.setProperty('--W', V.W + 'px'); L.style.setProperty('--H', V.H + 'px');
      L.innerHTML = escenas.map((e, i) => `<section class="escena ${e.id}" data-escena="${e.id}" style="z-index:${e.z ?? (i + 1) * 10}">${e.html(V)}</section>`).join('');
      await document.fonts.ready; await Promise.all([...document.fonts].map(x => x.load().catch(() => 0)));
      await Promise.all([...L.querySelectorAll('img')].map(img => img.decode().catch(() => 0)));
      const m = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      escenas.forEach(e => {
        const el = L.querySelector(`[data-escena="${e.id}"]`), tl = e.armar(el, V);
        m.set(el, { visibility: 'visible' }, e.inicio).add(tl, e.inicio);
        if (!e.mantener) m.set(el, { visibility: 'hidden' }, e.inicio + e.dur);
      });
      V.dur = Math.max(...escenas.map(e => e.inicio + e.dur)); m.set({}, {}, V.dur);
      V.master = m;
      window.__dur = V.dur; window.__fps = C.fps;
      window.__seek = (t) => { m.time(Math.max(0.0001, Math.min(V.dur, t))); };
      window.__seek(0); window.__listo = true;
      if (!captura) controles(L);
    }
  };
  function controles(L) {
    const play = document.getElementById('play'), barra = document.getElementById('barra'), reloj = document.getElementById('reloj'), m = V.master;
    document.getElementById(f === 'h' ? 'fh' : 'fv').setAttribute('aria-current', 'true');
    const ajustar = () => { const M = document.getElementById('marco'); L.style.transform = `scale(${Math.min(M.clientWidth / V.W, M.clientHeight / V.H)})`; };
    ajustar(); addEventListener('resize', ajustar);
    const pinta = () => { barra.value = m.time() / V.dur; reloj.textContent = `${m.time().toFixed(1)} s / ${V.dur.toFixed(1)} s`; play.textContent = m.paused() ? 'Reproducir' : 'Pausa'; };
    m.eventCallback('onUpdate', pinta); m.eventCallback('onComplete', pinta);
    play.onclick = () => { if (m.time() >= V.dur - .05) m.time(0.0001); m.paused(!m.paused()); pinta(); };
    barra.oninput = () => { m.pause(); window.__seek(barra.value * V.dur); pinta(); };
    addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); play.click(); } });
    if (q.has('t')) window.__seek(parseFloat(q.get('t'))); pinta();
  }
})();
