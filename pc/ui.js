const type = new URLSearchParams(location.search).get('type') || 'list';
const TITLES = {list: 'Tâches', count: "Aujourd'hui", short: 'Prochaine'};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHECK = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
let pairing = false;

function dateLabel(k){
  const t = today();
  if(k === t) return "Aujourd'hui";
  if(k === key(addDays(new Date(), -1))) return 'Hier';
  return fromKey(k).toLocaleDateString('fr-BE', {weekday: 'short', day: 'numeric', month: 'short'});
}
function schedText(days){
  const s = [...days].sort().join(',');
  if(days.length === 7) return 'Chaque jour';
  if(s === '1,2,3,4,5') return 'En semaine';
  if(s === '0,6') return 'Week-end';
  return [1,2,3,4,5,6,0].filter(d => days.includes(d)).map(d => DAYS[d]).join(' · ');
}
function row(x, late){
  const meta = isRec(x) ? `<div class="mt rep">${schedText(x.days)}</div>` : late ? `<div class="mt red">${dateLabel(x.date)}</div>` : '';
  return `<div class="row" data-id="${x.id}"><i class="ck">${CHECK}</i><div class="tx"><div class="tt">${esc(x.title)}</div>${meta}</div></div>`;
}
function status(){
  if(!(window.FB && FB.apiKey)) return '<div class="status err"><i></i>Synchro pas encore configurée</div>';
  return `<div class="status ${syncErr ? 'err' : ''}" id="status"><i></i>${syncErr ? 'Hors ligne' : 'Synchronisé avec ton téléphone'}</div>`;
}
function pairView(){
  if(!(window.FB && FB.apiKey)) return '<div class="pair">La synchronisation n’est pas encore configurée dans cette version.</div>';
  if(type !== 'list') return '<div class="pair">Relie Rituel depuis le widget Liste complète.</div>';
  return `<div class="pair">Sur ton téléphone : Rituel, Réglages, Synchronisation PC. Copie le code et colle-le ici.
    <input id="code" placeholder="xxxx-xxxx-xxxx-xxxx-xxxx-xxxx" value="${esc(D.code || '')}" spellcheck="false">
    <button id="pairGo">Relier</button></div>`;
}
function render(){
  const g = groups(), p = progress();
  $('#title').textContent = TITLES[type];
  $('#count').textContent = type === 'list' && p.left ? `${p.left} à faire` : '';
  const body = $('#body');
  if(pairing || !ready()){ body.innerHTML = pairView(); return; }
  if(type === 'count'){
    const pct = p.total ? p.done / p.total : 0, C = 163.4;
    body.innerHTML = `<div class="count"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="6"/>
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--acc)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg>
      <div><div class="big">${p.done}/${p.total}</div><div class="lbl">${p.total && !p.left ? 'tout est fait' : 'tâches faites'}</div></div></div>`;
    return;
  }
  if(type === 'short'){
    const list = [...g.late, ...g.today, ...g.none].slice(0, 4);
    body.innerHTML = list.length ? `<div class="grp">${list.map(x => row(x, g.late.includes(x))).join('')}</div>` : '<div class="empty">Rien à faire</div>';
    return;
  }
  let h = '';
  [['late', 'En retard'], ['today', "Aujourd'hui"], ['none', 'Quand je veux']].forEach(([k, l]) => {
    if(!g[k].length) return;
    h += `<div class="sec ${k === 'late' ? 'late' : ''}"><span>${l}</span><span>${g[k].length}</span></div><div class="grp">${g[k].map(x => row(x, k === 'late')).join('')}</div>`;
  });
  body.innerHTML = (h || '<div class="empty">Rien à faire</div>')
    + '<label class="add"><b>+</b><input id="newTask" placeholder="Nouvelle tâche" maxlength="140"></label>' + status();
}
function renderStatus(){
  const s = $('#status'); if(!s) return;
  s.classList.toggle('err', syncErr);
  s.lastChild.textContent = syncErr ? 'Hors ligne' : 'Synchronisé avec ton téléphone';
}

document.addEventListener('click', e => {
  const dot = e.target.closest('.dot');
  if(dot){
    const a = dot.dataset.a;
    if(a === 'min') rw.min();
    else if(a === 'close') rw.close();
    else { const on = !document.body.classList.contains('collapsed'); document.body.classList.toggle('collapsed', on); rw.collapse(on); }
    return;
  }
  const ck = e.target.closest('.ck');
  if(ck){
    const r = ck.closest('.row'), id = r.dataset.id;
    r.classList.add('ok');
    setTimeout(() => r.classList.add('gone'), 280);
    setTimeout(() => { toggleTask(id); save(); render(); }, 520);
    return;
  }
  if(e.target.id === 'pairGo') pair();
});
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter') return;
  if(e.target.id === 'newTask'){ const v = e.target.value.trim(); if(v){ addTask(v); render(); setTimeout(() => $('#newTask') && $('#newTask').focus(), 0); } }
  if(e.target.id === 'code') pair();
});
function pair(){
  const v = ($('#code').value || '').trim().toLowerCase();
  if(v.replace(/-/g, '').length < 24){ $('#code').style.boxShadow = 'inset 0 0 0 1.5px #FF5F57'; return; }
  D.code = v; D.sync.last = 0; persist(); pairing = false; render(); syncNow();
}
rw.onPair(() => { pairing = true; render(); });
render();
syncNow();
