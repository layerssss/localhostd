const Net = require("net");

async function checkPortListening(port) {
  const listening = new Promise(resolve => {
    const client = Net.createConnection({ port });
    client.setTimeout(100);
    client.on("error", () => resolve(false));
    client.on("connect", () => {
      client.end();
      resolve(true);
    });
  });

  return listening;
}

module.exports = checkPortListening;
