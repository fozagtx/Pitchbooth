// SPDX-License-Identifier: MIT
"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { levelForRun } from "@/lib/board";
import { gradeRun } from "@/lib/client/api";
import { useListener } from "@/hooks/useListener";
import { useRun } from "@/hooks/useRun";
import { useSpeaker } from "@/hooks/useSpeaker";
import { Board } from "@/components/Board";
import { Segmented } from "@/components/Segmented";
import { Toggle } from "@/components/Toggle";
import type { StepProps } from "./types";

const levels = [
  { value: 1, label: "Full cues" },
  { value: 2, label: "Hints" },
  { value: 3, label: "Empty slots" },
  { value: 4, label: "Blank" },
];

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function RunStep({ session, update, go }: StepProps) {
  const [level, setLevel] = useState(() => levelForRun(session.runs.length + 1));
  const [spoken, setSpoken] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRun(session.board, { level, targetSec: session.targetSec });
  const speaker = useSpeaker();
  const listener = useListener({ onWords: (words) => run.push(words) });

  const lastSpoken = useRef(-Infinity);
  const pending = useRef<string | null>(null);
  const seenSkipped = useRef(new Set<number>());
  const saidOver = useRef(false);

  useEffect(() => () => listener.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!run.running || !spoken) return;
    for (const cue of session.board.cues) {
      if (run.cueStates[cue.slot] === "skipped" && !seenSkipped.current.has(cue.slot)) {
        seenSkipped.current.add(cue.slot);
        pending.current = `You skipped ${cue.label}.`;
      }
    }
    if (!saidOver.current && run.elapsedMs > session.targetSec * 1000) {
      saidOver.current = true;
      pending.current = "You are over time. Wrap up.";
    }
    const lastWord = run.words.at(-1)?.end ?? 0;
    const paused = run.elapsedMs - lastWord > 1200;
    if (pending.current && paused && run.elapsedMs - lastSpoken.current > 45000 && !speaker.speaking) {
      lastSpoken.current = run.elapsedMs;
      const line = pending.current;
      pending.current = null;
      void speaker.speak(line).catch(() => undefined);
    }
  }, [run.cueStates, run.elapsedMs, run.running, run.words, session.board.cues, session.targetSec, speaker, spoken]);

  async function start() {
    setError(null);
    seenSkipped.current = new Set();
    saidOver.current = false;
    pending.current = null;
    lastSpoken.current = -Infinity;
    try {
      await listener.start();
      run.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the microphone.");
    }
  }

  async function finish() {
    listener.stop();
    speaker.stop();
    const result = run.finish();
    if (result.words.length < 5) {
      setError("We heard almost nothing. Check your microphone and run again.");
      return;
    }
    setGrading(true);
    try {
      const record = await gradeRun(session, {
        transcript: result.transcript,
        level,
        words: result.words,
        durationSec: result.durationSec,
        stalls: result.stalls,
      });
      update((s) => ({ ...s, runs: [...s.runs, record] }));
      go("score");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The coach could not score this run.");
    } finally {
      setGrading(false);
    }
  }

  const over = run.elapsedMs > session.targetSec * 1000;
  const shownError = error ?? listener.error ?? speaker.error;

  return (
    <section aria-labelledby="run-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="run-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {grading ? "Scoring your run" : run.running ? "Go" : `Run ${session.runs.length + 1}`}
          </h1>
          <p className="mt-1 text-muted">
            {run.running
              ? "Pitch start to finish. The board follows you."
              : grading
                ? "The coach is reading your transcript."
                : `Target ${clock(session.targetSec * 1000)}. The coach stays quiet.`}
          </p>
        </div>
        {run.running ? (
          <p
            aria-label="Elapsed time"
            className={`font-mono text-3xl tabular-nums tracking-tight ${over ? "text-[#b4235a]" : "text-ink"}`}
          >
            {clock(run.elapsedMs)}
          </p>
        ) : null}
      </div>

      {!run.running && !grading ? (
        <div className="no-print mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-card p-4">
          <Segmented<number> label="Board level" value={level} onChange={setLevel} options={levels} />
          <Toggle on={spoken} onChange={setSpoken} label="Spoken corrections" />
        </div>
      ) : null}

      <Board
        board={session.board}
        level={level}
        states={run.running ? run.cueStates : undefined}
        revealed={run.revealed}
        nudge={run.running ? run.nudge : null}
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {run.running ? (
          <button
            type="button"
            onClick={() => void finish()}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-medium text-paper active:scale-[0.98]"
          >
            <Square aria-hidden className="size-4 fill-current" /> Finish run
          </button>
        ) : (
          <button
            type="button"
            disabled={grading || listener.status === "connecting"}
            onClick={() => void start()}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-medium text-paper transition-transform duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
          >
            <Play aria-hidden className="size-4 fill-current" />
            {grading ? (
              <span className="t-shimmer [--shimmer-base:#c9c9c4] [--shimmer-highlight:#ffffff]" data-text="Scoring">Scoring</span>
            ) : listener.status === "connecting" ? (
              "Connecting"
            ) : (
              "Start run"
            )}
          </button>
        )}
        {run.running && level === 4 && run.stalls > 0 ? (
          <p className="text-sm text-muted">{run.stalls} stall{run.stalls === 1 ? "" : "s"}</p>
        ) : null}
        {shownError ? (
          <p role="alert" className="text-sm text-[#b4235a]">
            {shownError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
