const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHECK = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
function render(){
  if(!ready()){ $('#list').innerHTML = '<div class="grp"><div class="msg">Relie Rituel dans l’app</div></div>'; $('#addZone').innerHTML = ''; return; }
  const g = groups();
  const rows = [...g.late.map(x => [x, true]), ...g.today.map(x => [x, false])];
  $('#list').innerHTML = rows.length ? '<div class="grp">' + rows.map(([x, late]) => `<div class="row" data-id="${x.id}"><i class="ck">${CHECK}</i><span class="tt ${late ? 'red' : ''}">${esc(x.title)}</span></div>`).join('') + '</div>' : '';
  if(!$('#newTask')) $('#addZone').innerHTML = '<label class="add"><b>+</b><input id="newTask" placeholder="Nouvelle tâche" maxlength="140"></label>';
}
function renderStatus(){}

document.addEventListener('click', e => {
  const ck = e.target.closest('.ck');
  if(ck && ck.closest('.row[data-id]')){
    const r = ck.closest('.row'), id = r.dataset.id;
    r.classList.add('ok');
    setTimeout(() => r.classList.add('gone'), 260);
    setTimeout(() => { toggleTask(id); save(); render(); }, 480);
  }
});
document.addEventListener('keydown', e => {
  if(e.target.id !== 'newTask') return;
  if(e.key === 'Escape'){ e.target.value = ''; e.target.blur(); }
  if(e.key === 'Enter'){
    const v = e.target.value.trim();
    if(v){ D.items.push({id: uid(), type: 'task', title: v, date: today(), done: false, doneAt: null, createdKey: today(), createdAt: Date.now()}); save(); }
    e.target.value = ''; render();
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

let ignoring = null;
document.addEventListener('mousemove', e => {
  if(drag) return;
  const over = !!e.target.closest('.grp,.add,.h');
  if(ignoring !== !over){ ignoring = !over; window.rw.mouse(ignoring); }
});
document.addEventListener('mouseleave', () => { if(ignoring !== true){ ignoring = true; window.rw.mouse(true); } });
window.rw.mouse(true); ignoring = true;
render();
syncNow();
