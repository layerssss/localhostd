const Http = require("http");
const Https = require("https");
const Net = require("net");
const Fs = require("fs");
const Os = require("os");
const Url = require("url");
const Tls = require("tls");
const Username = require("username");
const Express = require("express");
const Websocket = require("ws");
const Path = require("path");
const Portfinder = require("portfinder");

const LocalhostD = require("./localhostd.js");
const ProxyCore = require("./proxy_core.js");
const createKeys = require("./create_keys.js");
const createCaCertificate = require("./create_ca_certificate.js");
const createDomainCertificate = require("./create_domain_certificate.js");

const uiHost = "localhostd.test";

const listenAsync = (server, ...args) =>
  new Promise((resolve, reject) => {
    server.listen(...args);
    server.on("listening", () => {
      resolve(server.address());
    });
    server.on("error", reject);
  });

class Server {
  _saveState() {
    Fs.writeFileSync(this._options.stateFile, JSON.stringify(this._state), {
      mode: 0o600
    });
  }

  constructor(options) {
    this._options = options;
    this._state = {};
    this._domainSsls = {};

    if (Fs.existsSync(options.stateFile)) {
      this._state = JSON.parse(
        Fs.readFileSync(options.stateFile, {
          encoding: "utf8"
        })
      );

      this._saveState();
    }

    this._localhostd = new LocalhostD({
      state: this._state,
      onStateChange: () => this._saveState(),
      server: this,
      debug: this._debug.bind(this)
    });

    this._proxyCore = new ProxyCore();

    this._proxyServer = Http.createServer();
    this._proxyServer.on("connect", (request, socket, head) =>
      this._handleProxyConnect(request, socket, head)
    );
    this._proxyServer.on("request", (request, response) =>
      this._handleProxyRequest(request, response, false)
    );

    this._httpServer = Http.createServer();
    this._httpServer.on("request", (request, response) =>
      this._handleRequest(request, response, false)
    );
    this._httpServer.on("upgrade", (request, socket, head) =>
      this._handleUpgrade(request, socket, head, false)
    );

    this._sslServer = Https.createServer({
      SNICallback: (domain, cb) => this._handleSNICallback(domain, cb)
    });
    this._sslServer.on("request", (request, response) =>
      this._handleRequest(request, response, true)
    );
    this._sslServer.on("upgrade", (request, socket, head) =>
      this._handleUpgrade(request, socket, head, true)
    );

    this._uiServerExpress = Express();
    this._uiServerExpress.use(
      Express.static(Path.join(__dirname, "..", "ui_build"))
    );

    this._uiServerExpress.use((request, response, next) => {
      const acceptHeader = request.headers.accept || "";
      if (acceptHeader.startsWith("text/html"))
        return response.sendfile(
          Path.join(__dirname, "../ui_build/index.html")
        );
      next();
    });

    this._uiServer = Http.createServer();
    this._uiServer.on("request", (request, response) =>
      this._uiServerExpress(request, response)
    );
    this._uiServer.on("upgrade", (request, socket, head) => {
      if (request.url !== "/_bnb_ui_state") return socket.end();
      this._websocketServer.handleUpgrade(request, socket, head, websocket =>
        this.handleWebsocket(websocket)
      );
    });

    this._websocketServer = new Websocket.Server({
      noServer: true
    });
  }

  getUsageMessage() {
    return `You need to configure your browser to use HTTP(S) proxy at http://${this._proxyServerBind}:${this._proxyServerPort} to access localhostd-hosted applications.`;
  }

  getUIHost() {
    return uiHost;
  }

  handleWebsocket(websocket) {
    websocket.on("error", error => this._debug("error", error.stack));
    this._localhostd.handleWebsocket(websocket);
  }

  _debug(type, message) {
    if (!this._options.debug) return;
    // eslint-disable-next-line no-console
    console.log(`${type} > ${message}`);
  }

  async listen({ port, bind }) {
    this._proxyServerBind = bind;
    this._proxyServerPort = port;
    await listenAsync(
      this._proxyServer,
      this._proxyServerPort,
      this._proxyServerBind
    );

    this._uiServerPort = await Portfinder.getPortPromise({
      host: "127.0.0.1",
      port: 30000
    });
    await listenAsync(this._uiServer, this._uiServerPort, "localhost");
    this._httpServerPort = await Portfinder.getPortPromise({
      host: "127.0.0.1",
      port: 30000
    });
    await listenAsync(this._httpServer, this._httpServerPort, "localhost");
    this._sslServerPort = await Portfinder.getPortPromise({
      host: "127.0.0.1",
      port: 30000
    });
    await listenAsync(this._sslServer, this._sslServerPort, "localhost");

    await this._initializePki();

    this._localhostd._broadcastStates();

    this._debug("_uiServerPort", this._uiServerPort);
    this._debug("_httpServerPort", this._httpServerPort);
    this._debug("_sslServerPort", this._sslServerPort);
  }

  async close() {
    await this._localhostd.ensureDown();
    this._uiServer.close();
    this._uiServer.unref();
    this._sslServer.close();
    this._sslServer.unref();
    this._httpServer.close();
    this._httpServer.unref();
    this._proxyServer.close();
    this._proxyServer.unref();
  }

  async _initializePki() {
    let serverKeys;
    let caCertificate;

    // ensure serverKeys present
    const privateKey = this._state["privateKey"];
    const publicKey = this._state["publicKey"];
    if (privateKey && publicKey) {
      serverKeys = {
        privateKey,
        publicKey
      };
    }

    if (!serverKeys) {
      this._debug("pki", "initialize pki pair");
      const keys = await createKeys();
      serverKeys = keys;
      this._state["privateKey"] = serverKeys.privateKey;
      this._state["publicKey"] = serverKeys.publicKey;
      await this._saveState();
    }

    // Ensuce ca certificate valid
    const caCertificateExpire = this._state["caCertificateExpire"];

    if (caCertificateExpire && caCertificateExpire <= Date.now()) {
      this._debug("pki", "ca certificate expires");
      this._state["caCertificateExpire"] = null;
      this._state["caCertificate"] = null;
      await this._saveState();
    }

    // ensure ca certificate present
    caCertificate = this._state["caCertificate"];

    if (!caCertificate) {
      this._debug("pki", "ca certificate generation");
      const expire = Date.now() + 365 * 24 * 3600 * 1000;
      const username = await Username();
      const certificate = await createCaCertificate(
        `${username} at ${Os.hostname()}`,
        serverKeys,
        expire
      );

      caCertificate = this._state["caCertificate"] = certificate;
      this._state["caCertificateExpire"] = expire;
      await this._saveState();
    }

    return {
      caCertificate,
      serverKeys
    };
  }

  _handleSNICallback(domain, cb) {
    Promise.resolve()
      .then(async () => {
        const application = this._findApplication(domain);
        if (!application) throw new Error(`${domain} is not configured.`);

        const { caCertificate, serverKeys } = await this._initializePki();

        // ensure domain certificate valid
        let domainSsl = this._domainSsls[domain];
        if (domainSsl && domainSsl.certificateExpire < Date.now()) {
          domainSsl = null;
          this._domainSsls[domain] = null;
        }

        // ensure domain certificate present
        if (!domainSsl) {
          const expire = Date.now() + 30 * 24 * 3600 * 1000;

          const certificate = await createDomainCertificate(
            serverKeys,
            caCertificate,
            domain,
            expire
          );

          domainSsl = this._domainSsls[domain] = {
            certificate: certificate,
            certificateExpire: expire
          };
        }
        const context = Tls.createSecureContext({
          cert: domainSsl.certificate + "\n" + caCertificate,
          key: serverKeys.privateKey,
          ca: [caCertificate]
        });

        return context;
      })
      .then(context => {
        cb(null, context);
      })
      .catch(error => {
        this._debug("error", error.stack);
        cb(error);
      });
  }

  _sendRedirect(application, request, response, path) {
    response.writeHead(301, {
      Location: `${application.ssl ? "https" : "http"}://${
        request.headers.host
      }${path}`
    });
    response.end();
  }

  _handleProxyConnect(request, socket, head) {
    Promise.resolve()
      .then(async () => {
        const hostMatch = request.url.match(/^(.+):(\d+)$/);
        if (!hostMatch) throw new Error(`Invalid URL: ${request.url}`);
        const hostname = hostMatch[1];
        const port = Number(hostMatch[2]);

        let clientHostname = hostname;
        let clientPort = port;
        const application = this._findApplication(hostname);
        if (application) {
          clientHostname = "localhost";
          let ssl = false;
          if (port === 443) {
            clientPort = this._sslServerPort;
            ssl = true;
          } else if (port === 80) {
            clientPort = this._httpServerPort;
          } else throw new Error(`Invalid port: ${port}`);

          if (ssl !== !!application.ssl)
            throw new Error(`SSL: ${!!application.ssl}`);
        }

        this._debug("proxy", `CONNECT ${clientHostname}:${clientPort}`);

        socket.on("error", error => this._debug("error", error.stack));

        const client = Net.connect({
          host: clientHostname,
          port: clientPort
        });

        client.on("error", error => {
          this._debug("error", error.stack);
          socket.end(error.message);
        });

        client.on("connect", () => {
          socket.write(
            [
              "HTTP/1.1 200 Connection Established\r\n",
              "Proxy-agent: localhostd\r\n",
              "\r\n"
            ].join("")
          );
          client.write(head);
          client.pipe(socket).pipe(client);
        });
      })
      .catch(error => {
        this._debug("error", error.stack);
        socket.end();
      });
  }

  _handleProxyRequest(request, response, ssl) {
    Promise.resolve()
      .then(async () => {
        const url = Url.parse(request.url);
        if (!url.hostname) throw new Error(this.getUsageMessage());

        let clientHostname = url.hostname;
        let clientPort = url.port || 80;

        const application = this._findApplication(clientHostname);
        if (application) {
          if (clientPort !== 80) throw new Error(`Invalid port: ${clientPort}`);

          this._localhostd.pingApplication(clientHostname);
          clientHostname = "localhost";
          clientPort = application.port;
          if (ssl !== !!application.ssl)
            return this._sendRedirect(
              application,
              request,
              response,
              url.pathname
            );
        }

        this._debug(
          "proxy",
          `${request.method} ${clientHostname}:${clientPort}${url.path}`
        );

        this._proxyCore.proxyRequest({
          request,
          response,
          upstream: `http://${clientHostname}:${clientPort}`,
          ssl
        });
      })
      .catch(error => {
        this._debug("error", error.stack);
        if (response.headersSent) return;
        response.writeHead(503, "Service Unavailable");
        response.end(error.message);
      });
  }

  _findApplication(host) {
    if (uiHost === host)
      return {
        port: this._uiServerPort,
        ssl: false
      };

    const application = this._localhostd.findApplication(host);

    if (!application) return null;

    if (!this._localhostd.isApplicationUp(host))
      return {
        ...application,
        port: this._uiServerPort
      };

    return application;
  }

  _handleUpgrade(request, socket, head, ssl) {
    Promise.resolve()
      .then(async () => {
        const host = request.headers.host;

        const application = this._findApplication(host);

        if (!application)
          throw new Error(
            `no application configured at ${host}, please visit ${uiHost} to configure.`
          );

        this._debug(
          "server",
          `UPGRADE ws//:localhost:${application.port}${request.url}`
        );

        if (ssl !== !!application.ssl)
          throw new Error(`SSL: ${!!application.ssl}`);

        const pingTimer = setInterval(() => {
          this._localhostd._pingApplication(host);
        }, 1000);

        socket.on("close", () => clearInterval(pingTimer));

        this._proxyCore.proxyUpgrade({
          request,
          socket,
          head,
          upstream: `http://localhost:${application.port}`,
          ssl
        });
      })
      .catch(error => {
        this._debug("error", error.stack);
        socket.end();
      });
  }

  _handleRequest(request, response, ssl) {
    Promise.resolve()
      .then(async () => {
        const host = request.headers.host;

        const application = this._findApplication(host);

        response.setHeader(
          "X-LocalhostD-Version",
          require("../package.json").version
        );

        if (!application)
          throw new Error(
            `No application configured at ${host}, please visit <a href="//${uiHost}">${uiHost}</a> to configure.`
          );

        if (ssl !== !!application.ssl)
          return this._sendRedirect(
            application,
            request,
            response,
            request.url
          );

        this._debug(
          "server",
          `${request.method} http://localhost:${application.port}${request.url}`
        );

        this._proxyCore.proxyRequest({
          request,
          response,
          upstream: `http://localhost:${application.port}`,
          ssl
        });
      })
      .catch(error => {
        this._debug("error", error.stack);
        if (response.headersSent) return;
        response.writeHead(503, "Service Unavailable");
        response.end(error.message);
      });
  }
}

module.exports = Server;
