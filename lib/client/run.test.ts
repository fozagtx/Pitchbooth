import { describe, expect, it } from "vitest";
import type { Board } from "../board";
import type { TrackerState, Word } from "../tracker";
import {
  createRun,
  initialRunState,
  reduceRun,
} from "./run";

const board: Board = {
  cues: [
    ["launch", "Open"],
    ["problem", "Problem"],
    ["product", "Product"],
    ["proof", "Proof"],
    ["close", "Close"],
  ].map(([keyword, act], slot) => ({
    id: `cue-${slot}`,
    slot,
    act,
    label: `${act} cue`,
    icon: "lightbulb",
    section: `${act} section`,
    keywords: [keyword],
  })),
  opener: "Start here",
  closer: "Finish here",
  gaps: [],
};

const emptyTracker: TrackerState = {
  current: null,
  reached: [],
  skipped: [],
  stalls: 0,
  revealed: [],
  wordCount: 0,
  lastWordEnd: null,
};

describe("run state", () => {
  it("replaces repeated word starts and expires a nudge after three seconds", () => {
    const started = reduceRun(board, initialRunState(board), { type: "start" });
    const shown = reduceRun(board, started, {
      type: "sync",
      tracker: emptyTracker,
      words: [{ text: "first", start: 10, end: 20 }],
      elapsedMs: 1000,
      nudge: "Wrap up",
    });
    const updated = reduceRun(board, shown, {
      type: "sync",
      tracker: emptyTracker,
      words: [{ text: "revised", start: 10, end: 25 }],
      elapsedMs: 4000,
      nudge: null,
    });

    expect(updated.words).toEqual([{ text: "revised", start: 10, end: 25 }]);
    expect(updated.nudge).toBeNull();
    expect(shown.words).toEqual([{ text: "first", start: 10, end: 20 }]);
  });

  it("counts a stall once and reveals its cue only at level four", () => {
    const fullBoardRun = createRun(board, { level: 4, targetSec: 30 });
    fullBoardRun.start(0);
    fullBoardRun.tick(4000);
    fullBoardRun.tick(8000);
    expect(fullBoardRun.snapshot()).toMatchObject({
      stalls: 1,
      revealed: [0],
    });

    const hiddenBoardRun = createRun(board, { level: 3, targetSec: 30 });
    hiddenBoardRun.start(0);
    hiddenBoardRun.tick(4000);
    expect(hiddenBoardRun.snapshot()).toMatchObject({
      stalls: 1,
      revealed: [],
    });
  });

  it("tracks skipped and recovered cues and returns the finished transcript", () => {
    const run = createRun(board, { level: 2, targetSec: 60 });
    run.start(0);
    const words: Word[] = [
      { text: "launch", start: 100, end: 200 },
      { text: "close", start: 300, end: 400 },
      { text: "problem", start: 500, end: 600 },
    ];
    run.push(words);

    expect(run.snapshot().cueStates).toMatchObject({
      0: "reached",
      1: "reached",
      2: "skipped",
      3: "skipped",
      4: "current",
    });

    const result = run.finish(1000);
    expect(result).toEqual({
      words,
      durationSec: 1,
      stalls: 0,
      transcript: "launch close problem",
    });
  });

  it("clears a displayed nudge at three seconds", () => {
    const run = createRun(board, { level: 1, targetSec: 30 });
    run.start(0);
    expect(run.tick(25500).nudge).toBe("Wrap up");
    expect(run.tick(28499).nudge).toBe("Wrap up");
    expect(run.tick(28500).nudge).toBeNull();
  });
});
