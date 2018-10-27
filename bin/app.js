const electron = require("electron");
const Path = require("path");

const waitDeath = require("../lib/wait_death.js");

electron.app.on("ready", () =>
  Promise.resolve()
    .then(async () => {
      const App = require("../lib/app.js");
      const app = new App({
        port: 2999
      });
      const tray = new electron.Tray(Path.join(__dirname, "../lib/tray.png"));
      await app.listen();
      tray.setToolTip("LocalhostD is running...");
      tray.on("double-click", () => app.showWindow());

      tray.setContextMenu(
        electron.Menu.buildFromTemplate([
          {
            label: "Open",
            click: () => {
              app.showWindow();
            }
          },
          {
            label: "Quit",
            click: () => {
              electron.app.exit();
            }
          }
        ])
      );

      if (process.platform === "darwin") electron.app.dock.hide();

      electron.app.on("activate", () => {
        app.showWindow();
      });

      electron.app.on("window-all-closed", () => {});

      const signal = await waitDeath();

      // eslint-disable-next-line no-console
      console.log(`received ${signal}`);
      electron.app.exit();
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.error(error.stack);
      electron.dialog.showMessageBox(
        null,
        {
          type: "error",
          title: "Fatel error",
          message: `LocalhostD has encountered an error: \n${error.message}`
        },
        () => {
          process.exit(1);
        }
      );
    })
);
