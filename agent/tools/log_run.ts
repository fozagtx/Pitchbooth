import { defineTool } from "eve/tools";
import { z } from "zod";
import { GradeOutputSchema } from "../../lib/coach";
import { sessionRecord } from "../../lib/record";

export default defineTool({
  description: "Save the grade for a completed practice run.",
  inputSchema: z.object({ run: GradeOutputSchema }),
  async execute({ run }) {
    sessionRecord.update((record) => ({
      ...record,
      runs: [...record.runs, run],
    }));
    return { saved: true };
  },
});
