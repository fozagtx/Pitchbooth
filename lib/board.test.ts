import { describe, expect, it } from "vitest";
import {
  cueView,
  hintFor,
  levelForRun,
  renameCue,
  validateBoard,
  type Board,
  type Cue,
} from "./board";

function makeBoard(count = 5): Board {
  const acts = ["Open", "Problem", "Product", "Proof"];
  return {
    cues: Array.from({ length: count }, (_, slot) => ({
      id: `cue-${slot}`,
      slot,
      act: acts[slot % acts.length],
      label: `Cue ${slot}`,
      icon: "star",
      section: "Opening",
      keywords: [`keyword${slot}`],
    })),
    opener: "Start",
    closer: "Finish",
    gaps: [],
  };
}

describe("board logic", () => {
  it("accepts boards with five through seven cues and three or four acts", () => {
    expect(validateBoard(makeBoard(5))).toEqual([]);
    expect(validateBoard(makeBoard(7))).toEqual([]);
  });

  it("reports boards that violate each structural rule", () => {
    const valid = makeBoard();
    const invalidBoards = [
      { ...valid, cues: valid.cues.slice(1) },
      { ...valid, cues: [...valid.cues, ...makeBoard(4).cues] },
      {
        ...valid,
        cues: valid.cues.map((cue, index) =>
          index === 0 ? { ...cue, label: "Four words in this label" } : cue,
        ),
      },
      {
        ...valid,
        cues: valid.cues.map((cue, index) =>
          index === 0 ? { ...cue, label: "Sentence." } : cue,
        ),
      },
      {
        ...valid,
        cues: valid.cues.map((cue, index) =>
          index === 0 ? { ...cue, slot: 1 } : cue,
        ),
      },
      {
        ...valid,
        cues: valid.cues.map((cue) => ({ ...cue, act: "Open" })),
      },
      {
        ...valid,
        cues: valid.cues.map((cue, index) => ({
          ...cue,
          act: ["Open", "Problem", "Product", "Proof", "Close"][index],
        })),
      },
      { ...valid, gaps: ["one", "two", "three", "four"] },
      {
        ...valid,
        cues: valid.cues.map((cue, index) =>
          index === 0 ? { ...cue, keywords: [] } : cue,
        ),
      },
    ];

    for (const board of invalidBoards) {
      expect(validateBoard(board).length).toBeGreaterThan(0);
    }
  });

  it("builds concise hints and clamps run levels to one through four", () => {
    expect(hintFor("Ten thousand users")).toBe("T t u");
    expect(hintFor("$2M ARR")).toBe("$2M A");
    expect(hintFor("Ask")).toBe("A");
    expect([1, 2, 3, 4, 8].map(levelForRun)).toEqual([1, 2, 3, 4, 4]);
  });

  it("shows the appropriate cue detail at each level and preserves skipped state", () => {
    const cue = makeBoard().cues[0];
    expect(cueView(cue, 1, "idle", false)).toEqual({
      icon: "star",
      text: "Cue 0",
      section: "Opening",
      lit: false,
      skipped: false,
    });
    expect(cueView(cue, 2, "idle", false)).toEqual({
      icon: "star",
      text: "C 0",
      lit: false,
      skipped: false,
    });
    expect(cueView(cue, 3, "reached", false)).toEqual({
      lit: true,
      skipped: false,
    });
    expect(cueView(cue, 4, "idle", true)).toEqual({
      icon: "star",
      text: "Cue 0",
      lit: false,
      skipped: false,
    });
    for (const level of [1, 2, 3, 4]) {
      expect(cueView(cue, level, "skipped", false).skipped).toBe(true);
    }
  });

  it("renames a cue without changing its slot and adds the new words as keywords", () => {
    const board = makeBoard();
    const renamed = renameCue(board, "cue-2", "Strong traction");
    expect(renamed.cues[2]).toMatchObject({
      slot: 2,
      label: "Strong traction",
      keywords: ["keyword2", "Strong", "traction"],
    });
    expect(board.cues[2].label).toBe("Cue 2");
    expect(() => renameCue(board, "cue-2", "Too many words to fit")).toThrow(
      Error,
    );
  });
});
