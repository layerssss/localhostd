var Server = require('./server.js');
var Utility = require('./utility.js');
var ShellEnv = require('shell-env');

var {
  BrowserWindow,
  ipcMain,
  screen,
  app,
  dialog
} = require('electron');

var Path = require('path');

class App {
  constructor(options) {
    this._options = options;
  }

  listen() {
    var shellEnv;
    return Promise.resolve()
      .then(() => ShellEnv())
      .then(env => shellEnv = env)
      .then(env => this._server = new Server({
        stateFile: Path.join(shellEnv['HOME'] || shellEnv['HOMEPATH'], '.bnb.json'),
        env: shellEnv
      }))
      .then(() => this._server.listen({
        bind: 'localhost',
        port: this._options.port
      }))
      .then(() => {
        ipcMain.on('renderer-open', (evt, name, base64) => {
          dialog.showSaveDialog({
            title: `Save ${name}`,
            defaultPath: Path.join(
              shellEnv['HOME'] || shellEnv['HOMEPATH'],
              'Downloads',
              name
            )
          }, path => {
            if (!path) return;
            Utility
              .writeFile(path, Buffer.from(base64, 'base64'))
              .then(() => (process.platform == 'darwin') && app.dock.downloadFinished(path));
          });
        });

        ipcMain.on('renderer-connect', (connectEvt, socketId) => {
          var socketHandlers = {};
          var socket = {
            on: (evt, handler) => {
              if (!socketHandlers[evt]) socketHandlers[evt] = [];
              socketHandlers[evt].push(handler);
            },
            trigger: (evt, ...data) => {
              if (!socketHandlers[evt]) return;
              for (var handler of socketHandlers[evt]) handler(...data);
            },
            send: (message) => connectEvt.sender.send('main-message', message)
          };

          var socketOnMessage = (evt, message) => {
            socket.trigger('message', message);
          };

          ipcMain.addListener(`renderer-message-${socketId}`, socketOnMessage);

          ipcMain.once(`renderer-close-${socketId}`, (evt) => {
            socket.trigger('close');
            ipcMain.removeListener(`renderer-message-${socketId}`, socketOnMessage);
          });

          this._server.handleWebsocket(socket);
        });
      });
  }

  showWindow() {
    if (process.platform == 'darwin') app.dock.show();
    if (this._window) return this._window.focus();

    var screenSize = screen.getPrimaryDisplay().workAreaSize;
    var window = this._window = new BrowserWindow({
      skipTaskbar: true,
      width: screenSize.width,
      height: screenSize.height
    });

    window.loadURL(Path.join(
      'file://',
      __dirname,
      '../static/index.html'
    ));

    window.on('close', evt => {
      if (process.platform == 'darwin') app.dock.hide();
      this._window = null;
    });


  }
}

module.exports = App;
