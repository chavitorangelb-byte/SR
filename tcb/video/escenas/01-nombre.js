/* ESCENA 1 · EL NOMBRE (0.0 s a 6.0 s)
   Qué pasa: entran dos bandas de tablero; THE / CHEESE / BURGER se construye letra por letra
             (cada letra sube y se ensancha); el queso escurre de CHEESE; el lema se escribe con gis.
   Easing:   letras back.out(1.5) · queso power2.out · salida power2.in
   Notas:    la salida (5.2 s) tira las letras hacia abajo para dar paso a las tarjetas. */
TCBVideo.escena({
  id: 'e1', inicio: 0, dur: 6,
  html: (V) => `<div class="fondo-k" style="position:absolute;inset:0"></div>
    <div class="banda banda--a tablero"></div><div class="banda banda--b tablero"></div>
    <div class="e1__centro"><div class="e1__bloque">
      <p class="cartel e1__titulo">
        <span class="linea">${V.kin('THE')}</span>
        <span class="linea linea--cheese">${V.kin('CHEESE')}<svg class="goteo"><path/></svg></span>
        <span class="linea">${V.kin('BURGER')}</span>
      </p>
      <p class="gis e1__lema">“${V.esc(V.D.negocio.lema)}”</p>
      <p class="e1__zona">${V.esc(V.D.negocio.zona)} · Monterrey</p>
    </div></div>`,
  armar(el, V) {
    const tl = gsap.timeline(), L = window.TCBLiquid, kins = el.querySelectorAll('.kin');
    const linea = el.querySelector('.linea--cheese'), svg = el.querySelector('.goteo'), path = svg.querySelector('path');
    const fs = parseFloat(getComputedStyle(linea).fontSize); let gotas = [];
    const medir = () => { const w = linea.getBoundingClientRect().width / (V.escala || 1) || fs * 4; svg.setAttribute('viewBox', `0 0 ${w} ${fs * 2}`);
      gotas = [[.05, .08, .36], [.235, .105, .7], [.4, .075, .3], [.565, .115, .9], [.745, .08, .5], [.93, .095, .62]].map(([x, a, l], i) => ({ x: x * w, w: a * fs * (V.f === 'v' ? .82 : 1), len: l * fs, retraso: [0, .25, .1, .05, .3, .15][i] })); };
    const est = { p: 0, t: 0, e: 0 };
    const pinta = () => { if (!gotas.length) medir(); path.setAttribute('d', L.goteo(gotas.map(g => ({ ...g, len: g.len * (1 + est.e) })), est.p, est.t)); };
    tl.from(el.querySelector('.banda--a'), { xPercent: -8, yPercent: -100, duration: .7 }, 0)
      .from(el.querySelector('.banda--b'), { xPercent: 8, yPercent: 100, duration: .7 }, 0)
      .to(el.querySelectorAll('.banda'), { backgroundPositionX: `+=${V.u * 30}`, duration: 6, ease: 'none' }, 0);
    kins.forEach((k, i) => V.entrar(tl, k, .25 + i * .28, { stagger: .05, duration: .9 }));
    tl.call(medir, null, 1.15)
      .to(est, { p: 1, duration: 2.6, ease: 'power2.out' }, 1.2)
      .to(est, { t: 6, duration: 6, ease: 'none' }, 0)
      .fromTo(el.querySelector('.e1__lema'), { clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.1, ease: 'power1.inOut' }, 2.3)
      .from(el.querySelector('.e1__zona'), { y: V.u * 3, opacity: 0, duration: .7 }, 3.1)
      // respiro: el bloque crece apenas
      .fromTo(el.querySelector('.e1__bloque'), { scale: 1 }, { scale: 1.035, duration: 5.2, ease: 'none', transformOrigin: '50% 50%' }, 0)
      // salida
      .to(est, { e: .8, duration: .7, ease: 'power2.in' }, 5.05)
      .to(el.querySelectorAll('.e1__titulo .ch'), { yPercent: 190, rotate: () => gsap.utils.random(-24, 24), opacity: 0, duration: .6, stagger: { each: .022, from: 'random' }, ease: 'power2.in' }, 5.2)
      .to(svg, { opacity: 0, duration: .3 }, 5.45)
      .to(el.querySelectorAll('.e1__lema, .e1__zona'), { opacity: 0, y: V.u * 4, duration: .4, ease: 'power2.in' }, 5.2)
      .to(el.querySelector('.banda--a'), { yPercent: -100, duration: .5, ease: 'power2.in' }, 5.45)
      .to(el.querySelector('.banda--b'), { yPercent: 100, duration: .5, ease: 'power2.in' }, 5.45);
    tl.eventCallback('onUpdate', pinta);   // se pinta una vez por cuadro, ya con todos los valores al día
    return tl;
  }
});
