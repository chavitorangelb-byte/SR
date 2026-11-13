/* ESCENA 3 · QUESO Y SALSA (12.8 s a 20.2 s)
   Qué pasa: el queso cae desde arriba y tapa las tarjetas (1.4 s). Sobre el amarillo: el problema.
             La salsa crece desde la palabra COMISIÓN hasta cubrir todo: la solución.
             Al final la salsa se encoge hacia donde aparecerá la burger.
   Easing:   queso power2.inOut · salsa expo.inOut al crecer, power3.inOut al encogerse
   Notas:    fondo transparente: funciona como transición entre la escena 2 y la 4. */
TCBVideo.escena({
  id: 'e3', inicio: 12.8, dur: 7.4, z: 60,
  html: (V) => `<svg class="capa-svg" viewBox="0 0 ${V.W} ${V.H}"><g class="queso"><rect x="-20" y="${-V.H * 1.6}" width="${V.W + 40}" height="${V.H * 1.6 + 4}" fill="#FBC21B"/><path fill="#FBC21B"/></g></svg>
    <p class="cartel e3__txt e3__txt--a">${V.C.problema.map(l => `<span class="linea">${V.kin(l)}</span>`).join('')}</p>
    <svg class="capa-svg" viewBox="0 0 ${V.W} ${V.H}"><path class="salsa" fill="#E2531B"/></svg>
    <p class="cartel e3__txt e3__txt--b">${V.C.solucion.map(l => `<span class="linea">${V.kin(l)}</span>`).join('')}</p>`,
  armar(el, V) {
    const tl = gsap.timeline(), L = window.TCBLiquid, u = V.u, W = V.W, H = V.H;
    const g = el.querySelector('.queso'), borde = g.querySelector('path'), salsa = el.querySelector('.salsa');
    const gotas = L.repartir(W, V.f === 'v' ? 8 : 13, u * 34, 11).map(d => ({ ...d, w: d.w * 1.5 }));
    const s = { y: -u * 40, t: 0, r: 0, cx: W * .5, cy: H * .56 }, diag = Math.hypot(W, H);
    const pinta = () => {
      g.setAttribute('transform', `translate(0 ${s.y})`); borde.setAttribute('d', L.borde(W, u * 2, gotas, 1, s.t));
      salsa.setAttribute('d', s.r > 1 ? L.mancha(s.cx, s.cy, s.r, s.t, 2, 11) : '');
    };
    const a = el.querySelectorAll('.e3__txt--a .kin'), b = el.querySelectorAll('.e3__txt--b .kin');
    tl.to(s, { t: 7.4, duration: 7.4, ease: 'none' }, 0)
      .to(s, { y: H + u * 60, duration: 1.75, ease: 'power2.inOut' }, 0);
    a.forEach((k, i) => V.entrar(tl, k, 1.05 + i * .22, { stagger: .028, duration: .7 }));
    // la salsa nace en la última palabra y se come la pantalla
    tl.to(a[a.length - 1], { scale: 1.08, duration: .5, ease: 'sine.inOut', yoyo: true, repeat: 1, transformOrigin: '0% 50%' }, 2.3)
      .to(s, { r: u * 17, duration: .7, ease: 'back.out(1.6)' }, 3.0)
      .to(s, { r: diag * .78, duration: 1.0, ease: 'expo.inOut' }, 3.5)
      .to(el.querySelector('.e3__txt--a'), { opacity: 0, duration: .25 }, 3.9)
      .set(g, { opacity: 0 }, 4.5);
    b.forEach((k, i) => V.entrar(tl, k, 4.05 + i * .2, { stagger: .028, duration: .7 }));
    // salida: la salsa se encoge hacia la burger
    const dest = V.f === 'v' ? [W * .5, H * .6] : [W * .73, H * .62];
    tl.to(el.querySelectorAll('.e3__txt--b .ch'), { yPercent: -80, opacity: 0, duration: .4, stagger: .012, ease: 'power2.in' }, 6.0)
      .to(s, { r: 0, cx: dest[0], cy: dest[1], duration: 1.15, ease: 'power3.inOut' }, 6.2);
    tl.set({}, {}, 7.4); tl.eventCallback('onUpdate', pinta);
    return tl;
  }
});
