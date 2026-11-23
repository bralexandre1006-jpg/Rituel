const KEY = 'rituel.pc';
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => key(new Date());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function load(){
  try{
    const d = JSON.parse(localStorage.getItem(KEY));
    if(d && Array.isArray(d.items)) return Object.assign({log: [], code: ''}, d, {sync: Object.assign({tomb: {}, ltomb: {}, last: 0}, d.sync)});
  }catch(e){}
  return {items: [], log: [], code: '', sync: {tomb: {}, ltomb: {}, last: 0}};
}
let D = load();

const tasks = () => D.items.filter(x => x.type === 'task');
const isRec = x => Array.isArray(x.days) && x.days.length > 0;
const recDue = (x, k) => x.days.includes(fromKey(k).getDay());
const recDone = (x, k) => D.log.some(l => l.itemId === x.id && l.date === k);
const isDoneNow = x => isRec(x) ? recDone(x, today()) : !!x.done;
const ord = x => x.order === undefined ? 1e9 : x.order;
const bySort = (a, b) => (ord(a) - ord(b)) || ((a.date || '9999') + (a.time || '99')).localeCompare((b.date || '9999') + (b.time || '99'));

function groups(){
  const t = today(), g = {late: [], today: [], none: []};
  tasks().forEach(x => {
    if(isRec(x)){ if(recDue(x, t) && !recDone(x, t)) g.today.push(x); return; }
    if(x.done) return;
    if(!x.date) g.none.push(x);
    else if(x.date < t) g.late.push(x);
    else if(x.date === t) g.today.push(x);
  });
  for(const k in g) g[k].sort(bySort);
  return g;
}
function progress(){
  const t = today();
  const done = tasks().filter(x => isRec(x) ? recDone(x, t) : (x.done && x.doneAt && key(new Date(x.doneAt)) === t)).length;
  const g = groups(), left = g.late.length + g.today.length + g.none.length;
  return {done, left, total: done + left};
}

let snap = null;
const sig = x => JSON.stringify(Object.assign({}, x, {u: undefined}));
function track(){
  const now = Date.now(), cur = {}, logs = new Set(D.log.map(l => l.id));
  tasks().forEach(x => cur[x.id] = sig(x));
  if(snap){
    for(const id in cur) if(snap.items[id] !== cur[id]){ const it = D.items.find(x => x.id === id); if(it) it.u = now; }
    for(const id in snap.items) if(!(id in cur)) D.sync.tomb[id] = now;
    snap.logs.forEach(id => { if(!logs.has(id)) D.sync.ltomb[id] = now; });
  }
  snap = {items: cur, logs: [...logs]};
}
track();
const persist = () => { try{ localStorage.setItem(KEY, JSON.stringify(D)); }catch(e){} };
function save(){ track(); persist(); queueSync(); }

function toggleTask(id){
  const it = D.items.find(x => x.id === id); if(!it) return false;
  const t = today();
  if(isRec(it)){
    const i = D.log.findIndex(l => l.itemId === id && l.date === t);
    if(i >= 0){ D.log.splice(i, 1); return false; }
    D.log.push({id: uid(), itemId: id, title: it.title, type: 'task', date: t, ts: Date.now()}); return true;
  }
  if(it.done){ it.done = false; it.doneAt = null; D.log = D.log.filter(l => l.itemId !== id); return false; }
  it.done = true; it.doneAt = Date.now();
  D.log.push({id: uid(), itemId: id, title: it.title, type: 'task', date: t, ts: Date.now()});
  return true;
}
function addTask(title){
  D.items.push({id: uid(), type: 'task', title, date: '', done: false, doneAt: null, createdKey: today(), createdAt: Date.now()});
  save();
}

function mergeData(rem){
  const tomb = {}, ltomb = {}, cut = Date.now() - 90 * 864e5;
  [rem.tomb || {}, D.sync.tomb].forEach(o => { for(const k in o) tomb[k] = Math.max(tomb[k] || 0, o[k]); });
  [rem.ltomb || {}, D.sync.ltomb].forEach(o => { for(const k in o) ltomb[k] = Math.max(ltomb[k] || 0, o[k]); });
  const map = {};
  [...tasks(), ...(rem.items || [])].forEach(x => { const p = map[x.id]; if(!p || (x.u || 0) > (p.u || 0)) map[x.id] = x; });
  const items = Object.values(map).filter(x => !(tomb[x.id] >= (x.u || 0)));
  const lmap = {};
  [...D.log, ...(rem.log || [])].forEach(l => { if(!lmap[l.id]) lmap[l.id] = l; });
  const log = Object.values(lmap).filter(l => !ltomb[l.id]);
  for(const k in tomb) if(tomb[k] < cut) delete tomb[k];
  for(const k in ltomb) if(ltomb[k] < cut) delete ltomb[k];
  return {items, log, tomb, ltomb};
}
const byId = (a, b) => a.id < b.id ? -1 : 1;
const norm = d => JSON.stringify([(d.items || []).slice().sort(byId), (d.log || []).slice().sort(byId), Object.entries(d.tomb || {}).sort(), Object.entries(d.ltomb || {}).sort()]);
const ready = () => !!(window.FB && FB.apiKey && FB.projectId && D.code);
const url = () => `https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents/sync/${D.code}?key=${FB.apiKey}`;

let syncing = false, sT = null, syncErr = false;
async function syncNow(){
  if(!ready() || syncing) return;
  syncing = true;
  try{
    let rem = {};
    const r = await fetch(url());
    if(r.ok){ const j = await r.json(); try{ rem = JSON.parse(j.fields.data.stringValue); }catch(e){} }
    else if(r.status !== 404) throw new Error('HTTP ' + r.status);
    track();
    const before = norm({items: tasks(), log: D.log});
    const m = mergeData(rem);
    D.items = m.items; D.log = m.log; D.sync.tomb = m.tomb; D.sync.ltomb = m.ltomb;
    snap = null; track();
    if(norm(m) !== norm(rem)){
      const w = await fetch(url(), {method: 'PATCH', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({fields: {data: {stringValue: JSON.stringify({v: 1, items: m.items, log: m.log, tomb: m.tomb, ltomb: m.ltomb})}, t: {integerValue: String(Date.now())}}})});
      if(!w.ok) throw new Error('HTTP ' + w.status);
    }
    D.sync.last = Date.now(); syncErr = false;
    persist();
    if(before !== norm(m) && window.render) render();
  }catch(e){ syncErr = true; console.warn('Synchro', e); }
  syncing = false;
  if(window.renderStatus) renderStatus();
}
function queueSync(){ clearTimeout(sT); sT = setTimeout(syncNow, 800); }
window.addEventListener('storage', e => { if(e.key === KEY){ D = load(); snap = null; track(); if(window.render) render(); } });
window.addEventListener('focus', syncNow);
setInterval(syncNow, 10000);
