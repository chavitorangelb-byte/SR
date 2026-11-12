/* THE CHEESE BURGER · demo. Todo el contenido sale de data.js (window.TCB). */
(function () {
  'use strict';
  const D = window.TCB;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dinero = (n) => '$' + Number(n).toLocaleString('es-MX');
  const ICO = {
    mas: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    ok: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.500l5 5L20 6.500"/></svg>',
    izq: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    der: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    estrella: 'M12 2.500l2.900 6.100 6.600.900-4.800 4.600 1.200 6.600L12 17.500l-5.900 3.200 1.200-6.600L2.500 9.500l6.600-.900z'
  };

  /* ---------- Estado de error: data.js no cargó ---------- */
  if (!D || !D.menu) {
    const c = $('#menuCarga');
    if (c) { c.className = 'estado estado--error'; c.innerHTML = '<strong>No pudimos cargar el menú.</strong>Recarga la página o llama al local: <a href="tel:+528181618030">+52 81 8161 8030</a>.'; }
    return;
  }

  const N = D.negocio;
  const pend = (cond = true) => (D.SHOW_PENDIENTES && cond) ? '<span class="pend">por confirmar</span>' : '';
  const waUrl = (num, txt) => `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
  const avisar = (t) => { const a = $('#avisos'); a.textContent = ''; requestAnimationFrame(() => (a.textContent = t)); };

  /* =====================================================================
     RENDER
     ===================================================================== */
  const ITEMS = {};
  D.menu.categorias.forEach(c => c.items.forEach(i => (ITEMS[i.id] = i)));
  const sel = {};                                   // opción elegida por platillo
  const opcionDe = (it) => it.opciones ? (sel[it.id] ?? it.opciones[0].nombre) : '';
  const precioDe = (it, op) => it.opciones ? it.opciones.find(o => o.nombre === op).precio : it.precio;
  const clave = (id, op) => `${id}::${op || ''}`;

  /* ---------- Carrito ---------- */
  const LS = 'tcb-pedido-v1';
  let carrito = {};
  try { carrito = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { carrito = {}; }
  Object.keys(carrito).forEach(k => {               // limpia lo que ya no exista en el menú
    const [id, op] = k.split('::'); const it = ITEMS[id];
    if (!it || (it.opciones && !it.opciones.some(o => o.nombre === op)) || !(carrito[k] > 0)) delete carrito[k];
  });
  const guardar = () => { try { localStorage.setItem(LS, JSON.stringify(carrito)); } catch (e) { /* modo privado: el pedido vive solo en esta visita */ } };
  const lineas = () => Object.keys(carrito).map(k => { const [id, op] = k.split('::'); const it = ITEMS[id]; const p = precioDe(it, op); return { k, it, op, n: carrito[k], sub: p * carrito[k] }; });
  const cuenta = () => Object.values(carrito).reduce((a, b) => a + b, 0);
  const total = () => lineas().reduce((a, l) => a + l.sub, 0);

  function menuRender() {
    const cats = D.menu.categorias;
    $('#menuAviso').innerHTML = `${esc(D.menu.aviso)}. ${esc(D.menu.fuente)}.${pend(D.menu.confirmar)}`;
    $('#tabs').innerHTML = cats.map((c, i) =>
      `<button class="tab" role="tab" type="button" id="tab-${c.id}" aria-controls="panel-${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(c.nombre)}</button>`).join('');
    $('#paneles').innerHTML = cats.map((c, i) => `
      <div class="panel" role="tabpanel" id="panel-${c.id}" aria-labelledby="tab-${c.id}" ${i ? 'hidden' : ''}>
        ${c.nota ? `<p class="panel__nota">${esc(c.nota)}</p>` : ''}
        <ul class="platos">${c.items.map(platoHTML).join('')}</ul>
      </div>`).join('');
  }
  function platoHTML(it) {
    const op = opcionDe(it);
    return `<li class="plato" data-id="${it.id}">
      <h3 class="plato__nom">${esc(it.nombre)}${it.sello ? `<span class="plato__sello">${esc(it.sello)}</span>` : ''}</h3>
      <p class="plato__pre" data-precio>${dinero(precioDe(it, op))}</p>
      <p class="plato__des">${esc(it.desc || '')}</p>
      ${it.opciones ? `<fieldset class="plato__opc"><legend class="sr">Opciones de ${esc(it.nombre)}</legend>${it.opciones.map(o =>
        `<label class="chip"><input type="radio" name="op-${it.id}" value="${esc(o.nombre)}" ${o.nombre === op ? 'checked' : ''}><span>${esc(o.nombre)} <small>${dinero(o.precio)}</small></span></label>`).join('')}</fieldset>` : ''}
      <div class="plato__acc" data-acc>${accionHTML(it)}</div>
    </li>`;
  }
  function accionHTML(it) {
    const op = opcionDe(it), n = carrito[clave(it.id, op)] || 0, nom = esc(it.nombre + (op ? ` (${op})` : ''));
    if (!n) return `<button class="agregar" type="button" data-add aria-label="Agregar ${nom} al pedido">${ICO.mas}Agregar</button>`;
    return pasosHTML(nom, n);
  }
  const pasosHTML = (nom, n) => `<div class="pasos" role="group" aria-label="Cantidad de ${nom}">
      <button type="button" data-dec aria-label="Quitar uno de ${nom}">${ICO.menos}</button>
      <output aria-live="off">${n}</output>
      <button type="button" data-inc aria-label="Agregar otro de ${nom}">${ICO.mas}</button></div>`;

  function cambiar(id, op, delta, origen) {
    const k = clave(id, op), it = ITEMS[id];
    const n = Math.max(0, Math.min(99, (carrito[k] || 0) + delta));
    if (n) carrito[k] = n; else delete carrito[k];
    guardar(); pintarCarrito();
    const nom = it.nombre + (op ? ` (${op})` : '');
    avisar(delta > 0 ? `${nom} agregado. Llevas ${cuenta()} en tu pedido, ${dinero(total())}.` : `${nom}: ${n ? 'quedan ' + n : 'quitado del pedido'}.`);
    // repinta la acción del platillo en el menú y conserva el foco
    const li = $(`.plato[data-id="${id}"]`);
    if (li && opcionDe(it) === op) {
      const acc = $('[data-acc]', li), teniaFoco = acc.contains(document.activeElement);
      acc.innerHTML = accionHTML(it);
      if (teniaFoco && origen === 'menu') (n ? $(delta > 0 ? '[data-inc]' : '[data-dec]', acc) : $('[data-add]', acc)).focus();
    }
    if (delta > 0) { const c = $('.nav__cuenta'); c.classList.remove('salta'); void c.offsetWidth; c.classList.add('salta'); }
  }

  function pintarCarrito() {
    const n = cuenta(), t = total();
    $$('[data-cuenta]').forEach(e => (e.textContent = n));
    $$('[data-total]').forEach(e => (e.textContent = dinero(t)));
    $$('[data-cuenta-txt]').forEach(e => (e.textContent = n === 1 ? '1 producto' : `${n} productos`));
    $('.nav__pedido').setAttribute('aria-label', n ? `Ver pedido: ${n} ${n === 1 ? 'producto' : 'productos'}, ${dinero(t)}` : 'Ver pedido, vacío');
    $('#barra').hidden = !n || $('#pedido').open;
    document.body.style.setProperty('--barra', n ? '84px' : '0px');
    // diálogo
    $('#pedidoVacio').hidden = !!n; $('#pedidoForm').hidden = !n;
    const ul = $('#pedidoLineas'), foco = document.activeElement?.closest?.('[data-k]')?.dataset.k, cual = document.activeElement?.hasAttribute?.('data-inc') ? '[data-inc]' : '[data-dec]';
    ul.innerHTML = lineas().map(l => `<li class="linea-p" data-k="${esc(l.k)}">
        <p class="linea-p__nom">${esc(l.it.nombre)}${l.op ? `<small>${esc(l.op)}</small>` : ''}</p>
        <p class="linea-p__sub">${dinero(l.sub)}</p>
        ${pasosHTML(esc(l.it.nombre + (l.op ? ` (${l.op})` : '')), l.n)}</li>`).join('');
    if (foco) { const li = $$('[data-k]', ul).find(e => e.dataset.k === foco); (li ? $(cual, li) : $('[data-cerrar-pedido]')).focus(); }
  }

  function mensaje() {
    const f = $('#pedidoForm'), tipo = f.elements.tipo?.value || N.tiposDePedido[0];
    const nombre = $('#nombre').value.trim(), notas = $('#notas').value.trim();
    return [
      `Hola, quiero hacer un pedido en ${N.nombre}:`, '',
      ...lineas().map(l => `• ${l.n} x ${l.it.nombre}${l.op ? ` (${l.op})` : ''}: ${dinero(l.sub)}`), '',
      `Total estimado: ${dinero(total())}`,
      `Pedido: ${tipo}`,
      nombre ? `Nombre: ${nombre}` : null,
      notas ? `Notas: ${notas}` : null, '',
      '¿Me confirmas el total y el tiempo? Gracias.'
    ].filter(l => l !== null).join('\n');
  }

  /* ---------- Feed ---------- */
  function feedRender() {
    $('#feedIg').href = N.instagram.url; $('#feedIg').textContent = N.instagram.usuario;
    const tira = $('#feedTira');
    tira.innerHTML = D.fotos.map(f => `<li class="foto"><img src="assets/fotos/${esc(f.archivo)}-640.webp" srcset="assets/fotos/${esc(f.archivo)}-640.webp 640w, assets/fotos/${esc(f.archivo)}-1080.webp 1080w" sizes="(min-width: 720px) 340px, 62vw" width="640" height="853" alt="${esc(f.alt)}" loading="lazy" decoding="async"></li>`).join('');
    $$('img', tira).forEach(img => {
      const ok = () => img.classList.add('lista'), mal = () => { img.closest('.foto').classList.add('foto--falta'); img.remove(); };
      if (img.complete) (img.naturalWidth ? ok() : mal()); else { img.addEventListener('load', ok); img.addEventListener('error', mal); }
    });
    const fl = document.createElement('div'); fl.className = 'feed__flechas';
    fl.innerHTML = `<button type="button" aria-label="Fotos anteriores" data-dir="-1">${ICO.izq}</button><button type="button" aria-label="Fotos siguientes" data-dir="1">${ICO.der}</button>`;
    $('.feed__cab').appendChild(fl);
    fl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const w = $('.foto', tira).getBoundingClientRect().width + 24; tira.scrollBy({ left: w * 2 * Number(b.dataset.dir), behavior: 'smooth' }); });
  }

  /* ---------- Burger ---------- */
  let burger = null;
  function armadoRender() {
    $('#capas').innerHTML = D.capas.map(c => `<li data-capa-txt="${c.id}"><strong>${esc(c.nombre)}</strong><span>${esc(c.nota)}</span></li>`).join('');
    burger = window.TCBBurger.crear($('#burger'));
  }

  /* ---------- Reseñas ---------- */
  function resenasRender() {
    const g = D.google, cal = Number(g.calificacion);
    $('#calNum').textContent = cal.toFixed(1);
    $('#estrellas').setAttribute('aria-label', `${cal.toFixed(1)} de 5 estrellas en Google Maps`);
    $('#estrellas').innerHTML = [0, 1, 2, 3, 4].map(i => { const k = Math.max(0, Math.min(1, cal - i));
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO.estrella}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path class="estrella__llena" d="${ICO.estrella}" fill="currentColor" style="clip-path:inset(0 ${(1 - k) * 100}% 0 0)"/></svg>`; }).join('');
    $('#calFuente').innerHTML = `<strong>${cal.toFixed(1)} de 5</strong> en Google Maps, con ${g.totalResenas} reseñas.${pend(g.confirmar)}`;
    $('#mapsResenas').href = N.mapsUrl;
    $('#citas').innerHTML = g.resenas.map(r => `<li><blockquote class="cita"><q>${esc(r.texto)}</q><footer>${r.autor ? esc(r.autor) + ', reseña de Google' : 'Reseña de Google'}</footer></blockquote></li>`).join('');
    $$('#citas li').forEach((li, i) => li.firstElementChild.style.setProperty('--i', i));
  }

  /* ---------- Cómo llegar + horario ---------- */
  const h12 = (hhmm) => { let [h, m] = hhmm.split(':').map(Number); const s = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${s}`; };
  function estadoAhora() {
    try {
      const H = N.horario, p = new Intl.DateTimeFormat('en-US', { timeZone: H.zonaHoraria, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const v = (t) => p.find(x => x.type === t).value;
      const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v('weekday')), min = (Number(v('hour')) % 24) * 60 + Number(v('minute'));
      const aMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
      const hoy = H.bloques.find(b => b.dias.includes(dia));
      if (hoy && min >= aMin(hoy.abre) && min < aMin(hoy.cierra)) return { abierto: true, txt: `Abierto ahora, cierra a las ${h12(hoy.cierra)}` };
      if (hoy && min < aMin(hoy.abre)) return { abierto: false, txt: `Cerrado ahora, abre hoy a las ${h12(hoy.abre)}` };
      for (let i = 1; i <= 7; i++) { const b = H.bloques.find(x => x.dias.includes((dia + i) % 7)); if (b) return { abierto: false, txt: `Cerrado ahora, abre ${i === 1 ? 'mañana' : 'pronto'} a las ${h12(b.abre)}` }; }
    } catch (e) { /* sin Intl: no mostramos estado */ }
    return null;
  }
  function llegarRender() {
    $('#zona').textContent = `${N.zona}, ${N.ciudad}`;
    $('#mapaZona').textContent = N.zona;
    $('#direccion').innerHTML = N.direccion.valor ? esc(N.direccion.valor) + pend(N.direccion.confirmar) : 'Dirección exacta por confirmar con el local.';
    $('#horario').innerHTML = N.horario.bloques.map(b => `<dt>${esc(b.etiqueta)}</dt><dd>${h12(b.abre)} a ${h12(b.cierra)}</dd>`).join('') + pend(N.horario.confirmar);
    ['#mapsBtn', '#mapa'].forEach(s => ($(s).href = N.mapsUrl));
    $('#telBtn').href = 'tel:' + N.telefono.tel; $('#telTxt').textContent = N.telefono.valor;
    $('#telBtn').setAttribute('aria-label', 'Llamar al ' + N.telefono.valor);
    const e = estadoAhora();
    if (e) {
      const html = `<span class="punto ${e.abierto ? 'punto--abierto' : ''}" aria-hidden="true"></span>${esc(e.txt)}`;
      $('#estado').innerHTML = html;
      $('#estadoHero').innerHTML = html; $('#estadoHero').hidden = false;
    }
  }

  /* ---------- Oferta, pie, banderas ---------- */
  function ofertaRender() {
    const O = D.oferta, sec = $('#oferta');
    if (!D.SHOW_OFFER || !O) { sec.hidden = true; document.body.classList.add('sin-oferta'); return; }
    sec.hidden = false;
    $('#ofertaTitulo').innerHTML = esc(O.titular).replace(/\$[\d,.]+(?:\s?MXN)?/, m => `<b>${m}</b>`);
    $('#ofertaBajada').textContent = O.bajada;
    $('#ofertaLista').innerHTML = O.incluye.map(t => `<li>${ICO.ok}<span>${esc(t)}</span></li>`).join('');
    const b = $('#ofertaBtn'); b.textContent = O.boton;
    if (/^\d{10,15}$/.test(O.whatsapp)) b.href = waUrl(O.whatsapp, O.mensaje);
    else { b.removeAttribute('href'); b.setAttribute('aria-disabled', 'true'); b.setAttribute('role', 'link'); const n = $('#ofertaNota'); n.hidden = false; n.textContent = 'Falta tu número: edita oferta.whatsapp en data.js para activar este botón.'; }
  }
  function pieRender() {
    $('#pieLema').textContent = N.lema;
    $('#pieIg').href = N.instagram.url; $('#pieIg span').textContent = N.instagram.usuario;
    $('#pieFb').href = N.facebook.url; $('#pieFb span').textContent = N.facebook.nombre;
    $('#pieLegal').innerHTML = `${esc(N.nombre)} · ${esc(N.zona)}, ${esc(N.ciudad)}. ${esc(D.menu.aviso)}.` +
      (D.SHOW_DEMO_BADGE ? ' Demo de diseño: propuesta no oficial, hecha con fotos y datos públicos del negocio para mostrarle cómo se vería su página.' : '');
    $('#demoBadge').hidden = !D.SHOW_DEMO_BADGE;
    $('#heroWa').href = waUrl(N.whatsappPedidos.valor, `Hola, quiero hacer un pedido en ${N.nombre}.`);
    $('#pedidoAviso').textContent = `${D.menu.aviso}. El local confirma el total por WhatsApp.`;
    $('#tipoPedido').innerHTML = N.tiposDePedido.map((t, i) => `<label class="chip"><input type="radio" name="tipo" value="${esc(t)}" ${i ? '' : 'checked'}><span>${esc(t)}</span></label>`).join('');
    $('#demoNota').textContent = 'Demo: en la página real este paso no existe, WhatsApp se abre directo con el mensaje listo.';
  }

  /* =====================================================================
     INTERACCIÓN
     ===================================================================== */
  function tabsInit() {
    const tabs = $$('.tab');
    const activar = (t, foco) => {
      tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
      if (foco) t.focus();
      t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducido ? 'auto' : 'smooth' });
      animarPanel($('#' + t.getAttribute('aria-controls')));
    };
    $('#tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) activar(t); });
    $('#tabs').addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement); if (i < 0) return;
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      let j = d ? (i + d + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
      if (j >= 0) { e.preventDefault(); activar(tabs[j], true); }
    });
  }
  function menuInit() {
    const P = $('#paneles');
    P.addEventListener('click', e => {
      const b = e.target.closest('[data-add],[data-inc],[data-dec]'); if (!b) return;
      const it = ITEMS[b.closest('.plato').dataset.id];
      cambiar(it.id, opcionDe(it), b.hasAttribute('data-dec') ? -1 : 1, 'menu');
    });
    P.addEventListener('change', e => {
      if (e.target.type !== 'radio') return;
      const li = e.target.closest('.plato'), it = ITEMS[li.dataset.id];
      sel[it.id] = e.target.value;
      $('[data-precio]', li).textContent = dinero(precioDe(it, e.target.value));
      $('[data-acc]', li).innerHTML = accionHTML(it);
    });
  }
  function pedidoInit() {
    const dlg = $('#pedido');
    const vista = (v) => $$('.pedido__vista', dlg).forEach(x => (x.hidden = x.dataset.vista !== v));
    const abrir = () => { vista('carrito'); pintarCarrito(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); $('#barra').hidden = true; };
    const cerrar = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
    $$('[data-abrir-pedido]').forEach(b => b.addEventListener('click', abrir));
    $$('[data-cerrar-pedido]').forEach(b => b.addEventListener('click', cerrar));
    dlg.addEventListener('close', () => { $('#copiado').textContent = ''; pintarCarrito(); });
    dlg.addEventListener('click', e => { if (e.target === dlg) cerrar(); });
    $('[data-ir-menu]').addEventListener('click', () => { cerrar(); $('#menu').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' }); $('.tab[aria-selected="true"]').focus({ preventScroll: true }); });
    $('#pedidoLineas').addEventListener('click', e => {
      const b = e.target.closest('[data-inc],[data-dec]'); if (!b) return;
      const [id, op] = b.closest('[data-k]').dataset.k.split('::');
      cambiar(id, op, b.hasAttribute('data-dec') ? -1 : 1, 'pedido');
    });
    $('#vaciar').addEventListener('click', () => { carrito = {}; guardar(); pintarCarrito(); $$('.plato').forEach(li => ($('[data-acc]', li).innerHTML = accionHTML(ITEMS[li.dataset.id]))); avisar('Pedido vaciado.'); $('[data-ir-menu]').focus(); });
    $('#pedidoForm').addEventListener('submit', e => {
      e.preventDefault(); if (!cuenta()) return;
      const txt = mensaje(), url = waUrl(N.whatsappPedidos.valor, txt);
      if (D.DEMO_MODE) { $('#burbuja').textContent = txt; $('#abrirWa').href = url; vista('mensaje'); $('#burbuja').focus(); }
      else window.open(url, '_blank', 'noopener');
    });
    $('#volver').addEventListener('click', () => { vista('carrito'); $('#enviar').focus(); });
    $('#copiar').addEventListener('click', async () => {
      const txt = $('#burbuja').textContent, out = $('#copiado');
      try { await navigator.clipboard.writeText(txt); out.textContent = 'Mensaje copiado.'; }
      catch (e) { const r = document.createRange(); r.selectNodeContents($('#burbuja')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); out.textContent = 'No se pudo copiar solo. El texto ya está seleccionado: cópialo a mano.'; }
    });
  }

  /* =====================================================================
     MOVIMIENTO
     ===================================================================== */
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gs = window.gsap, ST = window.ScrollTrigger, L = window.TCBLiquid;
  const mover = !!gs && !!ST && !reducido;
  let animarPanel = () => {};

  function partir() {                                // letras sueltas para la tipografía cinética
    $$('[data-kin]').forEach(k => { k.innerHTML = Array.from(k.textContent).map(c => c === ' ' ? '<span class="esp"> </span>' : `<span class="ch">${esc(c)}</span>`).join(''); });
  }

  /* gotas del título: cuelgan de la palabra CHEESE */
  let heroGotas = [], heroP = reducido ? 1 : 0, heroEstira = 0;
  function heroMedir() {
    const linea = $('.linea--cheese'), svg = $('#heroGoteo'), fs = parseFloat(getComputedStyle(linea).fontSize), w = linea.getBoundingClientRect().width;
    svg.setAttribute('viewBox', `0 0 ${w} ${fs * 1.7}`);
    heroGotas = [[.045, .075, .34], [.235, .1, .62], [.4, .07, .26], [.565, .11, .78], [.745, .075, .44], [.93, .09, .56]]
      .map(([x, a, l], i) => ({ x: x * w, w: a * fs * (w / fs < 4.5 ? .8 : 1), len: l * fs, retraso: [0, .25, .1, .05, .3, .15][i] }));
    heroPintar();
  }
  function heroPintar(t = 0) {
    const g = heroGotas.map(d => ({ ...d, len: d.len * (1 + heroEstira * 0.9) }));
    $('#heroGoteo path').setAttribute('d', L.goteo(g, heroP, t));
  }

  /* bordes derretidos entre secciones */
  const bordes = [];
  function bordesMedir() {
    bordes.length = 0;
    $$('.derretido').forEach((svg, i) => {
      const w = svg.getBoundingClientRect().width || innerWidth, alto = Math.min(240, Math.max(150, w * 0.2));
      svg.setAttribute('viewBox', `0 0 ${w} 240`);
      const path = $('path', svg); path.setAttribute('fill', svg.dataset.derretido);
      const b = { svg, path, w, gotas: L.repartir(w, Math.max(5, Math.round(w / 120)), alto, i + 3), p: mover ? 0 : 1 };
      b.pintar = () => path.setAttribute('d', L.borde(b.w, 16, b.gotas, b.p, 0));
      b.pintar(); bordes.push(b);
    });
  }

  /* manchas de queso y salsa detrás del vidrio del menú (en px reales del contenedor) */
  function manchas(t = 0) {
    const svg = $('.menu__manchas'), w = svg.clientWidth || 1000, h = svg.clientHeight || 1000, r = Math.min(w, 900);
    if (svg.dataset.w !== w + 'x' + h) { svg.dataset.w = w + 'x' + h; svg.setAttribute('viewBox', `0 0 ${w} ${h}`); }
    $('#manchaQueso').setAttribute('d', L.mancha(w * .2 + Math.sin(t * .23) * r * .08, h * .34 + Math.cos(t * .19) * h * .1, r * .2, t * .8, 1));
    $('#manchaSalsa').setAttribute('d', L.mancha(w * .82 + Math.cos(t * .21) * r * .07, h * .7 + Math.sin(t * .17) * h * .1, r * .14, t * .9, 4));
  }

  function movimiento() {
    gs.registerPlugin(ST);
    gs.defaults({ ease: 'power3.out' });
    const anFin = (k) => parseFloat(getComputedStyle(k).getPropertyValue('--an-fin')) || 125;
    const entrarKin = (k, extra = {}) => { const ch = $$('.ch', k);
      return gs.fromTo(ch, { yPercent: 70, opacity: 0, '--an': 62 }, { yPercent: 0, opacity: 1, '--an': anFin(k), duration: .9, stagger: .04, ease: 'back.out(1.5)',
        onComplete: () => ch.forEach(c => c.style.removeProperty('--an')), ...extra }); };

    /* 1 · Hero: el nombre se construye, el queso escurre */
    const hero = gs.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    $$('.hero .kin').forEach((k, i) => hero.add(entrarKin(k), i * .16));
    hero.to({ p: 0 }, { p: 1, duration: 2.4, ease: 'power2.out', onUpdate() { heroP = this.targets()[0].p; heroPintar(); } }, .75)
      .from('.hero__lema', { opacity: 0, scale: .8, rotate: -14, duration: .7, ease: 'back.out(2)' }, 1.1)
      .from('.hero__pie > *', { y: 26, opacity: 0, duration: .8, stagger: .09 }, .55)
      .from('.hero .tablero', { yPercent: 100, duration: .8 }, .4)
      .from('.nav', { yPercent: -160, duration: .8 }, .2);
    const arrancar = () => { heroMedir(); bordesMedir(); hero.play(); ST.refresh(); };
    let listo = false; const una = () => { if (!listo) { listo = true; arrancar(); } };
    (document.fonts?.ready || Promise.resolve()).then(una); setTimeout(una, 1500);

    /* al bajar, las líneas se separan y el queso se estira */
    gs.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .5 } })
      .to('.linea--the', { y: '-.34em', ease: 'none' }, 0)
      .to('.linea--cheese', { y: '-.16em', ease: 'none' }, 0)
      .to({ e: 0 }, { e: 1, ease: 'none', onUpdate() { heroEstira = this.targets()[0].e; heroPintar(); } }, 0);

    /* inclinación de los titulares según la velocidad del scroll */
    const sk = gs.quickTo(document.documentElement, '--sk', { duration: .5, ease: 'power3.out' });
    ST.create({ onUpdate: (s) => sk(L.clamp(s.getVelocity() / -260, -7, 7)) });
    ST.addEventListener('scrollEnd', () => sk(0));
    $$('.h2 .kin, .directo__titulo .kin').forEach(k => (k.style.transform = 'skewX(calc(var(--sk, 0) * 1deg))'));

    /* titulares de sección */
    $$('.h2').forEach(h => { const tl = gs.timeline({ scrollTrigger: { trigger: h, start: 'top 88%', once: true } }); $$('.kin', h).forEach((k, i) => tl.add(entrarKin(k, { stagger: .03 }), i * .12)); });

    /* 2 · Menú */
    gs.from('.menu__panel', { y: 60, opacity: 0, duration: 1, scrollTrigger: { trigger: '.menu__panel', start: 'top 90%', once: true } });
    animarPanel = (p) => gs.fromTo($$('.plato', p), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .04, clearProps: 'transform,opacity', overwrite: true });
    const mq = $('#manchaQueso'), ms = $('#manchaSalsa'); let menuVisto = false;
    new IntersectionObserver(([e]) => (menuVisto = e.isIntersecting), { rootMargin: '100px' }).observe($('.menu'));
    gs.ticker.add((t) => { if (menuVisto) manchas(t); });
    gs.to('.tablero--campo', { backgroundPositionY: '-=160', ease: 'none', scrollTrigger: { trigger: '.menu', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* 3 · Feed */
    gs.from('.foto', { y: 70, opacity: 0, duration: .9, stagger: .07, clearProps: 'transform,opacity', scrollTrigger: { trigger: '.feed__tira', start: 'top 88%', once: true } });

    /* bordes derretidos: escurren conforme entran a la pantalla */
    $$('.derretido').forEach((svg, i) => ST.create({ trigger: svg, start: 'top 96%', end: 'top 30%', scrub: .6, onUpdate: (s) => { const b = bordes[i]; if (b) { b.p = s.progress; b.pintar(); } } }));

    /* 4 · Burger: se arma capa por capa con el scroll */
    const sec = $('.armado'); sec.classList.add('armado--scroll');
    const tl = gs.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: .7 } });
    const txt = (id) => $(`[data-capa-txt="${id}"]`);
    gs.set($$('#capas li'), { opacity: .28 });
    tl.from(burger.capas.piso, { opacity: 0, duration: .5 }, 0);
    burger.orden.forEach((id, i) => {
      const g = burger.capas[id], t0 = .3 + i * 1;
      gs.set(g, { y: -400, opacity: 0 });
      tl.to(g, { opacity: 1, duration: .3 }, t0)
        .to(g, { y: 0, duration: .8, ease: 'power2.in' }, t0)
        .to(burger.capas[burger.orden[Math.max(0, i - 1)]], { y: 7, duration: .08, yoyo: true, repeat: 1 }, t0 + .8)  // la de abajo recibe el golpe
        .to(txt(id), { opacity: 1, duration: .3 }, t0 + .6)
        .fromTo(txt(id), { x: -14 }, { x: 0, duration: .3, ease: 'power2.out' }, t0 + .6);
      if (id === 'queso') tl.to({ q: 0 }, { q: 1, duration: 1.6, onUpdate() { burger.queso(this.targets()[0].q); } }, t0 + .8);
    });
    tl.to({}, { duration: .7 });
    burger.queso(0);

    /* 5 · Muro: la calificación sube y las reseñas se escriben */
    const cal = Number(D.google.calificacion), num = $('#calNum');
    gs.timeline({ scrollTrigger: { trigger: '.muro__grid', start: 'top 75%', once: true } })
      .to({ v: 0 }, { v: cal, duration: 1.4, ease: 'power2.out', onUpdate() { num.textContent = this.targets()[0].v.toFixed(1); } }, 0)
      .from('.estrella__llena', { opacity: 0, scale: .2, transformOrigin: '50% 50%', duration: .5, stagger: .1, ease: 'back.out(2.5)' }, .2)
      .fromTo('.cita q', { clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% 0% -10% 0)', duration: 1.3, stagger: .55, ease: 'power1.inOut' }, .3)
      .from('.cita footer', { opacity: 0, duration: .5, stagger: .55 }, 1.3)
      .from('.muro__garabatos path', { opacity: 0, duration: .6, stagger: .15 }, .4);

    /* 6 · Cómo llegar */
    gs.timeline({ scrollTrigger: { trigger: '.mapa', start: 'top 80%', once: true } })
      .from('.mapa', { y: 50, opacity: 0, duration: .9 }, 0)
      .from('.mapa__pin', { y: -160, opacity: 0, duration: .9, ease: 'bounce.out' }, .35)
      .from('.mapa__rotulo', { y: 30, opacity: 0, duration: .6 }, .7);
    gs.from('.horario > *, .llegar__zona, .llegar__dir, .llegar__estado, .llegar__acciones', { y: 22, opacity: 0, duration: .7, stagger: .05, scrollTrigger: { trigger: '.llegar__datos', start: 'top 75%', once: true } });

    /* 7 · Sin comisiones: la palabra se encoge y se tacha */
    const com = $$('.directo__l2 .ch');
    gs.set('.directo__tacha', { scaleX: 0 });
    $$('.directo__titulo .kin').forEach(k => entrarKin(k, { scrollTrigger: { trigger: '.directo__titulo', start: 'top 88%', once: true }, stagger: .03 }));
    gs.timeline({ scrollTrigger: { trigger: '.directo__titulo', start: 'top 55%', end: 'top 12%', scrub: .6 } })
      .fromTo(com, { '--an': 125 }, { '--an': 64, stagger: { each: .05, from: 'end' }, ease: 'power1.inOut', immediateRender: false }, 0)
      .to('.directo__tacha', { scaleX: 1, ease: 'power2.inOut', duration: .6 }, .25)
      .to(com, { opacity: .45, duration: .3 }, .55);
    gs.timeline({ scrollTrigger: { trigger: '.rutas', start: 'top 82%', once: true } })
      .from('.ruta__nodo', { scale: .5, opacity: 0, duration: .5, stagger: .1, ease: 'back.out(2)' }, 0)
      .from('.ruta__linea', { scaleX: 0, transformOrigin: 'left', duration: .6, stagger: .12, ease: 'power2.inOut' }, .15);
    gs.from('.directo__bajada, .directo__puntos li, .directo__grid > .btn', { y: 24, opacity: 0, duration: .7, stagger: .07, scrollTrigger: { trigger: '.directo__grid', start: 'top 82%', once: true } });

    /* 8 · Oferta */
    if (!$('#oferta').hidden) {
      gs.timeline({ scrollTrigger: { trigger: '#oferta', start: 'top 70%', once: true } })
        .from('.oferta__para, .oferta__titulo, .oferta__bajada', { y: 40, opacity: 0, duration: .9, stagger: .1 }, 0)
        .from('.oferta__titulo b', { scale: .6, rotate: -8, duration: .7, ease: 'back.out(2.2)' }, .35)
        .from('.oferta__lista li', { x: -30, opacity: 0, duration: .6, stagger: .08 }, .3)
        .from('#ofertaBtn', { y: 20, opacity: 0, duration: .6 }, .7);
    }

    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { heroMedir(); const ps = bordes.map(b => b.p); bordesMedir(); bordes.forEach((b, i) => { b.p = ps[i] ?? 1; b.pintar(); }); }, 150); });
  }

  /* =====================================================================
     ARRANQUE
     ===================================================================== */
  menuRender(); feedRender(); armadoRender(); resenasRender(); llegarRender(); ofertaRender(); pieRender();
  tabsInit(); menuInit(); pedidoInit(); pintarCarrito();
  partir();
  if (mover) movimiento();
  else {                                             // sin movimiento: todo en su estado final
    const fijo = () => { heroMedir(); bordesMedir(); };
    (document.fonts?.ready || Promise.resolve()).then(fijo); addEventListener('resize', fijo);
    manchas(0); addEventListener('resize', () => manchas(0));
  }
  setInterval(llegarRender, 60000);                  // el estado abierto/cerrado se actualiza solo
})();
