const {app, BrowserWindow, Tray, Menu, ipcMain, nativeImage} = require('electron');
const path = require('path');
const fs = require('fs');

if(!app.requestSingleInstanceLock()) app.quit();

const TYPES = {
  list: {label: 'Liste complète', w: 380, h: 560},
  count: {label: 'Compteur du jour', w: 300, h: 140},
  short: {label: 'Liste courte', w: 300, h: 260}
};
const BAR = 40;
const wins = {};
let cfg = {}, tray = null;

const cfgFile = () => path.join(app.getPath('userData'), 'widgets.json');
function loadCfg(){
  try{ cfg = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); }catch(e){ cfg = {}; }
  cfg.top = !!cfg.top;
  cfg.w = cfg.w || {};
  let x = 60;
  for(const t in TYPES){
    cfg.w[t] = Object.assign({show: t !== 'short', x, y: 60, w: TYPES[t].w, h: TYPES[t].h, collapsed: false}, cfg.w[t]);
    x += TYPES[t].w + 30;
  }
}
function saveCfg(){ try{ fs.writeFileSync(cfgFile(), JSON.stringify(cfg)); }catch(e){} }
const typeOf = w => Object.keys(wins).find(t => wins[t] === w);

function open(t){
  cfg.w[t].show = true; saveCfg();
  if(wins[t]){ wins[t].show(); return; }
  const c = cfg.w[t];
  const w = new BrowserWindow({
    x: c.x, y: c.y, width: c.w, height: c.collapsed ? BAR : c.h, minWidth: 220, minHeight: BAR,
    frame: false, transparent: true, resizable: true, skipTaskbar: true, hasShadow: false,
    alwaysOnTop: cfg.top, show: false, title: 'Rituel', icon: path.join(__dirname, 'icon.png'),
    webPreferences: {preload: path.join(__dirname, 'preload.js')}
  });
  w.loadFile('widget.html', {query: {type: t}});
  w.once('ready-to-show', () => w.showInactive());
  const keep = () => {
    if(w.isDestroyed()) return;
    const b = w.getBounds();
    Object.assign(c, {x: b.x, y: b.y, w: b.width});
    if(!c.collapsed) c.h = b.height;
    saveCfg();
  };
  w.on('moved', keep);
  w.on('resized', keep);
  w.on('closed', () => { delete wins[t]; });
  wins[t] = w;
}
function hide(t){
  cfg.w[t].show = false; saveCfg();
  if(wins[t]) wins[t].close();
  buildMenu();
}
function showAll(){
  let any = false;
  for(const t in TYPES) if(cfg.w[t].show){ open(t); wins[t].restore(); any = true; }
  if(!any) open('list');
}

ipcMain.on('min', e => { const w = BrowserWindow.fromWebContents(e.sender); if(w) w.minimize(); });
ipcMain.on('close', e => { const t = typeOf(BrowserWindow.fromWebContents(e.sender)); if(t) hide(t); });
ipcMain.on('collapse', (e, on) => {
  const w = BrowserWindow.fromWebContents(e.sender), t = typeOf(w); if(!t) return;
  const c = cfg.w[t]; c.collapsed = !!on; saveCfg();
  const b = w.getBounds();
  w.setBounds({x: b.x, y: b.y, width: b.width, height: on ? BAR : c.h});
});

function buildMenu(){
  const items = Object.keys(TYPES).map(t => ({
    label: TYPES[t].label, type: 'checkbox', checked: !!(cfg.w[t] && cfg.w[t].show),
    click: m => m.checked ? open(t) : hide(t)
  }));
  tray.setContextMenu(Menu.buildFromTemplate([
    ...items,
    {type: 'separator'},
    {label: 'Toujours au premier plan', type: 'checkbox', checked: cfg.top, click: m => {
      cfg.top = m.checked; saveCfg();
      for(const t in wins) wins[t].setAlwaysOnTop(cfg.top);
    }},
    {label: 'Lancer au démarrage de Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: m => app.setLoginItemSettings({openAtLogin: m.checked})},
    {label: 'Code de jumelage…', click: () => { open('list'); setTimeout(() => wins.list && wins.list.webContents.send('pair'), 400); }},
    {type: 'separator'},
    {label: 'Quitter Rituel', click: () => app.exit(0)}
  ]));
}

app.on('second-instance', showAll);
app.on('window-all-closed', () => {});
app.whenReady().then(() => {
  loadCfg();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({width: 16, height: 16}));
  tray.setToolTip('Rituel');
  tray.on('click', showAll);
  buildMenu();
  showAll();
});
