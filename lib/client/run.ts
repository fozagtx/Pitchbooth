import type { Board, CueState } from "../board";
import { createNudger } from "../nudges";
import {
  createTracker,
  type TrackerState,
  type Word,
} from "../tracker";

export interface RunSnapshot {
  running: boolean;
  elapsedMs: number;
  cueStates: Record<number, CueState>;
  revealed: number[];
  nudge: string | null;
  stalls: number;
  words: Word[];
}

export interface RunState extends RunSnapshot {
  nudgeAtMs: number | null;
}

type RunAction =
  | { type: "start" }
  | {
      type: "sync";
      tracker: TrackerState;
      words: Word[];
      elapsedMs: number;
      nudge: string | null | undefined;
    }
  | {
      type: "finish";
      tracker: TrackerState;
      words: Word[];
      elapsedMs: number;
    };

export interface RunCompletion {
  words: Word[];
  durationSec: number;
  stalls: number;
  transcript: string;
}

function idleCueStates(board: Board): Record<number, CueState> {
  return Object.fromEntries(board.cues.map((cue) => [cue.slot, "idle"]));
}

function cueStatesFromTracker(
  board: Board,
  tracker: TrackerState,
): Record<number, CueState> {
  const cueStates = idleCueStates(board);
  for (const slot of tracker.reached) {
    cueStates[slot] = "reached";
  }
  for (const slot of tracker.skipped) {
    cueStates[slot] = "skipped";
  }
  if (tracker.current !== null) {
    cueStates[tracker.current] = "current";
  }
  return cueStates;
}

export function initialRunState(board: Board): RunState {
  return {
    running: false,
    elapsedMs: 0,
    cueStates: idleCueStates(board),
    revealed: [],
    nudge: null,
    stalls: 0,
    words: [],
    nudgeAtMs: null,
  };
}

export function reduceRun(
  board: Board,
  state: RunState,
  action: RunAction,
): RunState {
  if (action.type === "start") {
    return {
      running: true,
      elapsedMs: 0,
      cueStates: idleCueStates(board),
      revealed: [],
      nudge: null,
      stalls: 0,
      words: [],
      nudgeAtMs: null,
    };
  }
  if (!state.running) {
    return state;
  }

  const mergedWords = new Map(state.words.map((word) => [word.start, word]));
  for (const word of action.words) {
    mergedWords.set(word.start, word);
  }
  let nudge = state.nudge;
  let nudgeAtMs = state.nudgeAtMs;
  if (action.type === "sync" && action.nudge) {
    nudge = action.nudge;
    nudgeAtMs = action.elapsedMs;
  } else if (
    nudgeAtMs !== null &&
    action.elapsedMs - nudgeAtMs >= 3000
  ) {
    nudge = null;
    nudgeAtMs = null;
  }

  const next: RunState = {
    running: action.type !== "finish",
    elapsedMs: Math.max(state.elapsedMs, action.elapsedMs),
    cueStates: cueStatesFromTracker(board, action.tracker),
    revealed: [...action.tracker.revealed],
    nudge,
    stalls: action.tracker.stalls,
    words: [...mergedWords.values()].sort((a, b) => a.start - b.start),
    nudgeAtMs,
  };
  return next;
}

export function createRun(
  board: Board,
  opts: { level: number; targetSec: number },
): {
  start(atMs?: number): void;
  push(words: Word[]): RunSnapshot;
  tick(nowMs: number): RunSnapshot;
  finish(nowMs: number): RunCompletion;
  snapshot(): RunSnapshot;
} {
  let tracker = createTracker(board.cues);
  let nudger = createNudger({ targetSec: opts.targetSec });
  let startedAtMs = 0;
  let state = initialRunState(board);

  function snapshot(): RunSnapshot {
    return {
      running: state.running,
      elapsedMs: state.elapsedMs,
      cueStates: { ...state.cueStates },
      revealed: opts.level === 4 ? [...state.revealed] : [],
      nudge: state.nudge,
      stalls: state.stalls,
      words: [...state.words],
    };
  }

  function sync(
    type: "sync" | "finish",
    words: Word[],
    elapsedMs: number,
    nudge?: string | null,
  ): void {
    const trackerState = tracker.state();
    state = reduceRun(board, state, type === "sync"
      ? { type, tracker: trackerState, words, elapsedMs, nudge }
      : { type, tracker: trackerState, words, elapsedMs });
  }

  return {
    start(atMs = 0) {
      startedAtMs = atMs;
      tracker = createTracker(board.cues);
      nudger = createNudger({ targetSec: opts.targetSec });
      state = reduceRun(board, state, { type: "start" });
    },

    push(words) {
      if (!state.running) {
        return snapshot();
      }
      tracker.push(words);
      sync("sync", words, state.elapsedMs);
      return snapshot();
    },

    tick(nowMs) {
      if (!state.running) {
        return snapshot();
      }
      const elapsedMs = Math.max(0, nowMs - startedAtMs);
      tracker.tick(elapsedMs);
      const nudge = nudger.evaluate(state.words, elapsedMs);
      sync("sync", [], elapsedMs, nudge);
      return snapshot();
    },

    finish(nowMs) {
      if (state.running) {
        const elapsedMs = Math.max(0, nowMs - startedAtMs);
        tracker.tick(elapsedMs);
        sync("finish", [], elapsedMs);
      }
      const current = snapshot();
      return {
        words: current.words,
        durationSec: current.elapsedMs / 1000,
        stalls: current.stalls,
        transcript: current.words.map((word) => word.text).join(" "),
      };
    },

    snapshot,
  };
}
