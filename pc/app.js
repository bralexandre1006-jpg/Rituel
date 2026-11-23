const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHECK = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
const DAY_ORDER = [1,2,3,4,5,6,0], DL = {0:'D',1:'L',2:'M',3:'M',4:'J',5:'V',6:'S'}, DS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const LISTS = [
  ['today', "Aujourd'hui", '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'],
  ['none', 'Quand je veux', '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'],
  ['upcoming', 'À venir', '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>'],
  ['all', 'Toutes', '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="4" cy="7" r=".5"/></svg>'],
  ['done', 'Terminées', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.8"/></svg>']
];
let view = 'today', sel = null, q = '', newId = null;

const dateLabel = k => {
  const t = today();
  if(k === t) return "Aujourd'hui";
  if(k === key(addDays(new Date(), 1))) return 'Demain';
  if(k === key(addDays(new Date(), -1))) return 'Hier';
  const s = fromKey(k).toLocaleDateString('fr-BE', {weekday: 'long', day: 'numeric', month: 'long'});
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const schedText = days => {
  const s = [...days].sort().join(',');
  if(days.length === 7) return 'Chaque jour';
  if(s === '1,2,3,4,5') return 'En semaine';
  if(s === '0,6') return 'Week-end';
  return DAY_ORDER.filter(d => days.includes(d)).map(d => DS[d]).join(' · ');
};
function buckets(){
  const t = today(), b = {late: [], today: [], none: [], upcoming: [], rec: [], done: []};
  tasks().forEach(x => {
    if(isRec(x)){ if(recDone(x, t)) b.done.push(x); else if(recDue(x, t)) b.today.push(x); else b.rec.push(x); return; }
    if(x.done){ b.done.push(x); return; }
    if(!x.date) b.none.push(x);
    else if(x.date < t) b.late.push(x);
    else if(x.date === t) b.today.push(x);
    else b.upcoming.push(x);
  });
  for(const k in b) b[k].sort(bySort);
  b.upcoming.sort((a, c) => a.date.localeCompare(c.date));
  b.done.sort((a, c) => (c.doneAt || 0) - (a.doneAt || 0));
  return b;
}
function sections(){
  const b = buckets();
  const f = arr => q ? arr.filter(x => x.title.toLowerCase().includes(q)) : arr;
  switch(view){
    case 'today': return [['late', 'EN RETARD', f(b.late)], ['', "AUJOURD'HUI", f(b.today)]];
    case 'none': return [['', 'QUAND JE VEUX', f(b.none)]];
    case 'upcoming': return [['', 'À VENIR', f(b.upcoming)], ['', 'RÉCURRENTES', f(b.rec)]];
    case 'all': return [['late', 'EN RETARD', f(b.late)], ['', "AUJOURD'HUI", f(b.today)], ['', 'QUAND JE VEUX', f(b.none)], ['', 'À VENIR', f(b.upcoming)], ['', 'RÉCURRENTES', f(b.rec)]];
    case 'done': return [['', 'TERMINÉES', f(b.done).slice(0, 150)]];
  }
  return [];
}
function counts(){
  const b = buckets();
  return {today: b.late.length + b.today.length, none: b.none.length, upcoming: b.upcoming.length + b.rec.length,
    all: b.late.length + b.today.length + b.none.length + b.upcoming.length + b.rec.length, done: b.done.length};
}
function card(x){
  const t = today(), ok = isDoneNow(x), m = [];
  if(isRec(x)) m.push(`<span class="rep">${schedText(x.days)}</span>`);
  else if(x.date) m.push(`<span class="${!ok && x.date < t ? 'red' : ''}">${dateLabel(x.date)}</span>`);
  const n = (x.notes || '').split('\n').filter(l => l.replace(/^[-•*\s]+/, '').trim()).length;
  if(n) m.push(`<span>${n} note${n > 1 ? 's' : ''}</span>`);
  return `<div class="card ${ok ? 'ok' : ''} ${x.id === sel ? 'sel' : ''}" data-id="${x.id}"><i class="ck">${CHECK}</i><div class="cx"><div class="ct">${esc(x.title || 'Sans titre')}</div>${m.length ? `<div class="cm">${m.join('')}</div>` : ''}</div></div>`;
}
function renderSide(){
  const c = counts();
  $('#lists').innerHTML = LISTS.map(([k, l, ic]) => `<button class="nav ${view === k ? 'on' : ''}" data-v="${k}">${ic}<span>${l}</span><em>${c[k] || ''}</em></button>`).join('');
  document.querySelector('.nav[data-v="settings"]').classList.toggle('on', view === 'settings');
  const f = $('#syncFoot');
  f.className = 'side-foot' + (!ready() ? ' off' : syncErr ? ' err' : '');
  f.innerHTML = `<i></i>${!ready() ? 'Non relié au téléphone' : syncErr ? 'Hors ligne' : 'Synchronisé'}`;
}
function renderList(){
  const L = LISTS.find(l => l[0] === view);
  $('#listTitle').textContent = L ? L[1] : '';
  const secs = sections(), total = secs.reduce((a, s) => a + s[2].length, 0);
  $('#listCount').textContent = `${total} tâche${total > 1 ? 's' : ''}`;
  const h = secs.filter(s => s[2].length).map(([c, l, arr]) => `<div class="grp ${c}">${l}</div>` + arr.map(card).join('')).join('');
  $('#items').innerHTML = h || `<div class="none">${q ? 'Aucun résultat' : view === 'done' ? 'Rien de terminé pour l’instant' : 'Rien à faire'}</div>`;
}
function renderDetail(){
  const x = D.items.find(i => i.id === sel);
  const d = $('#detail');
  if(!x){
    d.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Aucune tâche sélectionnée<button class="pbtn" data-a="new">Nouvelle tâche</button></div>`;
    return;
  }
  const rec = isRec(x), ok = isDoneNow(x);
  d.innerHTML = `<input class="d-title" id="dTitle" placeholder="Nouvelle tâche" maxlength="140" value="${esc(x.title)}">
    <div class="d-meta">${rec ? schedText(x.days) : x.date ? dateLabel(x.date) : 'Quand je veux'}${ok ? ' · faite' : ''}</div>
    <div class="d-sec"><div class="d-lbl">QUAND</div>
      ${rec ? '' : `<div class="d-row"><span>Date</span><input type="date" id="dDate" value="${x.date || ''}"></div>`}
      <div class="d-row"><span>Récurrente</span><button class="sw ${rec ? 'on' : ''}" data-a="rec"></button></div>
      ${rec ? `<div class="days">${DAY_ORDER.map(dd => `<button class="day ${x.days.includes(dd) ? 'on' : ''}" data-a="day" data-d="${dd}">${DL[dd]}</button>`).join('')}</div>` : ''}
    </div>
    <div class="d-sec"><div class="d-lbl">NOTES</div><textarea class="d-notes" id="dNotes" placeholder="- Une idée par ligne">${esc(x.notes || '')}</textarea></div>
    <div class="d-act"><button class="abtn" data-a="toggle">${ok ? 'Décocher' : 'Marquer comme faite'}</button><button class="abtn del" data-a="del">Supprimer</button></div>`;
}
function renderSettings(){
  const s = $('#settings');
  window.rw.state().then(st => {
    const W = [['list', 'Liste complète', 'Toutes tes tâches, on coche et on ajoute'], ['count', 'Compteur du jour', 'Tâches faites aujourd’hui'], ['short', 'Liste courte', 'Les 4 prochaines tâches']];
    const mini = t => t === 'count'
      ? `<div class="mini"><div class="mb"><b>Aujourd'hui</b><i class="o" style="background:#FEBC2E"></i><i style="background:#28C840"></i><i style="background:#FF5F57"></i></div><div style="font-size:20px;font-weight:800;margin-top:10px">2/5</div></div>`
      : `<div class="mini"><div class="mb"><b>${t === 'list' ? 'Tâches' : 'Prochaine'}</b><i style="background:#FEBC2E"></i><i style="background:#28C840"></i><i style="background:#FF5F57"></i></div><div class="l"></div><div class="l"></div><div class="l"></div></div>`;
    s.innerHTML = `<h1>Paramètres</h1>
      <div class="s-sec"><h2>WIDGETS DE BUREAU</h2><div class="wgrid">${W.map(([t, n, d]) => `<div class="wcard"><div class="wprev">${mini(t)}</div>
        <div class="wcard-row"><div><b>${n}</b><small>${d}</small></div><button class="wadd ${st.widgets[t] ? 'on' : ''}" data-a="widget" data-t="${t}">${st.widgets[t] ? 'Retirer' : 'Ajouter'}</button></div></div>`).join('')}</div></div>
      <div class="s-sec"><h2>COMPORTEMENT</h2>
        <div class="s-row"><div><b>Widgets toujours au premier plan</b><small>Restent visibles au-dessus des fenêtres</small></div><button class="sw ${st.top ? 'on' : ''}" data-a="top"></button></div>
        <div class="s-row"><div><b>Lancer au démarrage de Windows</b><small>Les widgets s’affichent dès l’ouverture de session</small></div><button class="sw ${st.login ? 'on' : ''}" data-a="login"></button></div>
      </div>
      <div class="s-sec"><h2>SYNCHRONISATION</h2>
        <div class="s-row"><div><b>Code de jumelage</b><small>Sur ton téléphone : Réglages, Synchronisation PC</small></div>
          <div class="code"><input id="code" placeholder="xxxx-xxxx-xxxx-xxxx-xxxx-xxxx" value="${esc(D.code || '')}" spellcheck="false"><button class="abtn" data-a="pair">Relier</button></div></div>
        <div class="s-row"><div><b>État</b><small>${!ready() ? 'Pas encore relié' : syncErr ? 'Hors ligne, nouvel essai dans quelques secondes' : D.sync.last ? 'Synchronisé à ' + new Date(D.sync.last).toLocaleTimeString('fr-BE', {hour: '2-digit', minute: '2-digit'}) : 'En attente'}</small></div><button class="abtn soft" data-a="syncnow">Synchroniser</button></div>
      </div>`;
  });
}
function render(){
  renderSide();
  const set = view === 'settings';
  document.querySelector('.app').classList.toggle('set', set);
  $('#mid').hidden = set; $('#detail').hidden = set; $('#settings').hidden = !set;
  if(set){ renderSettings(); return; }
  renderList();
  if(!document.activeElement || !$('#detail').contains(document.activeElement)) renderDetail();
}
function renderStatus(){ renderSide(); if(view === 'settings') renderSettings(); }
const item = () => D.items.find(i => i.id === sel);
function newTask(){
  const id = uid();
  D.items.push({id, type: 'task', title: '', date: view === 'today' ? today() : '', done: false, doneAt: null, createdKey: today(), createdAt: Date.now()});
  newId = id; sel = id; if(view === 'done' || view === 'settings') view = 'all';
  save(); render(); renderDetail();
  setTimeout(() => $('#dTitle') && $('#dTitle').focus(), 30);
}
function dropEmptyNew(){
  if(!newId) return;
  const x = D.items.find(i => i.id === newId);
  if(x && !x.title.trim()){ D.items = D.items.filter(i => i.id !== newId); if(sel === newId) sel = null; save(); }
  newId = null;
}

document.addEventListener('click', e => {
  const w = e.target.closest('[data-w]'); if(w){ window.rw.win(w.dataset.w); return; }
  const nav = e.target.closest('.nav'); if(nav){ dropEmptyNew(); view = nav.dataset.v; render(); return; }
  if(e.target.closest('#newBtn')){ newTask(); return; }
  const ck = e.target.closest('.ck');
  if(ck){
    const c = ck.closest('.card'), id = c.dataset.id, x = D.items.find(i => i.id === id), was = isDoneNow(x);
    c.classList.toggle('ok', !was);
    setTimeout(() => { if(view !== 'all' || !was) c.classList.add('gone'); }, 260);
    setTimeout(() => { toggleTask(id); save(); render(); renderDetail(); }, 480);
    return;
  }
  const cd = e.target.closest('.card'); if(cd){ if(cd.dataset.id !== newId) dropEmptyNew(); sel = cd.dataset.id; render(); renderDetail(); return; }
  const a = e.target.closest('[data-a]'); if(!a) return;
  const x = item();
  switch(a.dataset.a){
    case 'new': newTask(); break;
    case 'rec': if(!x) break; if(isRec(x)) delete x.days; else { x.days = [0,1,2,3,4,5,6]; x.date = ''; x.done = false; } save(); render(); renderDetail(); break;
    case 'day': { if(!x) break; const d = +a.dataset.d; x.days = x.days.includes(d) ? x.days.filter(v => v !== d) : [...x.days, d]; if(!x.days.length) delete x.days; save(); render(); renderDetail(); break; }
    case 'toggle': if(!x) break; toggleTask(x.id); save(); render(); renderDetail(); break;
    case 'del': if(!x) break; D.items = D.items.filter(i => i.id !== x.id); D.log = D.log.filter(l => l.itemId !== x.id); sel = null; newId = null; save(); render(); renderDetail(); break;
    case 'widget': window.rw.widget(a.dataset.t, !a.classList.contains('on')); setTimeout(renderSettings, 300); break;
    case 'top': window.rw.top(!a.classList.contains('on')); a.classList.toggle('on'); break;
    case 'login': window.rw.login(!a.classList.contains('on')); a.classList.toggle('on'); break;
    case 'pair': { const v = ($('#code').value || '').trim().toLowerCase(); if(v.replace(/-/g, '').length < 24){ $('#code').style.boxShadow = 'inset 0 0 0 1.5px #FF5F57'; break; } D.code = v; D.sync.last = 0; persist(); syncNow().then(renderSettings); break; }
    case 'syncnow': syncNow().then(renderSettings); break;
  }
});
document.addEventListener('input', e => {
  const x = item(); if(!x) return;
  if(e.target.id === 'dTitle'){ x.title = e.target.value; save(); renderList(); }
  if(e.target.id === 'dNotes'){ x.notes = e.target.value; save(); renderList(); }
  if(e.target.id === 'q'){ q = e.target.value.trim().toLowerCase(); renderList(); }
});
document.addEventListener('change', e => {
  const x = item(); if(!x) return;
  if(e.target.id === 'dDate'){ x.date = e.target.value || ''; save(); render(); renderDetail(); }
});
document.addEventListener('keydown', e => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n'){ e.preventDefault(); newTask(); }
  if(e.key === 'Enter' && e.target.id === 'dTitle'){ e.preventDefault(); e.target.blur(); newId = null; }
  if(e.key === 'Enter' && e.target.id === 'code') document.querySelector('[data-a="pair"]').click();
});
document.addEventListener('focusout', e => { if(e.target.id === 'dTitle') setTimeout(() => { if(!$('#detail').contains(document.activeElement)) dropEmptyNew(), render(); }, 0); });
if(window.rw.onWidgets) window.rw.onWidgets(() => { if(view === 'settings') renderSettings(); });
render();
syncNow();
