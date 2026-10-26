import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

export function supervise(commands) {
  process.env.AGENT_SHARED_KEY ||= randomBytes(32).toString("base64url");

  const children = new Set();
  let stopping = false;
  let exitCode = 0;

  function stop(signal, code = 0) {
    if (stopping) return;
    stopping = true;
    exitCode = code;
    for (const child of children) child.kill(signal);
  }

  function start(script, args) {
    const child = spawn(process.execPath, [fileURLToPath(new URL(script, `file://${root}`)), ...args], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    children.add(child);
    child.on("error", () => {
      children.delete(child);
      stop("SIGTERM", 1);
    });
    child.on("exit", (code, signal) => {
      children.delete(child);
      if (!stopping) stop(signal ?? "SIGTERM", code ?? 1);
      if (children.size === 0) process.exitCode = exitCode;
    });
  }

  process.on("SIGINT", () => stop("SIGINT", 130));
  process.on("SIGTERM", () => stop("SIGTERM", 143));
  for (const [script, args] of commands) start(script, args);
}
