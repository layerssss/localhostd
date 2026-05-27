import ShellQuote from "shell-quote";
import { execa } from "execa";
import defaultShell from "default-shell";
import stripAnsi from "strip-ansi";

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

export default getShellEnv;
