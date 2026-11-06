// Se inyecta en la página real durante la captura cuadro por cuadro:
// - tiempo virtual para todas las animaciones (CSS y Web Animations): avanzan solo cuando la captura lo pide;
// - scroll suave programático (scrollTo con behavior:'smooth') interpolado en tiempo virtual;
// - teclado genérico en español (sin marca), solo para la captura.
// Nada de esto existe en la página que se entrega: solo la vuelve determinista para el video.
export const RUNTIME = () => {
  const reg = new Map();
  const done = new WeakSet();
  const tweens = [];
  let vnow = 0;
  const winScrollTo = window.scrollTo.bind(window);
  const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  // scroll programático: como el de Chrome en celular (rápido al inicio, frena largo)
  const easeScroll = (u) => 1 - Math.pow(1 - u, 3.2);
  const isSmooth = (a) => a && typeof a === 'object' && a.behavior === 'smooth';
  window.scrollTo = function (a, b) {
    if (isSmooth(a)) {
      const from = window.scrollY, to = a.top;
      const dur = Math.min(760, Math.max(380, Math.abs(to - from) * 0.8));
      for (let i = tweens.length - 1; i >= 0; i--) tweens.splice(i, 1);
      tweens.push({ from, to, t0: vnow, dur });
      return;
    }
    return winScrollTo(a, b);
  };

  function syncAnims() {
    const list = new Set([...document.getAnimations(), ...reg.keys()]);
    for (const a of list) {
      if (done.has(a)) continue;
      if (!reg.has(a)) { reg.set(a, { t0: vnow }); a.pause(); }
      const r = reg.get(a);
      const elapsed = vnow - r.t0;
      const end = a.effect ? a.effect.getComputedTiming().endTime : 0;
      if (end !== Infinity && elapsed >= end - 0.5) { try { a.finish(); } catch (e) {} done.add(a); reg.delete(a); } else a.currentTime = elapsed;
    }
  }

  // ---------- teclado genérico ----------
  const KB_H = 291;
  let kb = null, kbOn = false;
  function buildKb() {
    const st = document.createElement('style');
    st.textContent = `
      #kb{position:fixed;left:0;right:0;bottom:0;height:${KB_H}px;z-index:9999;background:#D3D5D9;font-family:"DM Sans",system-ui,sans-serif;transform:translateY(100%);box-shadow:0 -1px 0 rgba(0,0,0,.06)}
      #kb .rows{padding:9px 3px 0;display:grid;gap:11px}
      #kb .row{display:flex;justify-content:center;gap:6px}
      #kb .k{width:33px;height:44px;border-radius:7px;background:#FDFDFE;box-shadow:0 1px 0 rgba(0,0,0,.3);display:grid;place-items:center;font-size:22px;color:#1B1B1B}
      #kb .row.num .k{height:38px;font-size:19px;background:#ECEDEF}
      #kb .k.esp{background:#B3B7BE;width:44px;font-size:15px}
      #kb .k.space{width:170px;font-size:15px;color:#55595f}
      #kb .k.ok{width:84px;background:#1B1B1B;color:#fff;font-size:15px}
      #kb .k.on{background:#BCC0C6}
      #kb .row.num .k.on{background:#C9CCD1}
      input{caret-color:#1B1B1B}`;
    document.head.appendChild(st);
    kb = document.createElement('div');
    kb.id = 'kb';
    const row = (keys, cls = '') => `<div class="row ${cls}">${keys.map((k) => (k.length === 1 ? `<span class="k" data-k="${k}">${k}</span>` : k)).join('')}</div>`;
    const shift = '<span class="k esp"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B1B1B" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4l8 8h-4.5v7h-7v-7H4z"/></svg></span>';
    const del = '<span class="k esp"><svg width="22" height="20" viewBox="0 0 26 24" fill="none" stroke="#1B1B1B" stroke-width="1.8" stroke-linejoin="round"><path d="M8 5h15v14H8l-6-7z"/><path d="M12 9l6 6M18 9l-6 6"/></svg></span>';
    kb.innerHTML = `<div class="rows">${row([...'1234567890'], 'num')}${row([...'qwertyuiop'])}${row([...'asdfghjklñ'])}${row([shift, ...'zxcvbnm', del])}
      <div class="row"><span class="k esp">?123</span><span class="k" data-k=":">:</span><span class="k space" data-k=" ">espacio</span><span class="k" data-k=".">.</span><span class="k ok" data-k="⏎">listo</span></div></div>`;
    document.body.appendChild(kb);
  }

  window.__cap = {
    step(dt) {
      vnow += dt;
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const u = Math.min(1, (vnow - tw.t0) / tw.dur);
        winScrollTo(0, tw.from + (tw.to - tw.from) * easeScroll(u));
        if (u >= 1) tweens.splice(i, 1);
      }
      syncAnims();
    },
    sync: syncAnims,
    get vnow() { return vnow; },
    setScroll(y) { winScrollTo(0, y); },
    scrollSuave(y) { window.scrollTo({ top: y, behavior: 'smooth' }); },
    teclado(on) {
      if (!kb) buildKb();
      if (on === kbOn) return;
      kbOn = on;
      kb.animate([{ transform: on ? 'translateY(100%)' : 'translateY(0)' }, { transform: on ? 'translateY(0)' : 'translateY(100%)' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      if (!on && document.activeElement) document.activeElement.blur();
    },
    tecla(ch) {
      const k = kb && kb.querySelector(`[data-k="${ch === '\n' ? '⏎' : ch.toLowerCase()}"]`);
      if (!k) return null;
      k.classList.add('on');
      setTimeout(() => k.classList.remove('on'), 80);
      const r = k.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },
    // la página sube el campo enfocado por encima del teclado, como el navegador del celular
    subirCampo(sel, margen = 26) {
      const r = document.querySelector(sel).getBoundingClientRect();
      const tope = innerHeight - KB_H - margen;
      if (r.bottom > tope) window.scrollTo({ top: window.scrollY + r.bottom - tope, behavior: 'smooth' });
    },
    maxScroll() { return document.documentElement.scrollHeight - innerHeight; },
  };
};
