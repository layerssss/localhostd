var Http = require('http');
var Https = require('https');
var Net = require('net');
var Fs = require('fs');
var Os = require('os');
var Url = require('url');
var Tls = require('tls');
var Bnb = require('./bnb.js');
var Username = require('username');
var Express = require('express');
var Websocket = require('ws');
var Path = require('path');
var Portfinder = require('portfinder');
var Utility = require('./utility.js');
var _ = require('lodash');

class Server {
  _saveState() {
    Fs.writeFileSync(
      this._options.stateFile,
      JSON.stringify(this._state)
    );
  }

  constructor(options) {
    if (!options.env) options.env = process.env;
    this._options = options;
    this._state = {};
    this._domainSsls = {};

    if (Fs.existsSync(options.stateFile)) {
      this._state = JSON.parse(Fs.readFileSync(
        options.stateFile, {
          encoding: 'utf8'
        }
      ));

      this._saveState();
    }

    this._bnb = new Bnb({
      state: this._state,
      onStateChange: () => this._saveState(),
      env: this._options.env || process.env
    });

    this._proxyServer = Http.createServer();
    this._proxyServer.on('connect', (request, socket, head) => this._handleConnect(request, socket, head));
    this._proxyServer.on('upgrade', (request, socket, head) => this._handleUpgrade(request, socket, head, false));
    this._proxyServer.on('request', (request, response) => this._handleRequest(request, response, false));

    this._sslServer = Https.createServer({
      SNICallback: (domain, cb) => this._handleSNICallback(domain, cb)
    });
    this._sslServer.on('request', (request, response) => this._handleRequest(request, response, true));
    this._sslServer.on('upgrade', (request, socket, head) => this._handleUpgrade(request, socket, head, true));

    var express = Express();
    express.use(Express.static(Path.join(__dirname, '..', 'static')));

    this._bnbServer = Http.createServer();
    this._bnbServer.on('request', (request, response) => express(request, response));
    this._bnbServer.on('upgrade', (request, socket, head) =>
      this._websocketServer.handleUpgrade(request, socket, head, websocket => this.handleWebsocket(websocket))
    );

    this._websocketServer = new Websocket.Server({
      noServer: true
    });
  }

  handleWebsocket(websocket) {
    this._bnb.handleWebsocket(websocket);
  }

  _debug(type, message) {
    if (!this._options.debug) return;
    console.log(`${type} > ${message}`);
  }

  listen(options) {
    return Promise.resolve()
      .then(() => Portfinder.getPortPromise())
      .then((port) => this._bnbServerPort = port)
      .then(() => new Promise(resolve =>
        this._bnbServer.listen(
          this._bnbServerPort,
          'localhost',
          resolve
        )
      ))
      .then(() => Portfinder.getPortPromise())
      .then((port) => this._sslServerPort = port)
      .then(() => new Promise(resolve =>
        this._sslServer.listen(
          this._sslServerPort,
          'localhost',
          resolve
        )
      ))
      .then(() => new Promise(resolve =>
        this._proxyServer.listen(
          options.port,
          options.bind,
          resolve
        )
      ))
      .then(() => this._initializePki())
      .then(() => this._proxyServer.address())
      .then(address => {
        console.log('listening to http://' + address.address + ':' + address.port);
      });
  }

  close() {
    return Promise.resolve()
      .then(() => this._bnb.ensureDown())
      .then(() => {
        this._bnbServer.close();
        this._bnbServer.unref();
        this._sslServer.close();
        this._sslServer.unref();
        this._proxyServer.close();
        this._proxyServer.unref();
      });
  }

  _initializePki() {
    var serverKeys;
    var caCertificate;
    return Promise.resolve()
      .then(() => { // ensure serverKeys present
        var privateKey = this._state['privateKey'];
        var publicKey = this._state['publicKey'];
        if (privateKey && publicKey) {
          serverKeys = {
            privateKey,
            publicKey
          };
        }

        if (serverKeys) return;
        return Utility.createKeys()
          .then(keys => {
            serverKeys = keys;
            this._state['privateKey'] = serverKeys.privateKey;
            this._state['publicKey'] = serverKeys.publicKey;
            this._saveState();
          });
      })
      .then(() => { // Ensuce ca certificate valid
        var caCertificateExpire = this._state['caCertificateExpire'];

        if (!caCertificateExpire) return;
        if (caCertificateExpire > Date.now()) return;
        this._state['caCertificateExpire'] = null;
        this._state['caCertificate'] = null;
        this._saveState();
      })
      .then(() => { // ensure ca certificate present
        caCertificate = this._state['caCertificate'];

        if (caCertificate) return;
        var expire = Date.now() + 365 * 24 * 3600 * 1000;
        return Username()
          .then(username => Utility.createCaCertificate(
            `${username} at ${Os.hostname()}`,
            serverKeys,
            expire
          ))
          .then(certificate => {
            caCertificate = this._state['caCertificate'] = certificate;
            this._state['caCertificateExpire'] = expire;
            this._saveState();
          })
      })
      .then(() => {
        return {
          caCertificate,
          serverKeys
        };
      });
  }

  _handleSNICallback(domain, cb) {
    var serverKeys;
    var caCertificate;
    var domainSsl;
    Promise.resolve()
      .then(() => { // ensure domain valid
        if (domain == 'bnb.dev') return;
        return this._bnb.getApplicationPort(domain)
          .then(port => {
            if (!port) return Promise.reject(new Error(`${domain} is not configured.`));
          });
      })
      .then(() => this._initializePki())
      .then(pkiInfo => {
        caCertificate = pkiInfo.caCertificate;
        serverKeys = pkiInfo.serverKeys;
      })
      .then(() => { // ensure domain certificate valid
        domainSsl = this._domainSsls[domain];
        if (!domainSsl) return;
        if (domainSsl.certificateExpire > Date.now()) return;
        domainSsl = this._domainSsls[domain] = null;
      })
      .then(() => { // ensure domain certificate present
        if (domainSsl) return;
        var expire = Date.now() + 30 * 24 * 3600 * 1000;
        return Utility.createDomainCertificate(serverKeys, caCertificate, domain, expire)
          .then(certificate => {
            domainSsl = this._domainSsls[domain] = {
              certificate: certificate,
              certificateExpire: expire
            }
          });
      })
      .then(() => Tls.createSecureContext({
        cert: domainSsl.certificate,
        key: serverKeys.privateKey,
        ca: [caCertificate]
      }))
      .then(context => {
        cb(null, context);
      })
      .catch(error => {
        console.error(error.stack);
        cb(error);
      });
  }

  _transformRequestHeaders(request, ssl) {
    var ip = request.headers['x-real-ip'] ||
      request.headers['x-client-ip'] ||
      request.socket.remoteAddress;
    var protocol = ssl ? 'https' : 'http';

    _.assign(request.headers, {
      'x-real-ip': ip,
      'x-client-id': ip
    });

    _.defaults(request.headers, {
      'x-forwarded-for': ip,
      'x-forwarded-scheme': protocol,
      'x-forwarded-proto': protocol,
      'x-forwarded-port': request.socket.localPort,
      'x-forwarded-host': request.headers['host']
    });

    _.unset(request.headers, 'proxy-connection');
    if (request.headers['connection'] != 'Upgrade') _.unset(request.headers, 'connection');
  }

  _transformResponseHeaders(response, ssl) {
    if (response.headers['connection'] != 'Upgrade') _.unset(response.headers, 'connection');
    response.headers['X-Bnb-Version'] = require('../package.json').version;
  }

  _handleConnect(request, socket, head) {
    var hostMatch = request.url.match(/^(.+)\:(\d+)$/);
    if (!hostMatch) return socket.end(); // Invalid Connect
    var hostname = hostMatch[1];
    var port = Number(hostMatch[2]);

    var clientHostname = hostname;
    var clientPort = port;

    Promise.resolve()
      .then(() => {
        // There's no way to determine whether they expect an SSL or not.
        if (_.endsWith(hostname, '.dev')) {
          clientHostname = 'localhost';

          if (port == 443) return clientPort = this._sslServerPort;

          if (hostname == 'bnb.dev') {
            clientHostname = 'localhost';
            clientPort = this._bnbServerPort;
            return;
          }

          return this._bnb.getApplicationPort(hostname)
            .then(applactionPort => {
              if (!applactionPort) return Promise.reject(new Error(`${hostname} not configured.`));
              clientPort = applactionPort;
            });
        }
      })
      .then(() => {
        this._debug('proxy', `CONNECT ${clientHostname}:${clientPort}`);

        var client = Net.connect({
          host: clientHostname,
          port: clientPort
        });

        client.on('error', error => {
          socket.write([
            'HTTP/1.1 503 Service Unavailable\r\n',
            'Proxy-agent: bnb\r\n',
            `X-Bnb-Error: ${error.message}\r\n`,
            '\r\n'
          ].join(''));
          socket.end();
        });

        client.on('connect', () => {
          socket.write([
            'HTTP/1.1 200 Connection Established\r\n',
            'Proxy-agent: bnb\r\n',
            '\r\n'
          ].join(''));
          client.write(head);
          client.pipe(socket).pipe(client);
        });
      })
      .catch(error => {
        console.error(error.stack);
        socket.end();
      });
  }

  _handleUpgrade(request, socket, head, ssl) {
    var hostname;
    var requestPort;
    var clientPort;
    Promise.resolve()
      .then(() => {
        [hostname, requestPort] = request.headers.host.split(':');
        requestPort = Number(requestPort || 80);
        if (hostname == 'bnb.dev') return clientPort = this._bnbServerPort;

        return this._bnb.getApplicationPort(hostname)
          .then(port => {
            if (!port) return Promise.reject(new Error(`${hostname} not configured.`));

            clientPort = port;
          });
      })
      .then(() => {
        this._transformRequestHeaders(request, ssl);
        var clientRequest = Http.request({
          method: request.method,
          path: request.url,
          hostname: 'localhost',
          port: clientPort,
          headers: request.headers
        });

        clientRequest.flushHeaders();
        clientRequest.write(head);

        return new Promise((resolve, reject) => {
          clientRequest.on('error', error => reject(error));
          clientRequest.on('response', (clientResponse) => reject(new Error(`Server responded with: ${clientResponse.statusCode} ${clientResponse.statusMessage}`)));
          clientRequest.on('upgrade', (clientResponse, clientSocket) => resolve({
            clientResponse,
            clientSocket
          }));
        });
      })
      .then(({
        clientResponse,
        clientSocket
      }) => {
        this._transformResponseHeaders(clientResponse, ssl);
        socket.write('HTTP/1.1 ' + clientResponse.statusCode + ' ' + clientResponse.statusMessage + '\r\n');

        for (var key in clientResponse.headers) {
          if (key == 'set-cookie') {
            for (var setCookie in clientResponse.headers[key]) {
              socket.write(`${key}: ${setCookie}\r\n`);
            }
            continue;
          }
          socket.write(`${key}: ${clientResponse.headers[key]}\r\n`);
        }

        socket.write('\r\n');

        clientSocket.pipe(socket);
        socket.pipe(clientSocket);
      })
      .catch(error => {
        console.error(error.stack);
        socket.write([
          'HTTP/1.1 503 Service Unavailable\r\n',
          'Proxy-agent: bnb\r\n',
          `X-Bnb-Error: ${error.message}\r\n`,
          '\r\n'
        ].join(''));
        socket.end();
      });
  }

  _handleRequest(request, response, ssl) {
    var url = Url.parse(request.url);
    var clientHostname = url.hostname;
    var clientPort = url.port;

    if (!url.hostname) {
      [
        clientHostname,
        clientPort
      ] = (request.headers.host || '').split(':');
      clientPort = Number(clientPort);
    }

    clientHostname = clientHostname || 'localhost';
    clientPort = clientPort || 80;

    return Promise.resolve()
      .then(() => {
        if (clientHostname == 'bnb.dev') {
          clientHostname = 'localhost';
          clientPort = this._bnbServerPort;
          return;
        }

        if (_.endsWith(clientHostname, '.dev')) {
          return this._bnb.getApplicationPort(clientHostname)
            .then(port => {
              if (!port) return Promise.reject(new Error(`${clientHostname} not configured.`));

              clientHostname = 'localhost';
              clientPort = port;
            });
        }
      })
      .then(() => {
        this._debug('proxy', `${request.method} ${clientHostname}:${clientPort}${url.path}`);

        if (url.hostname) _.defaults(request.headers, {
          'x-forwarded-port': url.port || 80,
          'x-forwarded-host': url.hostname
        });

        this._transformRequestHeaders(request, ssl);

        var clientRequest = Http.request({
          method: request.method,
          path: url.path,
          hostname: clientHostname,
          port: clientPort,
          headers: request.headers
        });

        clientRequest.on('error', error => {
          response.writeHead(
            503,
            'Service Unavailable'
          );
          response.end(error.stack);
        });

        request.pipe(clientRequest);

        return clientRequest.on('response', clientResponse => {
          this._transformResponseHeaders(clientResponse, ssl);

          response.writeHead(
            clientResponse.statusCode,
            clientResponse.statusMessage,
            clientResponse.headers
          );

          clientResponse.pipe(response);
        });
      })
      .catch(error => {
        response.writeHead(
          503,
          'Service Unavailable'
        );
        response.end(error.stack);
      });
  }
}

module.exports = Server;
