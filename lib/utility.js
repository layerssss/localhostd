var Fs = require('fs');
var Forge = require('node-forge');
var Netstat = require('node-netstat');
var Mkdirp = require('mkdirp');

module.exports = class Utility {
  static readFile(path, options = {}) {
    return new Promise((resolve, reject) => {
      Fs.readFile(path, options, (error, data) => {
        if (error) return reject(error);

        resolve(data);
      });
    });
  }

  static mkdirp(path) {
    return new Promise((resolve, reject) => {
      Mkdirp(path, error => {
        if (error) return reject(error);
        resolve()
      });
    });
  }

  static openFile(path, flag) {
    return new Promise((resolve, reject) => {
      Fs.open(path, flag, (error, fd) => {
        if (error) return reject(error);
        resolve(fd);
      })
    });
  }

  static whilePromise(test) {
    return Promise.resolve()
      .then(() => test())
      .then(result => result &&
        Utility.delay(100)
        .then(() => Utility.whilePromise(test))
      );
  }

  static lockPromise(key, callback) {
    if (!this._lockPromiseLocks) this._lockPromiseLocks = {};
    var callbackError;
    var callbackResult;
    return Promise.resolve()
      .then(() => Utility.whilePromise(() => Utility._lockPromiseLocks[key]))
      .then(() => Utility._lockPromiseLocks[key] = true)
      .then(Promise.resolve()
        .then(() => callback())
        .catch(error => callbackError = error)
      )
      .then(result => callbackResult = result)
      .then(() => Utility._lockPromiseLocks[key] = false)
      .then(() => callbackError ? Promise.reject(callbackError) : callbackResult);
  }

  static checkPortListening(port) {
    return new Promise((resolve, reject) => {
      var found = false;
      Netstat({
        done: error => {
          if (error) return reject(error);
          resolve(found);
        },
        filter: {
          local: {
            port: port
          },
          protocol: 'tcp',
          state: 'LISTEN'
        }
      }, item => {
        found = true;
      })
    });
  }

  static delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  static writeFile(path, data, options = {}) {
    return new Promise((resolve, reject) => {
      Fs.writeFile(path, data, options, (error) => {
        if (error) return reject(error);

        resolve();
      });
    });
  }

  static createKeys() {
    return Promise.resolve()
      .then(() => new Promise((resolve, reject) =>
        Forge.pki.rsa.generateKeyPair(2048, (error, keys) => {
          if (error) reject(error);
          resolve(keys);
        })
      )).then(keys => {
        return {
          privateKey: Forge.pki.privateKeyToPem(keys.privateKey),
          publicKey: Forge.pki.publicKeyToPem(keys.publicKey)
        };
      });
  }

  static createCaCertificate(recipient, keys, expire) {
    return Promise.resolve()
      .then(() => {
        var privateKey = Forge.pki.privateKeyFromPem(keys.privateKey);
        var publicKey = Forge.pki.publicKeyFromPem(keys.publicKey);
        var certificate = Forge.pki.createCertificate();
        certificate.publicKey = publicKey;
        certificate.serialNumber = '01';
        certificate.validity.notBefore = new Date(Date.now() - 60 * 1000);
        certificate.validity.notAfter = new Date(expire);
        var attrs = [{
          name: 'commonName',
          value: `Motel Development Certificate Authority for ${recipient}`
        }];
        certificate.setSubject(attrs);
        certificate.setIssuer(attrs);
        certificate.setExtensions([{
          name: 'basicConstraints',
          cA: true
        }, {
          name: 'keyUsage',
          keyCertSign: true,
        }, {
          name: 'nsCertType',
          server: true,
        }]);
        certificate.sign(privateKey, Forge.md.sha256.create());
        return Forge.pki.certificateToPem(certificate);
      });
  }

  static createDomainCertificate(keys, caCertificate, domain, expire) {
    return Promise.resolve()
      .then(() => {
        var privateKey = Forge.pki.privateKeyFromPem(keys.privateKey);
        var publicKey = Forge.pki.publicKeyFromPem(keys.publicKey);
        caCertificate = Forge.pki.certificateFromPem(caCertificate);
        var certificate = Forge.pki.createCertificate();
        certificate.publicKey = publicKey;
        certificate.serialNumber = '01';
        certificate.validity.notBefore = new Date(Date.now() - 60 * 1000);
        certificate.validity.notAfter = new Date(expire);
        certificate.setSubject([{
          name: 'commonName',
          value: domain
        }]);
        certificate.setIssuer(caCertificate.subject.attributes);
        certificate.setExtensions([{
          name: 'keyUsage',
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true
        }, {
          name: 'extKeyUsage',
          serverAuth: true,
        }, {
          name: 'nsCertType',
          server: true,
        }, {
          name: 'subjectAltName',
          altNames: [{
            type: 2, // dNSName
            value: domain
          }]
        }]);

        certificate.sign(privateKey, Forge.md.sha256.create());
        return Forge.pki.certificateToPem(certificate);
      });
  }
};
