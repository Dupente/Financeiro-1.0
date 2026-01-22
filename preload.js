
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readDB: () => ipcRenderer.invoke('db-read'),
  writeDB: (data) => ipcRenderer.invoke('db-write', data)
});
