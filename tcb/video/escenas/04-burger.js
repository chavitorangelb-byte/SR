/* ESCENA 4 · LA BURGER ISOMÉTRICA (19.0 s a 28.5 s, y se queda de fondo en el cierre)
   Qué pasa: la burger se arma capa por capa (pan, carne, queso, lechuga, tomate, pan).
             Cada capa que cae enciende una cosa que lleva la página.
   Easing:   caída power2.in + golpe corto en la capa de abajo · queso escurre power1.out
   Notas:    al final la burger sube y se achica para acompañar el cierre (mantener: true). */
TCBVideo.escena({
  id: 'e4', inicio: 19, dur: 9.5, z: 40, mantener: true,
  html: (V) => {
    const cosas = [...V.D.oferta.incluye, ...V.C.capasExtra].slice(0, 6);
    return `<div class="fondo-k" style="position:absolute;inset:0"></div>
      <p class="cartel e4__titulo">${V.kin('TU PÁGINA')}<br>${V.kin('LLEVA', 'am')}</p>
      <div class="e4__burger"></div>
      <ol class="e4__lista">${cosas.map((c, i) => `<li><b>${i + 1}</b>${V.esc(c)}</li>`).join('')}</ol>`;
  },
  armar(el, V) {
    const tl = gsap.timeline(), u = V.u, caja = el.querySelector('.e4__burger');
    const B = window.TCBBurger.crear(caja, { etiqueta: 'Burger isométrica' }), lis = el.querySelectorAll('.e4__lista li');
    B.queso(0); gsap.set(lis, { opacity: .22 });
    el.querySelectorAll('.e4__titulo .kin').forEach((k, i) => V.entrar(tl, k, 1.15 + i * .25));
    tl.from(B.capas.piso.children, { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: .6, stagger: { each: .012, from: 'center' }, ease: 'back.out(2)' }, .9)
      .from(lis, { y: u * 3, duration: .6, stagger: .05 }, 1.3);
    B.orden.forEach((id, i) => {
      const g = B.capas[id], t0 = 2.0 + i * .88, abajo = B.capas[B.orden[Math.max(0, i - 1)]];
      gsap.set(g, { y: -560, opacity: 0 });
      tl.to(g, { opacity: 1, duration: .15 }, t0)
        .to(g, { y: 0, duration: .5, ease: 'power2.in' }, t0)
        .to(g, { scaleY: .9, transformOrigin: '50% 100%', duration: .07, yoyo: true, repeat: 1, ease: 'sine.out' }, t0 + .5)
        .to(abajo, { y: 9, duration: .07, yoyo: true, repeat: 1 }, t0 + .5)
        .to(lis[i], { opacity: 1, duration: .25 }, t0 + .45)
        .fromTo(lis[i], { scale: 1 }, { scale: 1.07, duration: .16, yoyo: true, repeat: 1, ease: 'sine.inOut' }, t0 + .45);
      if (id === 'queso') tl.to({ q: 0 }, { q: 1, duration: 2.2, ease: 'power1.out', onUpdate() { B.queso(this.targets()[0].q, this.targets()[0].q * 3); } }, t0 + .5);
    });
    // brinco final y viaje al cierre
    const fin = V.f === 'v' ? { yPercent: -40, scale: .58 } : { xPercent: -112, yPercent: 2, scale: .82 };
    tl.to(caja, { y: -u * 3, duration: .22, ease: 'power2.out', yoyo: true, repeat: 1 }, 7.75)
      .to(el.querySelectorAll('.e4__titulo .ch'), { yPercent: -90, opacity: 0, duration: .4, stagger: .015, ease: 'power2.in' }, 8.55)
      .to(lis, { y: u * 5, opacity: 0, duration: .4, stagger: .03, ease: 'power2.in' }, 8.55)
      .to(caja, { ...fin, duration: 1.05, ease: 'power3.inOut', transformOrigin: '50% 50%' }, 8.5);
    tl.set({}, {}, 9.5);
    return tl;
  }
});
