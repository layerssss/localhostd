const Forge = require("node-forge");

async function createCaCertificate(recipient, keys, expire) {
  const privateKey = Forge.pki.privateKeyFromPem(keys.privateKey);
  const publicKey = Forge.pki.publicKeyFromPem(keys.publicKey);
  const certificate = Forge.pki.createCertificate();
  certificate.publicKey = publicKey;
  certificate.serialNumber = "01";
  certificate.validity.notBefore = new Date(Date.now() - 60 * 1000);
  certificate.validity.notAfter = new Date(expire);
  const attrs = [
    {
      name: "commonName",
      value: `LocalhostD Development Certificate Authority for ${recipient}`
    }
  ];
  certificate.setSubject(attrs);
  certificate.setIssuer(attrs);
  certificate.setExtensions([
    {
      name: "basicConstraints",
      cA: true
    },
    {
      name: "keyUsage",
      keyCertSign: true
    },
    {
      name: "nsCertType",
      server: true
    }
  ]);
  certificate.sign(privateKey, Forge.md.sha256.create());
  return Forge.pki.certificateToPem(certificate);
}

module.exports = createCaCertificate;
