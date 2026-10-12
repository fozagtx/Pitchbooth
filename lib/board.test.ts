import { describe, expect, it } from "vitest";
import {
  cueView,
  hintFor,
  isValidLabel,
  levelForRun,
  repairBoard,
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

  it("allows decimal points in labels but rejects sentence punctuation", () => {
    const board = makeBoard();
    board.cues[0] = { ...board.cues[0], label: "$1.5M" };
    board.cues[1] = { ...board.cues[1], label: "2.5x growth" };
    expect(validateBoard(board)).toEqual([]);

    for (const label of ["Big win.", "Why?"]) {
      const invalid = makeBoard();
      invalid.cues[0] = { ...invalid.cues[0], label };
      expect(validateBoard(invalid)).toContain(
        "Cue cue-0 labels cannot contain sentence punctuation.",
      );
    }
  });

  it("accepts only cue labels with one to three words", () => {
    expect(isValidLabel("one two three four five six")).toBe(false);
    expect(isValidLabel("Local stays")).toBe(true);
  });

  it("repairs near-valid boards without changing cue count or acts", () => {
    const board = makeBoard();
    const slots = [3, 1, 2, 0, 5];
    board.cues = board.cues.map((cue, index) => ({
      ...cue,
      id: index < 2 ? "duplicate" : cue.id,
      slot: slots[index],
      act: `Act ${index}`,
      label:
        index === 0
          ? "One two three four five."
          : index === 1
            ? "$1.5M!!   growth? now"
            : index === 4
              ? "Open ask"
              : cue.label,
      keywords: index === 4 ? [] : cue.keywords,
    }));
    board.gaps = ["one", "two", "three", "four", "five"];
    const originalCues = board.cues.map((cue) => ({
      ...cue,
      keywords: [...cue.keywords],
    }));
    const originalGaps = [...board.gaps];

    const repaired = repairBoard(board);

    expect(repaired.cues.map((cue) => cue.slot)).toEqual([0, 1, 2, 3, 4]);
    expect(repaired.cues.map((cue) => cue.id)).toEqual([
      "cue-3",
      "duplicate",
      "cue-2",
      "duplicate-3",
      "cue-4",
    ]);
    expect(new Set(repaired.cues.map((cue) => cue.id)).size).toBe(5);
    expect(repaired.cues[3].label).toBe("One two three");
    expect(repaired.cues[1].label).toBe("$1.5M growth now");
    expect(repaired.cues[4].keywords).toEqual(["open ask"]);
    expect(repaired.gaps).toEqual(["one", "two", "three"]);
    expect(repaired.cues.map((cue) => cue.act)).toEqual([
      "Act 3",
      "Act 1",
      "Act 2",
      "Act 0",
      "Act 4",
    ]);
    expect(repaired.cues).toHaveLength(board.cues.length);
    expect(board.cues).toEqual(originalCues);
    expect(board.gaps).toEqual(originalGaps);
  });

  it("sorts tied slots stably and places invalid slots last", () => {
    const board = makeBoard();
    board.cues[0] = { ...board.cues[0], slot: 1 };
    board.cues[1] = { ...board.cues[1], slot: 1 };
    board.cues[2] = { ...board.cues[2], slot: Number.NaN };
    board.cues[3] = { ...board.cues[3], slot: 6 };

    expect(repairBoard(board).cues.map((cue) => cue.id)).toEqual([
      "cue-0",
      "cue-1",
      "cue-4",
      "cue-2",
      "cue-3",
    ]);
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
