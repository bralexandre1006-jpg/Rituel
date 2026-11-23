const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('rw', {
  min: () => ipcRenderer.send('min'),
  close: () => ipcRenderer.send('close'),
  collapse: on => ipcRenderer.send('collapse', on),
  onPair: cb => ipcRenderer.on('pair', cb),
  win: a => ipcRenderer.send('win', a),
  state: () => ipcRenderer.invoke('state'),
  widget: (t, on) => ipcRenderer.send('widget', t, on),
  top: on => ipcRenderer.send('top', on),
  login: on => ipcRenderer.send('login', on),
  onWidgets: cb => ipcRenderer.on('widgets', cb)
});
