/* ESCENA 5 · CIERRE (28.5 s a 36.0 s)
   Qué pasa: "QUE TE PIDAN DIRECTO. En tu propia página." La oferta entra como etiqueta amarilla.
             Logo del negocio y nota de demo. Sin dominio ni URL (decisión de Salvador).
   Easing:   letras back.out(1.5) · etiqueta back.out(2) · pie power3.out
   Notas:    los últimos 2 s son cuadro fijo, para que se alcance a leer y para el corte del audio. */
TCBVideo.escena({
  id: 'e5', inicio: 28.5, dur: 7.5, z: 50,
  html: (V) => {
    const c = V.C.cierre, o = V.D.oferta, n = V.D.negocio;
    return `<div class="e5__bloque">
        <p class="cartel e5__titulo"><span class="linea">${V.kin(c.l1)}</span><span class="linea">${V.kin(c.l2, 'am')}</span></p>
        <p class="e5__bajada">${V.esc(c.bajada)}</p>
        ${V.C.SHOW_OFFER ? `<p class="e5__oferta"><strong>${V.esc(o.titular)}</strong><span>${V.esc(o.bajada)}</span></p>` : ''}
      </div>
      <div class="e5__pie"><img src="../${V.esc(n.logo)}" alt=""><p><b>${V.esc(n.nombre)}</b>${V.C.SHOW_DEMO_NOTE ? 'Demo de diseño para el negocio' : V.esc(n.zona)}${V.C.contacto ? '<br>' + V.esc(V.C.contacto) : ''}</p></div>`;
  },
  armar(el, V) {
    const tl = gsap.timeline(), u = V.u;
    el.querySelectorAll('.e5__titulo .kin').forEach((k, i) => V.entrar(tl, k, .55 + i * .3, { stagger: .035 }));
    tl.from(el.querySelector('.e5__bajada'), { y: u * 3, opacity: 0, duration: .6 }, 1.5);
    const of = el.querySelector('.e5__oferta');
    if (of) tl.from(of, { scale: .2, rotate: -16, opacity: 0, duration: .8, ease: 'back.out(2)' }, 2.3).to(of, { rotate: -2.5, duration: .01 }, 2.3)
      .fromTo(of, { rotate: -16 }, { rotate: -2.5, duration: .8, ease: 'back.out(2)' }, 2.3)
      .to(of, { scale: 1.05, duration: .35, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 4.0);
    tl.from(el.querySelector('.e5__pie'), { y: u * 4, opacity: 0, duration: .7 }, 3.0);
    tl.set({}, {}, 7.5);
    return tl;
  }
});
