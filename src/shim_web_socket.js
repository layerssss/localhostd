import isElectorn from "is-electron";

let ShimWebSocket;
if (isElectorn()) {
  const { ipcRenderer } = window.require("electron");
  ShimWebSocket = class {
    constructor(url) {
      this.id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      ipcRenderer.on("main-message", (evt, message) => {
        this.onmessage({
          data: message
        });
      });

      ipcRenderer.send("renderer-connect", this.id);
      window.addEventListener("unload", () => this.close());
      window._mainSocket = this;
    }
    send(message) {
      ipcRenderer.send(`renderer-message-${this.id}`, message);
    }
    close() {
      ipcRenderer.send(`renderer-close-${this.id}`);
    }
  };
} else ShimWebSocket = WebSocket;

export default ShimWebSocket;
