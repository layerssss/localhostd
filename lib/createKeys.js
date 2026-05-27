const Forge = require("node-forge");

async function createKeys() {
  const keys = await new Promise((resolve, reject) =>
    Forge.pki.rsa.generateKeyPair(2048, (error, keys) => {
      if (error) reject(error);
      resolve(keys);
    })
  );

  return {
    privateKey: Forge.pki.privateKeyToPem(keys.privateKey),
    publicKey: Forge.pki.publicKeyToPem(keys.publicKey)
  };
}

module.exports = createKeys;
