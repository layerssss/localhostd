const waitDeath = () =>
  new Promise((resolve, reject) => {
    process.on("uncaughtException", reject);
    process.on("unhandledRejection", reject);
    process.on("SIGINT", resolve);
    process.on("SIGQUIT", resolve);
    process.on("SIGTERM", resolve);
  });

module.exports = waitDeath;
