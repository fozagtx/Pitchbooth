"use client";

import { Printer } from "lucide-react";
import { practicePlan } from "@/lib/takeaway";
import type { LocalSession } from "@/lib/client/store";
import { Board } from "@/components/Board";

export function TakeawayStep({ session }: { session: LocalSession }) {
  const latest = session.runs.at(-1);
  const plan = practicePlan(new Date());

  return (
    <article className="mx-auto max-w-4xl print:max-w-none">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your takeaway</h1>
          <p className="mt-1 text-muted">One page. Print it or keep this tab.</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper"
        >
          <Printer aria-hidden className="size-4" /> Print
        </button>
      </div>

      <Board className="mt-6 print:mt-4 print:p-5" board={session.board} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 print:mt-4 print:gap-3">
        <div className="rounded-2xl border border-line bg-card p-5 print:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">First line</p>
          <p className="mt-1 leading-snug">{session.board.opener}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Last line</p>
          <p className="mt-1 leading-snug">{session.board.closer}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 print:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Practice plan</p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {plan.map((item) => (
              <li key={item.label} className="grid grid-cols-[110px_1fr] gap-2">
                <span className="font-medium">{item.label}</span>
                <span className="text-ink/75">{item.task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {latest && latest.fixes.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-line bg-card p-5 print:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Your fixes</p>
          <ol className="mt-2 grid gap-3 sm:grid-cols-3">
            {latest.fixes.map((fix) => (
              <li key={fix.line.key} className="text-sm">
                <p className="font-medium">{fix.line.label}</p>
                <p className="mt-0.5 leading-snug text-ink/75">{fix.drill || fix.line.note}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-line bg-card p-5 print:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Runs this session</p>
        <ol className="mt-2 flex flex-wrap gap-2 text-sm">
          {session.runs.map((run, index) => (
            <li key={run.at} className="rounded-full bg-[#f0efe9] px-3 py-1 tabular-nums">
              Run {index + 1}: {run.total}, level {run.level}
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
