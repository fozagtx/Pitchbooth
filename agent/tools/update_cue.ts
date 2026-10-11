import { defineTool } from "eve/tools";
import { z } from "zod";
import { renameCue } from "../../lib/board";
import { CueSchema } from "../../lib/coach";
import { sessionRecord } from "../../lib/record";

export default defineTool({
  description: "Rename one cue on the saved board.",
  inputSchema: z.object({ cueId: z.string(), label: z.string() }),
  async execute({ cueId, label }) {
    const board = sessionRecord.get().board;
    if (!board) {
      throw new Error("There is no saved board.");
    }

    const updatedBoard = renameCue(board, cueId, label);
    if (!updatedBoard.cues.some((cue) => cue.id === cueId)) {
      throw new Error("Cue not found.");
    }
    sessionRecord.update((record) => ({ ...record, board: updatedBoard }));
    return CueSchema.parse(updatedBoard.cues.find((cue) => cue.id === cueId));
  },
});
