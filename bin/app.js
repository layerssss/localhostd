var electron = require('electron');
var Path = require('path');
var Utility = require('../lib/utility.js');

var app, tray, App;


var handleFatelError = error => {
  console.error(error);
  electron.dialog.showMessageBox(null, {
      type: 'error',
      title: 'Fatel error',
      message: error.message
    }, ()=> {
    process.exit(1);
  });
};

electron.app.on('ready', () => {
  Promise.resolve()
    .then(() => {
      App = require('../lib/app.js');
      app = new App({
        port: 2999
      });
      tray = new electron.Tray(
        Path.join(__dirname, '../static/tray.png')
      );
    })
    .then(() => app.listen())
    .then(() => tray.setToolTip('Bnb is running...'))
    .then(() => {
      tray.on('double-click', () => Promise.resolve()
        .then(() => app.showWindow())
        .catch(handleFatelError)
      );

      tray.setContextMenu(electron.Menu.buildFromTemplate([{
        label: 'Open',
        click: () => {
          Promise.resolve()
            .then(() => app.showWindow())
            .catch(handleFatelError);
        },
      }, {
        label: 'Quit',
        click: () => {
          electron.app.exit();
        }
      }]));
    })
    .then(()=> {
      if (process.platform == 'darwin') electron.app.dock.hide();

      electron.app.on('activate', () => {
        Promise.resolve()
          .then(() => app.showWindow())
          .catch(handleFatelError);
      });

      electron.app.on('window-all-closed', () => {});
    })
    .catch(handleFatelError);
});
