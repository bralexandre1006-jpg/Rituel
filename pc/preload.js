const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('rw', {
  min: () => ipcRenderer.send('min'),
  close: () => ipcRenderer.send('close'),
  collapse: on => ipcRenderer.send('collapse', on),
  onPair: cb => ipcRenderer.on('pair', cb)
});
