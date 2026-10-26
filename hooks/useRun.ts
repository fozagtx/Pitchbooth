// SPDX-License-Identifier: MIT
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Board, CueState } from "../lib/board";
import type { Word } from "../lib/tracker";
import { createRun, type RunCompletion } from "../lib/client/run";

export function useRun(
  board: Board,
  opts: { level: number; targetSec: number },
): {
  running: boolean;
  elapsedMs: number;
  cueStates: Record<number, CueState>;
  revealed: number[];
  nudge: string | null;
  stalls: number;
  words: Word[];
  start(): void;
  push(words: Word[]): void;
  finish(): RunCompletion;
} {
  const run = useMemo(
    () => createRun(board, opts),
    [board, opts.level, opts.targetSec],
  );
  const [state, setState] = useState(() => run.snapshot());

  useEffect(() => {
    setState(run.snapshot());
  }, [run]);

  useEffect(() => {
    if (!state.running) {
      return;
    }
    const interval = window.setInterval(() => {
      setState(run.tick(performance.now()));
    }, 250);
    return () => window.clearInterval(interval);
  }, [run, state.running]);

  const start = useCallback(() => {
    run.start(performance.now());
    setState(run.snapshot());
  }, [run]);

  const push = useCallback((words: Word[]) => {
    setState(run.push(words));
  }, [run]);

  const finish = useCallback(() => {
    const result = run.finish(performance.now());
    setState(run.snapshot());
    return result;
  }, [run]);

  return {
    ...state,
    start,
    push,
    finish,
  };
}
