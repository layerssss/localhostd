#!/usr/bin/env node

import Path from "path";
import { program } from "commander";
import updateNotifier from "update-notifier";
import pkg from "../package.json" with { type: "json" };

import Server from "../lib/Server.js";
import waitDeath from "../lib/waitDeath.js";

updateNotifier({ pkg }).notify();

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
