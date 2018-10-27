const Forge = require("node-forge");

async function createDomainCertificate(keys, caCertificate, domain, expire) {
  const privateKey = Forge.pki.privateKeyFromPem(keys.privateKey);
  const publicKey = Forge.pki.publicKeyFromPem(keys.publicKey);
  caCertificate = Forge.pki.certificateFromPem(caCertificate);
  const certificate = Forge.pki.createCertificate();
  certificate.publicKey = publicKey;
  certificate.serialNumber = "01";
  certificate.validity.notBefore = new Date(Date.now() - 60 * 1000);
  certificate.validity.notAfter = new Date(expire);
  certificate.setSubject([
    {
      name: "commonName",
      value: domain
    }
  ]);
  certificate.setIssuer(caCertificate.subject.attributes);
  certificate.setExtensions([
    {
      name: "keyUsage",
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: "extKeyUsage",
      serverAuth: true
    },
    {
      name: "nsCertType",
      server: true
    },
    {
      name: "subjectAltName",
      altNames: [
        {
          type: 2, // dNSName
          value: domain
        }
      ]
    }
  ]);

  certificate.sign(privateKey, Forge.md.sha256.create());
  return Forge.pki.certificateToPem(certificate);
}

module.exports = createDomainCertificate;
