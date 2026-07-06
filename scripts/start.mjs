// Single entrypoint for both Railway services, so they share the default
// `npm start` and no per-service custom start command is needed:
//   - WORKER_ROLE=1  → run the analysis worker (tsx worker/index.ts)
//   - otherwise      → run the Next.js web server (next start)  [unchanged]
// Signals are forwarded to the child so Railway's SIGTERM drains cleanly, and
// the child's exit code is propagated.
import { spawn } from "node:child_process";

const isWorker = process.env.WORKER_ROLE === "1";
const [cmd, args] = isWorker
  ? ["npm", ["run", "worker"]]
  : ["npm", ["run", "start:web"]];

console.log(`[start] role=${isWorker ? "worker" : "web"} → ${cmd} ${args.join(" ")}`);

const child = spawn(cmd, args, { stdio: "inherit", env: process.env });

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
child.on("error", (err) => {
  console.error("[start] failed to spawn child:", err);
  process.exit(1);
});
