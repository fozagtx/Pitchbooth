// SPDX-License-Identifier: MIT
"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import type { Line } from "@/lib/score";
import type { LocalSession } from "@/lib/client/store";
import { Board } from "@/components/Board";
import type { Step } from "./types";

function LineRow({ line }: { line: Line }) {
  const share = line.max > 0 ? line.points / line.max : 0;
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3">
      <span className="text-sm font-medium">
        {line.label}
        {line.measured ? <span className="ml-2 text-[11px] font-medium uppercase tracking-wider text-muted">measured</span> : null}
      </span>
      <span className="text-sm tabular-nums text-ink/80">
        {Math.round(line.points)}/{line.max}
      </span>
      <span className="col-span-2 h-1 overflow-hidden rounded-full bg-line">
        <span
          className={`block h-full rounded-full ${share >= 0.7 ? "bg-slate" : share >= 0.4 ? "bg-cue" : "bg-skip"}`}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
      <span className="col-span-2 text-xs text-muted">{line.note}</span>
    </li>
  );
}

export function ScoreStep({ session, go }: { session: LocalSession; go: (step: Step) => void }) {
  const run = session.runs.at(-1)!;
  const previous = session.runs.at(-2);
  const content = run.lines.filter((line) => !["structure", "clarity"].includes(line.key) && !line.measured);
  const delivery = run.lines.filter((line) => ["structure", "clarity"].includes(line.key) || line.measured);
  const change = previous ? run.total - previous.total : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section aria-labelledby="score-title" className="min-w-0">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <h1 id="score-title" className="text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
            {run.total}
            <span className="text-2xl text-muted">/100</span>
          </h1>
          <p className="pb-2 text-muted">
            Run {session.runs.length}, level {run.level}
            {change !== null ? `, ${change >= 0 ? "+" : ""}${change} from last run` : ""}
          </p>
        </div>

        <Board className="mt-6" board={session.board} annotations={run.cues} />

        <div className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Fix these first</h2>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            {run.fixes.map((fix, index) => (
              <li key={fix.line.key} className="rounded-2xl border border-line bg-card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Fix {index + 1}</p>
                <p className="mt-1 font-medium">{fix.line.label}</p>
                <p className="mt-1 text-sm text-muted">{fix.line.note}</p>
                {fix.drill ? (
                  <p className="mt-3 border-t border-line pt-3 text-sm leading-snug">
                    <span className="font-medium">2 minute drill: </span>
                    {fix.drill}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-2xl border border-line bg-card px-5 py-2">
          <h2 className="pt-3 text-sm font-semibold">Content</h2>
          <ul className="divide-y divide-line">{content.map((line) => <LineRow key={line.key} line={line} />)}</ul>
        </div>
        <div className="rounded-2xl border border-line bg-card px-5 py-2">
          <h2 className="pt-3 text-sm font-semibold">Delivery</h2>
          <ul className="divide-y divide-line">{delivery.map((line) => <LineRow key={line.key} line={line} />)}</ul>
        </div>
        <button
          type="button"
          onClick={() => go("run")}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-paper active:scale-[0.98]"
        >
          <RotateCcw aria-hidden className="size-4" /> Run again with less
        </button>
        <button
          type="button"
          onClick={() => go("takeaway")}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-card px-6 font-medium active:scale-[0.98]"
        >
          Takeaway <ArrowRight aria-hidden className="size-4" />
        </button>
      </aside>
    </div>
  );
}
