import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
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
  const child = spawn(process.execPath, [new URL(script, import.meta.url).pathname, ...args], {
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
start("../node_modules/eve/bin/eve.js", ["start", "--port", "2000", "--host", "127.0.0.1"]);
start("../node_modules/next/dist/bin/next", ["start", "--hostname", "0.0.0.0", "--port", process.env.PORT ?? "3000"]);
