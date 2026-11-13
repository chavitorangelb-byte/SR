/* ESCENA 2 · TU MENÚ (6.0 s a 14.2 s)
   Qué pasa: sobre un piso de tablero en perspectiva entran tres tarjetas de vidrio desde el fondo,
             con las fotos y precios del negocio. Un toque en "Agregar" y sube la barra del pedido.
   Easing:   tarjetas expo.out desde z lejano · toque back.out · barra back.out(1.4)
   Notas:    los últimos 1.4 s quedan debajo del queso de la escena 3 (no necesita salida propia). */
TCBVideo.escena({
  id: 'e2', inicio: 6, dur: 8.2,
  html: (V) => {
    const items = {}; let n = 0; V.D.menu.categorias.forEach(c => c.items.forEach(i => { items[i.id] = i; n++; }));
    const tarjetas = V.C.tarjetas.map((t, i) => { const it = items[t.platillo];
      return `<article class="tarjeta" data-i="${i}"><img src="../assets/fotos/${t.foto}-1080.webp" alt="">
        <div class="tarjeta__cuerpo"><p class="tarjeta__nom">${V.esc(it ? it.nombre : t.titulo)}<small>${it ? 'Con papas a la francesa' : V.esc((t.nota || '').replace('{n}', n))}</small></p>
        ${it ? `<div class="tarjeta__fila"><p class="tarjeta__pre">$${it.precio}</p><span class="tarjeta__btn">+ Agregar<i>1</i><b class="toque"></b></span></div>` : ''}</div></article>`; }).join('');
    const p0 = items[V.C.tarjetas[0].platillo];
    return `<div class="fondo-k" style="position:absolute;inset:0"></div><div class="e2__piso tablero"></div>
      <svg class="capa-svg" viewBox="0 0 ${V.W} ${V.H}"><path class="m1" fill="#FBC21B"/><path class="m2" fill="#E2531B"/></svg>
      <div class="e2__cab"><p class="cartel e2__titulo">${V.kin('TU MENÚ,')}<br>${V.kin('EN TU PÁGINA', 'am')}</p><p class="e2__sub">Con fotos, precios y botón de pedido.</p></div>
      <div class="e2__mesa">${tarjetas}</div>
      <div class="barra-v"><p>1 producto<b>$${p0 ? p0.precio : ''}</b></p><span>Enviar por WhatsApp</span></div>`;
  },
  armar(el, V) {
    const tl = gsap.timeline(), L = window.TCBLiquid, u = V.u, ts = [...el.querySelectorAll('.tarjeta')];
    const m1 = el.querySelector('.m1'), m2 = el.querySelector('.m2'), r = { t: 0 };
    const manchas = () => { m1.setAttribute('d', L.mancha(V.W * .78 + Math.sin(r.t * .5) * u * 8, V.H * .36 + Math.cos(r.t * .4) * u * 6, u * 21, r.t, 1)); m2.setAttribute('d', L.mancha(V.W * .2 + Math.cos(r.t * .45) * u * 7, V.H * .7 + Math.sin(r.t * .5) * u * 6, u * 15, r.t * 1.1, 4)); };
    tl.to(r, { t: 8.2, duration: 8.2, ease: 'none' }, 0)
      .from([m1, m2], { scale: 0, transformOrigin: '50% 50%', duration: 1.2, stagger: .2, ease: 'back.out(1.3)' }, .3)
      .from(el.querySelector('.e2__piso'), { opacity: 0, duration: .8 }, 0)
      .to(el.querySelector('.e2__piso'), { backgroundPositionY: `+=${u * 60}`, duration: 8.2, ease: 'none' }, 0);
    el.querySelectorAll('.e2__cab .kin').forEach((k, i) => V.entrar(tl, k, .2 + i * .3));
    tl.from(el.querySelector('.e2__sub'), { y: u * 3, opacity: 0, duration: .6 }, 1);
    ts.forEach((t, i) => {
      const giro = [-10, 9, -7][i];
      tl.fromTo(t, { z: -u * 190, y: u * 26, rotationY: giro * 4, rotationX: 18, opacity: 0 }, { z: 0, y: 0, rotationY: giro, rotationX: 3, opacity: 1, duration: 1.5, ease: 'expo.out' }, 1 + i * .42)
        .to(t, { rotationY: giro * .35, y: -u * 1.6, z: u * 5, duration: 6, ease: 'sine.inOut' }, 2.4 + i * .42);
    });
    // el toque en "Agregar" de la primera tarjeta
    const btn = ts[0].querySelector('.tarjeta__btn'), toque = btn.querySelector('.toque'), uno = btn.querySelector('i');
    tl.fromTo(toque, { scale: .3, opacity: 0 }, { scale: 1, opacity: .95, duration: .25, ease: 'power2.out' }, 4.3)
      .to(toque, { scale: 1.9, opacity: 0, duration: .45, ease: 'power2.out' }, 4.55)
      .to(btn, { scale: .9, duration: .12, ease: 'power2.in', yoyo: true, repeat: 1 }, 4.5)
      .to(uno, { opacity: 1, duration: .15 }, 4.62)
      .from(uno, { scale: .5, duration: .4, ease: 'back.out(3)' }, 4.62)
      .from(el.querySelector('.barra-v'), { yPercent: 240, duration: .8, ease: 'back.out(1.4)' }, 4.9)
      .from(el.querySelector('.barra-v span'), { scale: .8, duration: .5, ease: 'back.out(2.5)' }, 5.3)
      .to(el.querySelector('.barra-v span'), { scale: 1.07, duration: .3, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 6.1);
    tl.set({}, {}, 8.2); tl.eventCallback('onUpdate', manchas);
    return tl;
  }
});
