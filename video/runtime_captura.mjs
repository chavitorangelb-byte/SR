// Runtime que se inyecta en la página durante la captura: tiempo virtual, scroll, teclado genérico.
// ---------- runtime dentro de la página ----------
export const RUNTIME = () => {
  const reg = new Map();
  const done = new WeakSet();
  const tweens = [];
  let vnow = 0;
  const winScrollTo = window.scrollTo.bind(window);
  const elScrollTo = Element.prototype.scrollTo;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const cur = (t, axis) => (t === window ? (axis === 'top' ? window.scrollY : window.scrollX) : (axis === 'top' ? t.scrollTop : t.scrollLeft));
  function tween(target, opts) {
    for (const axis of ['top', 'left']) {
      if (opts[axis] == null) continue;
      const from = cur(target, axis), to = opts[axis];
      const dur = Math.min(700, Math.max(320, Math.abs(to - from) * 0.9));
      for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].target === target && tweens[i].axis === axis) tweens.splice(i, 1);
      tweens.push({ target, axis, from, to, t0: vnow, dur });
    }
  }
  const isSmooth = (a) => a && typeof a === 'object' && a.behavior === 'smooth';
  window.scrollTo = function (a, b) { if (isSmooth(a)) return tween(window, a); return winScrollTo(a, b); };
  window.scrollBy = function (a, b) { if (isSmooth(a)) return tween(window, { top: a.top != null ? window.scrollY + a.top : null, left: a.left != null ? window.scrollX + a.left : null }); return winScrollTo(window.scrollX + ((a && a.left) || 0), window.scrollY + ((a && a.top) || 0)); };
  Element.prototype.scrollTo = function (a, b) { if (isSmooth(a)) return tween(this, a); return elScrollTo.call(this, a, b); };
  Element.prototype.scrollBy = function (a) { if (isSmooth(a)) return tween(this, { top: a.top != null ? this.scrollTop + a.top : null, left: a.left != null ? this.scrollLeft + a.left : null }); return elScrollTo.call(this, { top: this.scrollTop + ((a && a.top) || 0), left: this.scrollLeft + ((a && a.left) || 0) }); };
  function set(target, axis, v) {
    if (target === window) winScrollTo(axis === 'left' ? v : window.scrollX, axis === 'top' ? v : window.scrollY);
    else elScrollTo.call(target, axis === 'top' ? { top: v } : { left: v });
  }
  function syncAnims() {
    // también las ya registradas: una animación sin fill sale de getAnimations() al llegar a su final
    const list = new Set([...document.getAnimations(), ...reg.keys()]);
    for (const a of list) {
      if (done.has(a)) continue;
      if (!reg.has(a)) { reg.set(a, { t0: vnow, c0: a.currentTime || 0 }); a.pause(); }
      const r = reg.get(a);
      const elapsed = vnow - r.t0 + r.c0;
      const end = a.effect ? a.effect.getComputedTiming().endTime : 0;
      if (end !== Infinity && elapsed >= end - 0.5) { try { a.finish(); } catch (e) {} done.add(a); reg.delete(a); } else a.currentTime = elapsed;
    }
  }

  // ---- teclado genérico (solo en captura): español, con ñ y barra de sugerencias ----
  const KB_H = 296;
  let kb = null, kbOn = false, sheetH0 = null;
  const SUG = (w) => {
    const x = w.toLowerCase();
    if (!x) return ['Feliz', 'Para', 'Te'];
    if ('feliz'.startsWith(x) && x.length < 5) return ['Fe', 'Feliz', 'Felicidades'];
    if ('cumpleaños'.startsWith(x)) return [w, 'cumpleaños', 'cumple'];
    return [w, w, w];
  };
  function buildKb() {
    const st = document.createElement('style');
    st.textContent = `
      #kb{position:fixed;left:0;right:0;bottom:0;height:${KB_H}px;z-index:9999;background:#D2D4CD;font-family:"DM Sans",system-ui,sans-serif;transform:translateY(100%);box-shadow:0 -1px 0 rgba(0,0,0,.08)}
      #kb .sug{display:grid;grid-template-columns:1fr 1fr 1fr;height:44px;align-items:center;text-align:center;font-size:17px;color:#2E2D24}
      #kb .sug span{border-right:1px solid rgba(46,45,36,.18);line-height:26px;padding:0 6px;white-space:nowrap;overflow:hidden}
      #kb .sug span:last-child{border-right:0}
      #kb .sug span:nth-child(2){font-weight:600}
      #kb .rows{padding:6px 3px 0;display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
      #kb .row{display:flex;justify-content:center;gap:6px}
      #kb .k{width:33px;height:46px;border-radius:7px;background:#FCFCFA;box-shadow:0 1px 0 rgba(0,0,0,.28);display:grid;place-items:center;font-size:22px;color:#1F1F1A;transition:none}
      #kb .k.esp{background:#B5B8AF;width:46px;font-size:15px}
      #kb .k.space{width:176px;font-size:15px;color:#55554c}
      #kb .k.on{background:#BEC1B8}
      textarea,input{caret-color:transparent!important}`;
    document.head.appendChild(st);
    kb = document.createElement('div');
    kb.id = 'kb';
    const row = (keys) => `<div class="row">${keys.map((k) => (k.length === 1 ? `<span class="k" data-k="${k}">${k}</span>` : k)).join('')}</div>`;
    const shift = '<span class="k esp"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F1F1A" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4l8 8h-4.5v7h-7v-7H4z"/></svg></span>';
    const del = '<span class="k esp"><svg width="22" height="20" viewBox="0 0 26 24" fill="none" stroke="#1F1F1A" stroke-width="1.8" stroke-linejoin="round"><path d="M8 5h15v14H8l-6-7z"/><path d="M12 9l6 6M18 9l-6 6"/></svg></span>';
    kb.innerHTML = `<div class="sug"><span id="kb-sug-0"></span><span id="kb-sug-1"></span><span id="kb-sug-2"></span></div>
      <div class="rows">${row([...'qwertyuiop'])}${row([...'asdfghjklñ'])}${row([shift, ...'zxcvbnm', del])}
      <div class="row"><span class="k esp">123</span><span class="k">,</span><span class="k space" data-k=" ">espacio</span><span class="k">.</span><span class="k esp">intro</span></div></div>`;
    document.body.appendChild(kb);
    const msg = document.getElementById('msg');
    kb.querySelector('#kb-sug-1').addEventListener('click', () => {
      const s = msg.value.split(' ');
      s[s.length - 1] = document.getElementById('kb-sug-1').textContent;
      msg.value = s.join(' ') + ' ';
      msg.dispatchEvent(new Event('input', { bubbles: true }));
      sug();
    });
    sug();
  }
  function sug() {
    const msg = document.getElementById('msg');
    const last = msg.value.endsWith(' ') ? '' : msg.value.split(' ').pop();
    const s = msg.value && msg.value.endsWith(' ') && /feliz $/i.test(msg.value) ? ['día', 'cumpleaños', 'aniversario'] : SUG(last);
    s.forEach((x, i) => { document.getElementById('kb-sug-' + i).textContent = x; });
  }

  window.__cap = {
    step(dt) {
      vnow += dt;
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const u = Math.min(1, (vnow - tw.t0) / tw.dur);
        set(tw.target, tw.axis, tw.from + (tw.to - tw.from) * ease(u));
        if (u >= 1) tweens.splice(i, 1);
      }
      syncAnims();
    },
    sync: syncAnims,
    get vnow() { return vnow; },
    setScroll(y, max) {
      const mov = [document.querySelector('main'), document.getElementById('pie')];
      if (max != null && y > max) { winScrollTo(0, max); mov.forEach((e) => { e.style.transform = `translateY(${-(y - max)}px)`; }); }
      else { winScrollTo(0, y); mov.forEach((e) => { e.style.transform = ''; }); }
    },
    carrusel(left) { const r = document.getElementById('reviews'); r.style.scrollSnapType = 'none'; elScrollTo.call(r, { left }); },
    carruselFin() { document.getElementById('reviews').style.scrollSnapType = ''; },
    teclado(on) {
      if (!kb) buildKb();
      if (on === kbOn) return;
      kbOn = on;
      const sheet = document.getElementById('sheet');
      if (sheetH0 == null) sheetH0 = sheet.getBoundingClientRect().height;
      const opts = { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' };
      if (on) kb.style.display = '';
      const ka = kb.animate([{ transform: on ? 'translateY(100%)' : 'translateY(0)' }, { transform: on ? 'translateY(0)' : 'translateY(100%)' }], opts);
      if (!on) ka.finished.then(() => { kb.style.display = 'none'; });
      sheet.animate([{ bottom: on ? '0px' : `${KB_H}px`, height: `${on ? sheetH0 : sheetH0 - KB_H}px` }, { bottom: on ? `${KB_H}px` : '0px', height: `${on ? sheetH0 - KB_H : sheetH0}px` }], opts);
      if (on) {
        const pane = document.querySelector('.pane[data-step="2"]');
        const msg = document.getElementById('msg');
        pane.scrollTo({ top: Math.max(0, msg.offsetTop - 70), behavior: 'smooth' });
      } else document.getElementById('msg').blur();
    },
    tecla(ch) {
      const k = kb && kb.querySelector(`[data-k="${ch.toLowerCase()}"]`);
      if (k) { k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 90); }
      sug();
      if (!k) return null;
      const r = k.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },
    destino(name) {
      const top = document.querySelector('.topbar').offsetHeight;
      const Y = (el) => el.getBoundingClientRect().top + window.scrollY;
      if (name === 'catalogo-trio') {
        const bar = document.querySelector('.filters');
        const meta = document.querySelector('.card[data-id="tulipanes-y-rosas"] .card-meta');
        return Math.round(Y(meta) - (top + bar.offsetHeight + 10));
      }
      if (name === 'como-funciona') return Math.round(Y(document.querySelector('#como-funciona .eyebrow')) - top - 18);
      if (name === 'pick-up') { const el = document.querySelector('#como-funciona .how-item:nth-child(2)'); return Math.round(Y(el) + el.offsetHeight - (innerHeight - 150)); }
      if (name === 'resenas') return Math.round(Y(document.querySelector('#resenas .eyebrow')) - top - 18);
      if (name === 'pie') return document.documentElement.scrollHeight - innerHeight;
      throw new Error('destino ' + name);
    },
    maxScroll() { return document.documentElement.scrollHeight - innerHeight; },
  };
};

