const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, handler) =>
    ipcRenderer.on(channel, (_evt, ...args) => handler(...args)),
  openExternal: url => ipcRenderer.send("shell-open-external", url)
});
