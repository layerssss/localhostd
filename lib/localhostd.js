const _ = require("lodash");
const assert = require("assert");
const Pty = require("node-pty");
const Os = require("os");
const Fs = require("fs");
const Path = require("path");
const mkdirp = require("mkdirp");
const { promisify } = require("util");
const ShellQuote = require("shell-quote");
const which = require("which");

const getShellEnv = require("./get_shell_env.js");
const checkPortListening = require("./check_port_listening");

const whichAsync = promisify(which);
const statAsync = promisify(Fs.stat);
const mkdirpAsync = promisify(mkdirp);
const openAsync = promisify(Fs.open);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class LocalhostD {
  constructor({ state, onStateChange, server, debug }) {
    this._state = state;
    this._server = server;
    this._debug = debug;

    this._sessions = [];
    this._onStateChange = onStateChange;
    this._applicationLocks = {};
    this._applicationTimers = {};
    this._terminals = {};
    this._homedir = "";

    if (!this._state.applications) {
      this._state.applications = [];
      this._triggerAsync(async () => {
        await this._onStateChange();
        this._broadcastStates();
      });
    }

    this._triggerAsync(async () => {
      this._env = await getShellEnv();
      this._homedir =
        this._env["HOME"] || this._env["HOMEPATH"] || process.cwd();
      this._broadcastStates();
    });
  }

  isApplicationUp(hostname) {
    const application = this.findApplication(hostname);

    if (!application) return false;
    if (this._applicationLocks[application.name]) return false;
    return !!this._terminals[application.name];
  }

  pingApplication(hostname) {
    const application = this.findApplication(hostname);
    if (!application) return;
    this._pingApplication(application);
  }

  findApplication(hostname) {
    const application = this._state.applications.find(
      a =>
        hostname === this._getApplicationHostname(a) ||
        _.endsWith(hostname, `.${this._getApplicationHostname(a)}`)
    );

    if (!application) return null;

    this._triggerAsync(async () => {
      if (this._terminals[application.name]) return;
      if (this._applicationLocks[application.name]) return;
      await this._ensureApplicationUp(application);
    });

    return application;
  }

  _getApplicationHostname(application) {
    return application.hostname || `${application.name}.test`;
  }

  _triggerAsync(func) {
    Promise.resolve()
      .then(() => func())
      .catch(error => {
        this._debug("error", error.stack);
        for (const session of this._sessions) {
          session.socket.send(
            JSON.stringify({
              error: {
                message: error.message
              }
            }),
            error => {
              if (error) this._debug("error", error.stack);
            }
          );
        }
      });
  }

  async _lockApplication(application, callback) {
    let callbackError;
    while (this._applicationLocks[application.name]) await sleep(100);

    this._applicationLocks[application.name] = true;
    this._broadcastStates();

    try {
      await callback();
    } catch (error) {
      callbackError = error;
    }

    this._applicationLocks[application.name] = false;
    this._broadcastStates();

    if (callbackError) throw callbackError;
  }

  async _doActionResizeTerminal(parameters, session) {
    session.terminalCols = parameters.cols;
    session.terminalRows = parameters.rows;

    const terminal = this._terminals[parameters.applicationName];

    if (!terminal) return;
    terminal.pty.resize(
      _.min(this._sessions.map(s => s.terminalCols)),
      _.min(this._sessions.map(s => s.terminalRows))
    );
  }

  async _doActionInputTerminal({ applicationName, dataString }) {
    assert(applicationName);
    assert(dataString);

    const terminal = this._terminals[applicationName];

    if (!terminal) return;
    terminal.pty.write(dataString);
  }

  async _doActionStartApplication({ applicationName }) {
    assert(applicationName);

    const application = _.find(
      this._state.applications,
      a => a.name === applicationName
    );
    if (!application) return;

    await this._ensureApplicationUp(application);
  }

  async _doActionStopApplication({ applicationName }) {
    assert(applicationName);

    const application = _.find(
      this._state.applications,
      a => a.name === applicationName
    );
    if (!application) return;

    await this._ensureApplicationDown(application);
    this._broadcastMessage("Application stopped.");
  }

  async _doActionRestartApplication({ applicationName }) {
    assert(applicationName);

    const application = _.find(
      this._state.applications,
      a => a.name === applicationName
    );
    if (!application) return;

    await this._ensureApplicationDown(application);
    await this._ensureApplicationUp(application);
    this._broadcastMessage("Application restarted.");
  }

  async _doActionCreateApplication({ applicationData }, session) {
    const application =
      this._state.applications.find(a => a.name === applicationData.name) || {};

    if (!this._state.applications.includes(application))
      this._state.applications.push(application);

    await this._ensureApplicationDown(application);

    Object.assign(application, applicationData);

    await this._onStateChange();
    this._broadcastStates();

    session.setState({
      activeApplicationIndex: this._state.applications.indexOf(application)
    });

    this._broadcastMessage("Application saved.");
  }

  async _doActionDeleteApplication({ applicationName }) {
    const application = this._state.applications.find(
      a => a.name === applicationName
    );
    if (!application) return;

    await this._ensureApplicationDown(application);
    _.pull(this._state.applications, application);

    await this._onStateChange();
    this._broadcastStates();
    this._broadcastMessage("Application deleted.");
  }

  async _pingApplication(application) {
    if (application.timeout) {
      if (this._applicationTimers[application.name])
        clearTimeout(this._applicationTimers[application.name]);

      this._applicationTimers[application.name] = setTimeout(() => {
        delete this._applicationTimers[application.name];
        this._ensureApplicationDown(application);
      }, application.timeout * 1000);
    }
  }

  async _ensureApplicationUp(application) {
    await this._lockApplication(application, async () => {
      this._pingApplication(application);
      let terminal = this._terminals[application.name];
      if (terminal) return;

      const dirEnv = await getShellEnv({
        cwd: application.dir
      });

      const env = {
        ...dirEnv,
        ...application.env,
        PORT: application.port
      };

      const xs = ShellQuote.parse(application.command, env);
      const executable = xs[0];
      const args = xs.slice(1);
      let spawnCmd = executable;
      let spawnArgs = args;
      const envPath = _.compact([env["PATH"], env["Path"]]).join(
        Path.delimiter
      );

      if (Os.platform() === "win32") {
        spawnCmd = env["COMSPEC"];
        spawnArgs = ["/C", ...xs];
      }

      try {
        const listening = await checkPortListening(application.port);
        if (listening)
          throw new Error(
            `Another process is listening to the port ${application.port}`
          );

        const stat = await statAsync(application.dir);
        if (!stat.isDirectory())
          throw new Error(`${application.dir} is not a directory`);

        if (!executable.match(/\//))
          try {
            await whichAsync(executable, {
              path: envPath,
              pathExt: env["PathExt"]
            });
          } catch (error) {
            throw new Error(
              `${
                error.message
              }: Cannot find executable ${executable} in PATH (${envPath})`
            );
          }

        terminal = this._terminals[application.name] = {
          pty: Pty.spawn(spawnCmd, spawnArgs, {
            name: "xterm-color",
            cols: _.min(this._sessions.map(s => s.terminalCols)) || 80,
            rows: _.min(this._sessions.map(s => s.terminalRows)) || 24,
            cwd: application.dir,
            env: env
          }),
          history: ""
        };

        if (application.out) {
          const outPath = Path.join(application.dir, application.out);
          await mkdirpAsync(Path.dirname(outPath));
          terminal.outStream = Fs.createWriteStream(null, {
            fd: await openAsync(outPath, "a")
          });
        }

        terminal.pty.on("data", data =>
          this._triggerAsync(async () => {
            terminal.history += data;
            if (terminal.history.length > 80000) {
              terminal.history = terminal.history.substring(
                terminal.history.length - 80000
              );
            }

            if (terminal.outStream) terminal.outStream.write(data);

            await this._sendTerminalOutput(application, data);
          })
        );

        terminal.pty.on("exit", code =>
          this._triggerAsync(async () => {
            this._debug("terminal", `exit: ${code}`);
            if (terminal.outStream) terminal.outStream.end();
            delete this._terminals[application.name];

            await this._sendTerminalOutput(
              application,
              `${executable} exited with ${code}.\r\n`
            );
            this._broadcastStates();
          })
        );

        this._broadcastStates();

        const startTime = Date.now();

        while (Date.now() - startTime <= 10000) {
          if (!this._terminals[application.name])
            throw new Error("The process has exited.");

          const listening = await checkPortListening(application.port);
          if (listening) break;

          await sleep(100);
        }

        await sleep(500);
      } catch (error) {
        await this._sendTerminalOutput(application, `${error.message}\r\n`);

        throw new Error(`Failed to launch to application: ${error.message}`);
      }
    });
  }

  _sendTerminalOutput(application, dataString) {
    for (const session of this._sessions) {
      session.socket.send(
        JSON.stringify({
          terminalOutput: {
            applicationName: application.name,
            dataString
          }
        }),
        error => {
          if (error) this._debug("error", error.stack);
        }
      );
    }
  }

  async _ensureApplicationDown(application) {
    if (this._applicationTimers[application.name]) {
      clearTimeout(this._applicationTimers[application.name]);
      delete this._applicationTimers[application.name];
    }

    await this._lockApplication(application, async () => {
      let applicationDown = false;
      const terminal = this._terminals[application.name];
      if (terminal) {
        terminal.pty.write("\u0003");

        if (Os.platform() === "win32") {
          terminal.pty.kill();
          this._debug("stop", "kill()");
        } else {
          terminal.pty.kill("SIGINT");
          this._debug("stop", "SIGINT");
        }

        this._triggerAsync(async () => {
          await sleep(10000);
          if (applicationDown) return;
          this._debug("stop", "SIGKILL");
          terminal.pty.kill("SIGKILL");
        });
      }

      while (this._terminals[application.name]) await sleep(100);

      applicationDown = true;
    });
  }

  async ensureDown() {
    for (const application of this.state.applications)
      await this._ensureApplicationDown(application);
  }

  _broadcastStates() {
    for (const session of this._sessions) {
      session.socket.send(
        JSON.stringify({
          state: {
            uiHost: this._server.getUIHost(),
            caCertificate: this._state.caCertificate,
            usageMessage: this._server.getUsageMessage(),
            homedir: this._homedir,
            applications: this._state.applications.map(application => ({
              ...application,
              domain: this._getApplicationHostname(application),
              origin: `${
                application.ssl ? "https" : "http"
              }://${this._getApplicationHostname(application)}`,
              locked: !!this._applicationLocks[application.name],
              running: !!this._terminals[application.name]
            }))
          }
        }),
        error => {
          if (error) this._debug("error", error.stack);
        }
      );
    }
  }

  _broadcastMessage(message) {
    for (const session of this._sessions) {
      session.socket.send(
        JSON.stringify({
          message
        }),
        error => {
          if (error) this._debug("error", error.stack);
        }
      );
    }
  }

  handleWebsocket(socket) {
    const session = {
      socket,
      setState: state => {
        socket.send(
          JSON.stringify({
            state
          }),
          error => {
            if (error) this._debug("error", error.stack);
          }
        );
      }
    };

    this._sessions.push(session);
    this._broadcastStates();

    for (const applicationName in this._terminals) {
      const terminal = this._terminals[applicationName];

      socket.send(
        JSON.stringify({
          terminalOutput: {
            applicationName,
            dataString: terminal.history
          }
        }),
        error => {
          if (error) this._debug("error", error.stack);
        }
      );
    }

    socket.on("message", data =>
      this._triggerAsync(async () => {
        if (session.onMessage) return session.onMessage(data);

        const action = JSON.parse(data);
        const actionFuncion = this["_doAction" + action.name];
        if (!actionFuncion) throw new Error(`${action.name} doesn't exist.`);

        this._debug(
          "action",
          `name: ${action.name}, parameters: ${Object.keys(
            action.parameters
          ).join(" ")}`
        );

        await actionFuncion.call(this, action.parameters, session);
      })
    );

    socket.on("close", () => {
      _.pull(this._sessions, session);
      this._broadcastStates();
    });
  }
}

module.exports = LocalhostD;
