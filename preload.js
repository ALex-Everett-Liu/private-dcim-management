const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    openFile: (filepath) => ipcRenderer.invoke('open-file', filepath),
    log: (message) => ipcRenderer.send('log', message)
  }
); 