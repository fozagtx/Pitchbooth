import { defineTool } from "eve/tools";
import { z } from "zod";
import { BoardSchema } from "../../lib/coach";
import { validateBoard } from "../../lib/board";
import { sessionRecord } from "../../lib/record";

export default defineTool({
  description: "Validate and save the current cue board.",
  inputSchema: z.object({ board: BoardSchema }),
  async execute({ board }) {
    const errors = validateBoard(board);
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    sessionRecord.update((record) => ({ ...record, board }));
    return board;
  },
});
