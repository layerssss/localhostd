const ShellQuote = require("shell-quote");
const execa = require("execa");
const defaultShell = require("default-shell");
const stripAnsi = require("strip-ansi");

async function getShellEnv({ cwd } = {}) {
  const args = [
    "-ilc",
    [
      ...(!cwd ? [] : [ShellQuote.quote(["cd", cwd])]),
      'echo -n "_SHELL_ENV_DELIMITER_"',
      "env",
      'echo -n "_SHELL_ENV_DELIMITER_"',
      "which node",
      "exit"
    ].join("; ")
  ];

  const result = await execa(defaultShell, args);

  const env = {};

  for (const line of stripAnsi(result.stdout)
    .split("\n")
    .filter(line => !!line)) {
    const parts = line.split("=");
    env[parts.shift()] = parts.join("=");
  }

  return env;
}

module.exports = getShellEnv;
