import isElectorn from "is-electron";

let ShimWebSocket;
if (isElectorn()) {
  const electronAPI = window.electronAPI;
  ShimWebSocket = class {
    constructor(_url) {
      this.id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      electronAPI.on(`main-message-${this.id}`, message => {
        this.onmessage({
          data: message
        });
      });

      electronAPI.send("renderer-connect", this.id);
      window.addEventListener("unload", () => this.close());
      window._mainSocket = this;
    }
    send(message) {
      electronAPI.send(`renderer-message-${this.id}`, message);
    }
    close() {
      electronAPI.send(`renderer-close-${this.id}`);
    }
  };
} else ShimWebSocket = WebSocket;

export default ShimWebSocket;
