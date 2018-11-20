#!/usr/bin/env node

const Path = require("path");
const Commander = require("commander");
const Server = require("../lib/server.js");
const UpdateNotifier = require("update-notifier");
const pkg = require("../package.json");
const waitDeath = require("../lib/wait_death.js");

UpdateNotifier({
  pkg
}).notify();

Commander.version(pkg.version)
  .option("-d --debug", "enable debug")
  .option(
    "    --state-file [string]",
    "state file, default: ~/.localhostd.json",
    Path.join(
      process.env["HOME"] || process.env["HOMEPATH"],
      ".localhostd.json"
    )
  );

Commander.command("server")
  .option(
    "-p, --port [integer]",
    "HTTP port, default: 2999",
    (i, d) => parseInt(i || d),
    2999
  )
  .option("-b, --bind [string]", "HTTP bind, default: 127.0.0.1", "127.0.0.1")
  .action(options =>
    Promise.resolve()
      .then(async () => {
        const server = new Server(Commander);
        await server.listen(options);

        // eslint-disable-next-line no-console
        console.log(server.getUsageMessage());

        const signal = await waitDeath();

        // eslint-disable-next-line no-console
        console.log(`received ${signal}`);

        process.exit(0);
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.error(
          Commander.debug
            ? error.stack
            : `LocalhostD has encountered an error: \n${error.message}`
        );
        process.exit(1);
      })
  );

Commander.parse(process.argv);
