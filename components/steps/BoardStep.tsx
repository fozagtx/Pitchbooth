"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { renameCue, validateBoard } from "@/lib/board";
import type { Rubric } from "@/lib/client/store";
import { Board } from "@/components/Board";
import { Segmented } from "@/components/Segmented";
import type { StepProps } from "./types";

const targets = [180, 300, 420, 600];

export function BoardStep({ session, update, go }: StepProps) {
  const [writeIn, setWriteIn] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setWriteIn(false), session.board.cues.length * 260 + 900);
    return () => window.clearTimeout(timer);
  }, [session.board.cues.length]);

  function rename(id: string, label: string): string | null {
    const next = renameCue(session.board, id, label);
    const errors = validateBoard(next);
    if (errors.length > 0) return "Use one to three words, no full stop.";
    update((s) => ({ ...s, board: next }));
    return null;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section aria-labelledby="board-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="board-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your board
            </h1>
            <p className="mt-1 text-muted">Click a cue to say it in your own words.</p>
          </div>
        </div>
        <Board board={session.board} writeIn={writeIn} onRename={rename} />
      </section>

      <aside className="grid content-start gap-4">
        {session.board.gaps.length > 0 ? (
          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="text-sm font-semibold">Missing from your deck</h2>
            <ul className="mt-3 grid gap-2 text-sm text-ink/80">
              {session.board.gaps.map((gap) => (
                <li key={gap} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-skip" />
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold">Learn these word for word</h2>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Opener</p>
          <p className="mt-1 text-[15px] leading-snug">{session.board.opener}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Closer</p>
          <p className="mt-1 text-[15px] leading-snug">{session.board.closer}</p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold">Grade me as</h2>
          <Segmented<Rubric>
            label="Rubric"
            value={session.rubric}
            onChange={(rubric) => update((s) => ({ ...s, rubric }))}
            options={[
              { value: "founder", label: "Founder pitch" },
              { value: "school", label: "School talk" },
            ]}
          />
          <h2 className="mt-2 text-sm font-semibold">Target time</h2>
          <Segmented<number>
            label="Target time"
            value={session.targetSec}
            onChange={(targetSec) => update((s) => ({ ...s, targetSec }))}
            options={targets.map((sec) => ({ value: sec, label: `${sec / 60} min` }))}
          />
        </div>

        <button
          type="button"
          onClick={() => go("walkthrough")}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-paper transition-transform duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:scale-[1.01] active:scale-[0.98]"
        >
          Start walkthrough <ArrowRight aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => go("run")}
          className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Skip to a timed run
        </button>
      </aside>
    </div>
  );
}
