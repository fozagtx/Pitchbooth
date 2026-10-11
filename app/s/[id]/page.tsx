"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { loadSession, updateSession, type LocalSession } from "@/lib/client/store";
import { isSessionId } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { BoardStep } from "@/components/steps/BoardStep";
import { WalkthroughStep } from "@/components/steps/WalkthroughStep";
import { RunStep } from "@/components/steps/RunStep";
import { ScoreStep } from "@/components/steps/ScoreStep";
import { TakeawayStep } from "@/components/steps/TakeawayStep";

import type { Step } from "@/components/steps/types";

const steps: { id: Step; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "run", label: "Run" },
  { id: "score", label: "Score" },
  { id: "takeaway", label: "Takeaway" },
];

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<LocalSession | null | undefined>(undefined);
  const [step, setStep] = useState<Step>("board");

  useEffect(() => {
    const loaded = isSessionId(id) ? loadSession(id) : null;
    setSession(loaded);
    if (loaded && loaded.runs.length > 0) setStep("score");
  }, [id]);

  const update = useCallback(
    (fn: (s: LocalSession) => LocalSession) => {
      const next = updateSession(id, fn);
      if (next) setSession(next);
    },
    [id],
  );

  if (session === undefined) return null;

  if (session === null) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex h-16 items-center">
          <Logo />
        </header>
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">This session is not in this browser.</h1>
            <p className="mt-2 text-muted">Sessions live in the browser that created them.</p>
            <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-paper">
              Upload your deck
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const hasRuns = session.runs.length > 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 pb-16 sm:px-8">
      <header className="no-print flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Steps" className="-mr-2 overflow-x-auto">
          <ol className="flex gap-1 rounded-full bg-[#f0efe9] p-1">
            {steps.map((item) => {
              const disabled = (item.id === "score" || item.id === "takeaway") && !hasRuns;
              const active = item.id === step;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-current={active ? "step" : undefined}
                    onClick={() => setStep(item.id)}
                    className={`h-8 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] sm:px-4 ${
                      active ? "bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-muted hover:text-ink"
                    } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <div className="flex-1 pt-6 sm:pt-8">
        {step === "board" ? <BoardStep session={session} update={update} go={setStep} /> : null}
        {step === "walkthrough" ? <WalkthroughStep session={session} update={update} go={setStep} /> : null}
        {step === "run" ? <RunStep session={session} update={update} go={setStep} /> : null}
        {step === "score" && hasRuns ? <ScoreStep session={session} go={setStep} /> : null}
        {step === "takeaway" && hasRuns ? <TakeawayStep session={session} /> : null}
      </div>
    </main>
  );
}
