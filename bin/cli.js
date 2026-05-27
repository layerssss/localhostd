#!/usr/bin/env node

const Path = require("path");
const { program } = require("commander");
const Server = require("../lib/server.js");
const UpdateNotifier = require("update-notifier");
const pkg = require("../package.json");
const waitDeath = require("../lib/wait_death.js");

UpdateNotifier({ pkg }).notify();

program
  .version(pkg.version)
  .option("-d, --debug", "enable debug")
  .option(
    "--state-file <string>",
    "state file",
    Path.join(
      process.env["HOME"] || process.env["HOMEPATH"],
      ".localhostd.json"
    )
  );

program
  .command("server")
  .option(
    "-p, --port <integer>",
    "HTTP port, default: 2999",
    (i) => parseInt(i),
    2999
  )
  .option("-b, --bind <string>", "HTTP bind, default: 127.0.0.1", "127.0.0.1")
  .action((opts) =>
    Promise.resolve()
      .then(async () => {
        const server = new Server(program.opts());
        await server.listen(opts);

        // eslint-disable-next-line no-console
        console.log(server.getUsageMessage());

        const signal = await waitDeath();

        // eslint-disable-next-line no-console
        console.log(`received ${signal}`);
        await server.close();

        process.exit(0);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          program.opts().debug
            ? error.stack
            : `LocalhostD has encountered an error: \n${error.message}`
        );
        process.exit(1);
      })
  );

program.parse();
