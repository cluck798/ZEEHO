// preload.js — 自绘标题栏的窗口控制桥（contextIsolation 下唯一暴露面）
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("winctl", {
  minimize: () => ipcRenderer.send("win:minimize"),
  toggleMaximize: () => ipcRenderer.send("win:toggle-maximize"),
  close: () => ipcRenderer.send("win:close"),
  onState: (cb) => ipcRenderer.on("win:state", (_e, s) => cb(s))
});
