import { defineTool } from "eve/tools";
import { z } from "zod";
import { sessionRecord } from "../../lib/record";

export default defineTool({
  description: "Save a short coaching note for a cue attempt.",
  inputSchema: z.object({ cueId: z.string(), note: z.string() }),
  async execute({ cueId, note }) {
    const entry = { cueId, note };
    sessionRecord.update((record) => ({
      ...record,
      notes: [...record.notes, entry],
    }));
    return entry;
  },
});
