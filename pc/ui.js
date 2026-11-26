const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHECK = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
function render(){
  if(!ready()){ $('#list').innerHTML = '<div class="grp"><div class="msg">Relie Rituel dans l’app</div></div>'; $('#addZone').innerHTML = ''; return; }
  const g = groups();
  const rows = [...g.late.map(x => [x, true]), ...g.today.map(x => [x, false])];
  ptr = null;
  $('#list').innerHTML = rows.length ? '<div class="grp">' + rows.map(([x, late]) => `<div class="row" data-id="${x.id}"><i class="ck">${CHECK}</i><span class="tt ${late ? 'red' : ''}">${esc(x.title)}</span></div>`).join('') + '</div>' : '';
  if(!$('#newTask')) $('#addZone').innerHTML = '<button class="add" id="newTask"><b>+</b><span>Nouvelle tâche</span></button>';
}
function renderStatus(){}

document.addEventListener('click', e => {
  if(e.target.closest('#newTask')){ window.rw.newTask(); return; }
  const ck = e.target.closest('.ck');
  if(ck && ck.closest('.row[data-id]')){
    const r = ck.closest('.row'), id = r.dataset.id;
    r.classList.add('ok');
    setTimeout(() => r.classList.add('gone'), 260);
    setTimeout(() => { toggleTask(id); save(); render(); }, 480);
  }
});

let drag = null;
const head = document.querySelector('.h');
head.addEventListener('pointerdown', e => {
  if(document.body.classList.contains('locked') || e.button !== 0) return;
  drag = {x: e.screenX, y: e.screenY};
  head.setPointerCapture(e.pointerId);
});
head.addEventListener('pointermove', e => {
  if(!drag) return;
  const dx = e.screenX - drag.x, dy = e.screenY - drag.y;
  if(dx || dy){ window.rw.move(dx, dy); drag.x = e.screenX; drag.y = e.screenY; }
});
const endDrag = () => { if(drag){ drag = null; window.rw.moveEnd(); } };
head.addEventListener('pointerup', endDrag);
head.addEventListener('pointercancel', endDrag);
const setLock = on => document.body.classList.toggle('locked', !!on);
window.rw.state().then(s => setLock(s.lock));
window.rw.onLock((e, on) => setLock(on));

let ignoring = null, ptr = null;
function hover(){
  const el = ptr && document.elementFromPoint(ptr.x, ptr.y), t = el && el.closest('.row,.add');
  document.querySelectorAll('.hv').forEach(n => { if(n !== t) n.classList.remove('hv'); });
  if(t) t.classList.add('hv');
}
document.addEventListener('mousemove', e => {
  ptr = {x: e.clientX, y: e.clientY}; hover();
  if(drag) return;
  const over = !!e.target.closest('.grp,.add,.h');
  if(ignoring !== !over){ ignoring = !over; window.rw.mouse(ignoring); }
});
window.addEventListener('blur', () => { ptr = null; hover(); });
document.addEventListener('mouseleave', () => { ptr = null; hover(); if(ignoring !== true){ ignoring = true; window.rw.mouse(true); } });
window.rw.mouse(true); ignoring = true;
render();
syncNow();
