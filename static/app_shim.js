if (typeof require != 'undefined') {
  var {
    ipcRenderer,
    shell
  } = require('electron');
  var Path = require('path');

  window.WebSocket = class {
    constructor(url) {
      this.id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      ipcRenderer.on('main-message', (evt, message) => {
        this.onmessage({
          data: message
        });
      });

      ipcRenderer.send('renderer-connect', this.id);
      window.addEventListener('unload', () => ipcRenderer.send(`renderer-close-${this.id}`));
      window._mainSocket = this;
    }
    send(message) {
      ipcRenderer.send(`renderer-message-${this.id}`, message);
    }
  };

  OpenBlob = (name, blob) => {
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.addEventListener('load', () => {
      ipcRenderer.send('renderer-open', name, reader.result.replace(/^.*base64\,/, ''));
    });
  };

  OpenUrl = url => {
    shell.openExternal(url);
  };
}
