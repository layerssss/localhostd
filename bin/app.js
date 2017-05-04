var electron = require('electron');
var Path = require('path');
var Utility = require('../lib/utility.js');

var appListening = false;
var app, tray;
var appListen = () => {
  return Utility.lockPromise('appListen', () =>
      Promise.resolve()
      .then(() => {
        if (appListening) return;
        return app.listen()
          .then(() => appListening = true)
      })
    )
    .then(() => tray.setToolTip('Motel is running...'))
    .catch(error => {
      tray.setToolTip(`Motel is stopped: ${error.message}`);
      return Promise.reject(error);
    });
};

if (process.platform == 'darwin') electron.app.dock.hide();

electron.app.on('ready', () => {
  var App = require('../lib/app.js');
  app = new App({
    port: 2999
  });

  tray = new electron.Tray(
    Path.join(__dirname, '../static/tray.png')
  );

  tray.setContextMenu(electron.Menu.buildFromTemplate([{
    label: 'Open',
    click: () => {
      appListen()
        .then(() => app.showWindow())
        .catch(error => {
          console.error(error.stack);
        });
    },
  }, {
    label: 'Quit',
    click: () => {
      electron.app.exit();
    }
  }]));


  appListen()
    .catch(error => {
      console.error(error.stack);
    });
});

electron.app.on('window-all-closed', () => {});

electron.app.on('activate', () => {
  appListen()
    .then(() => app.showWindow())
    .catch(error => {
      console.error(error.stack);
    });
});
