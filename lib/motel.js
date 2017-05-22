var _ = require('lodash');
var Pty = require('node-pty');
var Fs = require('fs');
var Path = require('path');
var Utility = require('./utility.js');
var ShellQuote = require('shell-quote');
var StripAnsi = require('strip-ansi');

class Motel {
  constructor({
    state,
    env,
    onStateChange
  }) {
    this._env = env;
    this._state = state;
    this._sessions = [];
    this._onStateChange = onStateChange;
    this._applicationLocks = {};
    this._terminals = {};

    if (!this._state.applications) {
      this._state.applications = [];
      this._onStateChange();
      this._broadcastStates();
    }
  }

  _lockApplication(application, callback) {
    var callbackError;
    return Promise.resolve()
      .then(() => Utility.whilePromise(() => this._applicationLocks[application.name]))
      .then(() => this._applicationLocks[application.name] = true)
      .then(() => this._broadcastStates())
      .then(() => Promise.resolve()
        .then(() => callback())
        .catch(error => callbackError = error)
      )
      .then(() => this._applicationLocks[application.name] = false)
      .then(() => this._broadcastStates())
      .then(() => callbackError && Promise.reject(callbackError));
  }

  getApplicationPort(hostname) {
    var application = _.find(this._state.applications, a =>
      hostname == `${a.name}.dev` ||
      _.endsWith(hostname, `.${a.name}.dev`)
    );
    return Promise.resolve()
      .then(() =>
        application && this._ensureApplicationUp(application)
        .then(() => application.port)
      );
  }

  _doActionResizeTerminal(parameters, session) {
    session.terminalCols = parameters.cols;
    session.terminalRows = parameters.rows;

    var terminal = this._terminals[parameters.applicationName];

    if (!terminal) return;
    terminal.pty.resize(
      _.min(this._sessions.map(s => s.terminalCols)),
      _.min(this._sessions.map(s => s.terminalRows))
    );
  }

  _doActionInputTerminal(parameters) {
    var terminal = this._terminals[parameters.applicationName];

    if (!terminal) return;
    terminal.pty.write(parameters.dataString);
  }

  _doActionStartApplication(parameters) {
    var application = _.find(this._state.applications, a => a.name == parameters.applicationName);
    if (!application) return;

    return Promise.resolve()
      .then(() => this._ensureApplicationUp(application))
      .catch(error => this._broadcastMessage('danger', error.message));
  }

  _doActionStopApplication(parameters) {
    var application = _.find(this._state.applications, a => a.name == parameters.applicationName);
    if (!application) return;

    return Promise.resolve()
      .then(() => this._ensureApplicationDown(application))
      .then(error => this._broadcastMessage('success', 'Application stopped.'))
      .catch(error => this._broadcastMessage('danger', error.message));
  }

  _doActionRestartApplication(parameters) {
    var application = _.find(this._state.applications, a => a.name == parameters.applicationName);
    if (!application) return;

    return Promise.resolve()
      .then(() => this._ensureApplicationDown(application))
      .then(() => this._ensureApplicationUp(application))
      .then(error => this._broadcastMessage('success', 'Application restarted.'))
      .catch(error => this._broadcastMessage('danger', error.message));
  }

  _doActionCreateApplication(parameters, session) {
    var application = _.find(this._state.applications, a => a.name == parameters.application.name);

    return Promise.resolve()
      .then(() => application && this._ensureApplicationDown(application))
      .then(() => !application && this._state.applications.push(application = {}))
      .then(() => _.assign(application, parameters.application))
      .then(() => this._onStateChange())
      .then(() => this._broadcastStates())
      .then(() => session.setState({
        activeApplicationIndex: this._state.applications.indexOf(application)
      }))
      .then(error => this._broadcastMessage('success', 'Application saved.'))
      .catch(error => this._broadcastMessage('danger', error.message));
  }

  _doActionDeleteApplication(parameters) {
    var application = _.find(this._state.applications, a => a.name == parameters.applicationName);
    if (!application) return;
    return this._ensureApplicationDown(application)
      .then(() => _.pull(this._state.applications, application))
      .then(() => this._onStateChange())
      .then(() => this._broadcastStates())
      .then(error => this._broadcastMessage('success', 'Application deleted.'))
      .catch(error => this._broadcastMessage('danger', error.message));
  }

  _ensureApplicationUp(application) {
    return this._lockApplication(application, () => {
      var terminal = this._terminals[application.name];
      if (terminal) return;
      var env = _.defaults({}, application.env, {
        'PORT': application.port
      });
      var xs = ShellQuote.parse(application.command, env);
      terminal = this._terminals[application.name] = {
        pty: Pty.spawn(xs[0], xs.slice(1), {
          name: 'xterm-color',
          cols: _.min([80, ...this._sessions.map(s => s.terminalCols)]),
          rows: _.min([24, ...this._sessions.map(s => s.terminalRows)]),
          cwd: application.dir,
          env: env
        }),
        history: ''
      };

      if (application.out) {
        var outPath = Path.join(application.dir, application.out);
        Utility.mkdirp(Path.dirname(outPath))
          .then(Utility.openFile(
            outPath,
            'a'
          ))
          .then(file => terminal.outFd = file)
          .catch(error => console.error(error.stack));
      }

      terminal.pty.on('data', data => {
        terminal.history += data;
        if (terminal.history.length > 80000) {
          terminal.history = terminal.history.substring(
            terminal.history.length - 80000
          );
        }

        if (terminal.outFd) Fs.writeSync(terminal.outFd, Buffer(StripAnsi(data)));
        for (var session of this._sessions) {
          session.socket.send(JSON.stringify({
            terminalOutput: {
              applicationName: application.name,
              dataString: data
            }
          }));
        }
      });

      terminal.pty.on('exit', code => {
        if (terminal.outFd) Fs.closeSync(terminal.outFd);
        delete this._terminals[application.name];
        this._broadcastStates();
      });

      this._broadcastStates();

      var startTime = Date.now();
      return Utility.whilePromise(() => {
          var terminal = this._terminals[application.name];
          if (!terminal) return;
          if (Date.now() - startTime > 5000) return;

          return Utility.checkPortListening(application.port)
            .then(listening => !listening);
        })
        .then(() => Utility.delay(500));
    });
  }

  _ensureApplicationDown(application) {
    return this._lockApplication(application, () => {
      var applicationDown = false;
      var terminal = this._terminals[application.name];
      if (terminal) {
        terminal.pty.kill('SIGINT');
        Utility.delay(10000)
          .then(() => {
            if (applicationDown) return;
            terminal.pty.kill('SIGKILL');
          })
          .catch(error => console.error(error.stack));
      }
      return Utility.whilePromise(() => this._terminals[application.name])
        .then(() => applicationDown = true);
    });
  }

  ensureDown() {
    return Promise.all(this._state.applications.map(application =>
      this._ensureApplicationDown(application)
    ));
  }

  _broadcastStates() {
    for (var session of this._sessions) {
      session.socket.send(JSON.stringify({
        state: {
          env: this._env,
          applications: this._state.applications.map(application =>
            _.merge({}, application, {
              locked: !!this._applicationLocks[application.name],
              running: !!this._terminals[application.name]
            })
          )
        }
      }));
    }
  }

  _broadcastMessage(type, message) {
    for (var session of this._sessions) {
      session.socket.send(JSON.stringify({
        message: {
          type,
          message
        }
      }));
    }
  }

  handleWebsocket(socket) {
    var session = {
      socket,
      setState: (state) => {
        socket.send(JSON.stringify({
          state
        }));
      }
    };

    this._sessions.push(session);
    this._broadcastStates();

    session.setState({
      caCertificate: this._state.caCertificate
    });

    for (var applicationName in this._terminals) {
      var terminal = this._terminals[applicationName];

      socket.send(JSON.stringify({
        terminalOutput: {
          applicationName,
          dataString: terminal.history
        }
      }));
    }

    socket.on('message', (data) => {
      if (session.onMessage) return session.onMessage(data);
      var action = JSON.parse(data);
      var actionFuncion = this['_doAction' + action.name];
      if (!actionFuncion) return this._broadcastMessage('danger', action.name + ' doesn\'t exist.');
      Promise.resolve()
        .then(() => actionFuncion.call(this, action.parameters, session))
        .catch(error => this._broadcastMessage('danger', error.message));
    });

    socket.on('close', () => {
      _.pull(this._sessions, session);
      this._broadcastStates();
    });

  }
}

module.exports = Motel;
