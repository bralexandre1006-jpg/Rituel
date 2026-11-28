const DP = (() => {
  const MO = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  let pop = null, cb = null, cur = null, sel = '', th = 9, tm = null, tcommit = null;
  const label = k => {
    if(!k) return 'Choisir une date';
    if(k === today()) return "Aujourd'hui";
    if(k === key(addDays(new Date(), 1))) return 'Demain';
    const d = fromKey(k), s = d.toLocaleDateString('fr-BE', {weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined});
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  function close(){ tcommit = null; if(pop){ pop.remove(); pop = null; } document.removeEventListener('pointerdown', out, true); }
  function out(e){ if(pop && !pop.contains(e.target) && !e.target.closest('.dpb')) tcommit ? tcommit() : close(); }
  const p2 = n => String(n).padStart(2, '0');
  function pick(k){ const f = cb; close(); if(f) f(k); }
  function draw(){
    const y = cur.getFullYear(), m = cur.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), t = today();
    let cells = '';
    for(let i = 0; i < first; i++) cells += '<i></i>';
    for(let d = 1; d <= n; d++){ const k = key(new Date(y, m, d)); cells += `<button data-k="${k}" class="${k === sel ? 'on' : ''} ${k === t ? 'td' : ''} ${k < t ? 'past' : ''}">${d}</button>`; }
    pop.innerHTML = `<div class="dp-q"><button data-k="${t}">Aujourd'hui</button><button data-k="${key(addDays(new Date(), 1))}">Demain</button><button data-k="${key(addDays(new Date(), 7))}">Dans 1 sem.</button></div>
      <div class="dp-h"><button data-n="-1">‹</button><b>${MO[m]} ${y}</b><button data-n="1">›</button></div>
      <div class="dp-w"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="dp-g">${cells}</div>
      <button class="dp-x" data-k="">Sans date</button>`;
  }
  function open(anchor, value, onPick){
    close(); cb = onPick; sel = value || ''; cur = value ? fromKey(value) : new Date(); cur.setDate(1);
    pop = document.createElement('div'); pop.className = 'dp';
    document.body.appendChild(pop); draw();
    const r = anchor.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    pop.style.top = (r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
    pop.addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      if(b.dataset.n){ cur.setMonth(cur.getMonth() + +b.dataset.n); draw(); return; }
      if('k' in b.dataset) pick(b.dataset.k);
    });
    pop.addEventListener('wheel', e => { e.preventDefault(); cur.setMonth(cur.getMonth() + (e.deltaY > 0 ? 1 : -1)); draw(); }, {passive: false});
    setTimeout(() => document.addEventListener('pointerdown', out, true));
  }
  function drawT(){
    const col = (n, k) => `<div class="tpw" data-k="${k}">${[...Array(n).keys()].map(i => `<div data-i="${i}">${p2(i)}</div>`).join('')}</div>`;
    pop.innerHTML = `<div class="tpr"><div class="tpbar"></div>${col(24, 'h')}<b>:</b>${col(60, 'm')}</div>
      <div class="tp-f"><button class="dp-x" data-t="">Aucun rappel</button><button class="tp-ok" data-ok>OK</button></div>`;
    const [hw, mw] = pop.querySelectorAll('.tpw');
    hw.scrollTop = th * 36; mw.scrollTop = tm * 36;
    [hw, mw].forEach(w => {
      let t = null;
      w.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { th = Math.round(hw.scrollTop / 36); tm = Math.round(mw.scrollTop / 36); }, 80); }, {passive: true});
      w.addEventListener('click', e => { const d = e.target.closest('[data-i]'); if(d) w.scrollTo({top: +d.dataset.i * 36, behavior: 'smooth'}); });
    });
  }
  function place(anchor){
    const r = anchor.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    pop.style.top = (r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  }
  function openTime(anchor, value, onPick){
    close(); cb = onPick;
    if(value){ const [a, b] = value.split(':').map(Number); th = a; tm = b; } else { th = Math.min(23, new Date().getHours() + 1); tm = 0; }
    pop = document.createElement('div'); pop.className = 'dp tp';
    document.body.appendChild(pop); drawT(); place(anchor);
    tcommit = () => { const f = cb, [hw, mw] = pop.querySelectorAll('.tpw'), v = `${p2(Math.round(hw.scrollTop / 36))}:${p2(Math.round(mw.scrollTop / 36))}`; close(); if(f && v !== value) f(v); };
    pop.addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      if('t' in b.dataset){ const f = cb; close(); if(f) f(b.dataset.t); return; }
      if('ok' in b.dataset) tcommit();
    });
    setTimeout(() => document.addEventListener('pointerdown', out, true));
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && pop){ e.stopPropagation(); close(); } }, true);
  const btn = (id, k) => `<button class="dpb" id="${id}">${CAL}<span>${label(k)}</span></button>`;
  const CAL = '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  const CLK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
  const tbtn = (id, v) => `<button class="dpb" id="${id}">${CLK}<span>${v || 'Aucun'}</span></button>`;
  return {open, openTime, close, label, btn, tbtn};
})();
