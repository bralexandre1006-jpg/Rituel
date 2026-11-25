const $ = s => document.querySelector(s);
const DO = [1, 2, 3, 4, 5, 6, 0], DL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const F = {date: today(), rec: false, days: [0, 1, 2, 3, 4, 5, 6], time: ''};
function render(){
  $('#f').innerHTML = `${F.rec ? '' : `<div class="d-row"><span>Date</span>${DP.btn('dDate', F.date)}</div>`}
    <div class="d-row"><span>Récurrente</span><button class="sw ${F.rec ? 'on' : ''}" data-a="rec"></button></div>
    ${F.rec ? `<div class="days">${DO.map(d => `<button class="day ${F.days.includes(d) ? 'on' : ''}" data-a="day" data-d="${d}">${DL[d]}</button>`).join('')}</div>` : ''}
    <div class="d-row"><span>Rappel</span><div class="tw"><input type="time" id="tm" value="${F.time}">${F.time ? '<button class="tclr" data-a="tclear" title="Retirer le rappel">✕</button>' : ''}</div></div>`;
  check();
}
const check = () => { $('#ok').disabled = !$('#t').value.trim() || (F.rec && !F.days.length); };
function add(){
  const title = $('#t').value.trim();
  if(!title || (F.rec && !F.days.length)) return;
  const x = {id: uid(), type: 'task', title, date: F.rec ? '' : F.date, done: false, doneAt: null, time: F.time, createdKey: today(), createdAt: Date.now()};
  if(F.rec) x.days = F.days.slice();
  D.items.push(x); save();
  setTimeout(() => window.rw.win('close'), 60);
}
document.addEventListener('click', e => {
  const db = e.target.closest('#dDate'); if(db){ DP.open(db, F.date, k => { F.date = k; render(); }); return; }
  const a = e.target.closest('[data-a]'); if(!a) return;
  switch(a.dataset.a){
    case 'cancel': window.rw.win('close'); break;
    case 'ok': add(); break;
    case 'rec': F.rec = !F.rec; render(); break;
    case 'day': { const d = +a.dataset.d; F.days = F.days.includes(d) ? F.days.filter(v => v !== d) : [...F.days, d]; render(); break; }
    case 'tclear': F.time = ''; render(); break;
  }
});
document.addEventListener('change', e => { if(e.target.id === 'tm'){ F.time = e.target.value; render(); } });
document.addEventListener('input', check);
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') window.rw.win('close');
  if(e.key === 'Enter' && e.target.id === 't') add();
});
render();
$('#t').focus();
