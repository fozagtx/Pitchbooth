// SPDX-License-Identifier: MIT
import { supervise } from "./supervise.mjs";

supervise([
  ["node_modules/eve/bin/eve.js", ["start", "--port", "2000", "--host", "127.0.0.1"]],
  ["node_modules/next/dist/bin/next", ["start", "--hostname", "0.0.0.0", "--port", process.env.PORT ?? "3000"]],
]);
