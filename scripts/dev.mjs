// SPDX-License-Identifier: MIT
import { supervise } from "./supervise.mjs";

supervise([
  ["node_modules/next/dist/bin/next", ["dev"]],
  ["node_modules/eve/bin/eve.js", ["dev", "--no-ui", "--port", "2000"]],
]);
