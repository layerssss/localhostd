const Fs = require("fs");
const { promisify } = require("util");
const { autoUpdater } = require("electron-updater");

const Server = require("./server.js");
const getShellEnv = require("./get_shell_env.js");

const writeFileAsync = promisify(Fs.writeFile);

const { BrowserWindow, ipcMain, screen, app, dialog } = require("electron");

const Path = require("path");

class App {
  constructor(options) {
    this._options = options;
  }

  _triggerAsync(func) {
    Promise.resolve()
      .then(() => func())
      .catch(error =>
        dialog.showMessageBox(null, {
          type: "error",
          title: "Error",
          message: error.message
        })
      );
  }

  async listen() {
    const env = await getShellEnv();

    this._server = new Server({
      stateFile: Path.join(env["HOME"] || env["HOMEPATH"], ".localhostd.json")
    });

    await this._server.listen({
      bind: "localhost",
      port: this._options.port
    });

    ipcMain.on("renderer-open", (evt, name, base64) =>
      dialog.showSaveDialog(
        {
          title: `Save ${name}`,
          defaultPath: Path.join(
            env["HOME"] || env["HOMEPATH"],
            "Downloads",
            name
          )
        },
        path => {
          if (!path) return;
          this._triggerAsync(async () => {
            await writeFileAsync(path, Buffer.from(base64, "base64"));
            if (process.platform === "darwin") app.dock.downloadFinished(path);
          });
        }
      )
    );

    ipcMain.on("renderer-connect", (connectEvt, socketId) => {
      const socketHandlers = {};
      const socket = {
        on: (evt, handler) => {
          if (!socketHandlers[evt]) socketHandlers[evt] = [];
          socketHandlers[evt].push(handler);
        },
        trigger: (evt, ...data) => {
          if (!socketHandlers[evt]) return;
          for (const handler of socketHandlers[evt]) handler(...data);
        },
        send: message => connectEvt.sender.send("main-message", message)
      };

      const socketOnMessage = (evt, message) => {
        socket.trigger("message", message);
      };

      ipcMain.addListener(`renderer-message-${socketId}`, socketOnMessage);

      ipcMain.once(`renderer-close-${socketId}`, () => {
        socket.trigger("close");
        ipcMain.removeListener(`renderer-message-${socketId}`, socketOnMessage);
      });

      this._server.handleWebsocket(socket);
    });

    autoUpdater.checkForUpdatesAndNotify();
  }

  showWindow() {
    if (process.platform === "darwin") app.dock.show();
    if (this._window) return this._window.focus();

    const screenSize = screen.getPrimaryDisplay().workAreaSize;
    const window = (this._window = new BrowserWindow({
      skipTaskbar: true,
      width: screenSize.width,
      height: screenSize.height
    }));

    window.loadURL(Path.join("file://", __dirname, "../ui_build/index.html"));

    window.on("close", () => {
      if (process.platform === "darwin") app.dock.hide();
      this._window = null;
    });
  }
}

module.exports = App;
