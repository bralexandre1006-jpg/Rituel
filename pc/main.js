const {app, BrowserWindow, Tray, Menu, ipcMain, nativeImage} = require('electron');
const path = require('path');
const fs = require('fs');

if(!app.requestSingleInstanceLock()) app.quit();

const TYPES = {
  list: {label: "Widget Aujourd'hui", w: 320, h: 440}
};
const BAR = 40;
const wins = {};
let cfg = {}, tray = null, main = null, quitting = false;
const ICON = path.join(__dirname, 'icon.ico');

const cfgFile = () => path.join(app.getPath('userData'), 'widgets.json');
function loadCfg(){
  let first = false;
  try{ cfg = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); }catch(e){ cfg = {}; first = true; }
  if(!cfg.v2){ cfg.v2 = true; cfg.w = {}; first = true; }
  cfg.top = !!cfg.top;
  cfg.w = cfg.w || {};
  let x = 60;
  for(const t in TYPES){
    cfg.w[t] = Object.assign({show: false, x, y: 60, w: TYPES[t].w, h: TYPES[t].h, collapsed: false}, cfg.w[t]);
    x += TYPES[t].w + 30;
  }
  if(first){
    cfg.w.list.show = true;
    app.setLoginItemSettings({openAtLogin: true, args: ['--hidden']});
    saveCfg();
  }
}
function saveCfg(){ try{ fs.writeFileSync(cfgFile(), JSON.stringify(cfg)); }catch(e){} }
const typeOf = w => Object.keys(wins).find(t => wins[t] === w);

function open(t){
  cfg.w[t].show = true; saveCfg();
  if(wins[t]){ wins[t].show(); return; }
  const c = cfg.w[t];
  const w = new BrowserWindow({
    x: c.x, y: c.y, width: c.w, height: c.h, minWidth: 220, minHeight: 120,
    frame: false, transparent: true, resizable: true, skipTaskbar: true, hasShadow: false,
    alwaysOnTop: cfg.top, show: false, title: 'Rituel', icon: ICON,
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
  w.on('closed', () => { delete wins[t]; notify(); });
  wins[t] = w;
  notify();
}
function hide(t){
  cfg.w[t].show = false; saveCfg();
  if(wins[t]) wins[t].close();
  buildMenu();
}
function notify(){ if(main && !main.isDestroyed()) main.webContents.send('widgets'); if(tray) buildMenu(); }
function showWidgets(){ for(const t in TYPES) if(cfg.w[t].show){ open(t); wins[t].restore(); } }
function openMain(){
  if(main){ if(main.isMinimized()) main.restore(); main.show(); main.focus(); return; }
  main = new BrowserWindow({width: 1100, height: 700, minWidth: 780, minHeight: 480, frame: false, backgroundColor: '#0B0C10',
    show: false, title: 'Rituel', icon: ICON, webPreferences: {preload: path.join(__dirname, 'preload.js')}});
  main.loadFile('app.html');
  main.once('ready-to-show', () => main.show());
  main.on('close', e => { if(!quitting){ e.preventDefault(); main.hide(); } });
  main.on('closed', () => { main = null; });
}

ipcMain.on('min', e => { const w = BrowserWindow.fromWebContents(e.sender); if(w) w.minimize(); });
ipcMain.on('close', e => { const t = typeOf(BrowserWindow.fromWebContents(e.sender)); if(t) hide(t); });
ipcMain.on('win', (e, a) => {
  const w = BrowserWindow.fromWebContents(e.sender); if(!w) return;
  if(a === 'min') w.minimize();
  else if(a === 'max') w.isMaximized() ? w.unmaximize() : w.maximize();
  else w.close();
});
ipcMain.handle('state', () => ({widgets: Object.fromEntries(Object.keys(TYPES).map(t => [t, !!cfg.w[t].show])), top: cfg.top, login: app.getLoginItemSettings().openAtLogin}));
ipcMain.on('widget', (e, t, on) => { if(!TYPES[t]) return; on ? open(t) : hide(t); });
ipcMain.on('top', (e, on) => { cfg.top = !!on; saveCfg(); for(const t in wins) wins[t].setAlwaysOnTop(cfg.top); buildMenu(); });
ipcMain.on('login', (e, on) => { app.setLoginItemSettings({openAtLogin: !!on, args: ['--hidden']}); buildMenu(); });
ipcMain.on('mouse', (e, ignore) => { const w = BrowserWindow.fromWebContents(e.sender); if(w && !w.isDestroyed()) w.setIgnoreMouseEvents(!!ignore, {forward: true}); });
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
    {label: 'Ouvrir Rituel', click: openMain},
    {type: 'separator'},
    ...items,
    {type: 'separator'},
    {label: 'Toujours au premier plan', type: 'checkbox', checked: cfg.top, click: m => {
      cfg.top = m.checked; saveCfg();
      for(const t in wins) wins[t].setAlwaysOnTop(cfg.top);
    }},
    {label: 'Lancer au démarrage de Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: m => app.setLoginItemSettings({openAtLogin: m.checked, args: ['--hidden']})},
    {type: 'separator'},
    {label: 'Quitter Rituel', click: () => { quitting = true; app.quit(); }}
  ]));
}

app.on('second-instance', () => { openMain(); showWidgets(); });
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {});
app.whenReady().then(() => {
  loadCfg();
  app.setAppUserModelId('be.brun.rituel.pc');
  tray = new Tray(ICON);
  tray.setToolTip('Rituel');
  tray.on('click', openMain);
  buildMenu();
  showWidgets();
  if(!process.argv.includes('--hidden')) openMain();
});
