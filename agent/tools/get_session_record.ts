// SPDX-License-Identifier: MIT
import { defineTool } from "eve/tools";
import { z } from "zod";
import { sessionRecord } from "../../lib/record";

export default defineTool({
  description: "Return the saved board, coaching notes, and practice runs.",
  inputSchema: z.object({}),
  execute() {
    return sessionRecord.get();
  },
});
