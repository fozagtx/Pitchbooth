// SPDX-License-Identifier: MIT
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, FileUp } from "lucide-react";
import { createSession } from "@/lib/client/deck";
import { Logo } from "@/components/Logo";
import { CueIcon } from "@/components/CueIcon";

const heroCues = [
  { icon: "spark", label: "Nurses drown" },
  { icon: "alert", label: "3 hrs charting" },
  { icon: "wrench", label: "Voice notes" },
  { icon: "chart", label: "$40k MRR" },
  { icon: "flag", label: "Raise $1.5M" },
];

const script =
  "Hi everyone, thanks for having me. So, um, today I want to talk about a problem that, you know, a lot of nurses face every single day, which is that they spend roughly three hours of every shift on charting, and that is basically time that is not spent with patients, and so what we built is...";

type Stage = "idle" | "reading" | "coach";

export default function Home() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const start = useCallback(
    async (file: File) => {
      if (stage !== "idle") return;
      setError(null);
      setStage("reading");
      try {
        const session = await createSession(file, "founder", (next) => setStage(next));
        router.push(`/s/${session.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        setStage("idle");
      }
    },
    [router, stage],
  );

  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files");
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) void start(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [start]);

  const busy = stage !== "idle";

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex h-16 items-center">
        <Logo />
      </header>

      <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-0">
        <div className={`t-stagger max-w-xl ${shown ? "is-shown" : ""}`}>
          <h1 className="t-stagger-line text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            You know your deck. You lose it out loud.
          </h1>
          <p className="t-stagger-line t-stagger-line--2 mt-5 text-lg text-muted">
            Pitchbooth turns your deck into a board you learn, then takes it away.
          </p>
          <div className="t-stagger-line t-stagger-line--3 mt-9">
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void start(file);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="inline-flex h-13 items-center gap-2.5 rounded-full bg-ink px-7 text-base font-medium text-paper transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
            >
              <FileUp aria-hidden className="size-5" />
              {busy ? (
                <span className="t-shimmer [--shimmer-base:#c9c9c4] [--shimmer-highlight:#ffffff]" data-text={stage === "reading" ? "Reading your slides" : "Writing your board"}>
                  {stage === "reading" ? "Reading your slides" : "Writing your board"}
                </span>
              ) : (
                "Upload your deck (PDF)"
              )}
            </button>
            {error ? (
              <p role="alert" className="mt-4 max-w-md text-sm text-[#b4235a]">
                {error}
              </p>
            ) : (
              <p className="mt-4 max-w-md text-sm text-muted">
                Your PDF stays in your browser. Only slide text goes to the coach, and no audio is kept.
              </p>
            )}
          </div>
        </div>

        <HeroVisual />
      </div>

      {dragging ? (
        <div className="pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed border-ink/40 bg-paper/85 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-lg font-medium">
            <ArrowUpRight aria-hidden className="size-5" /> Drop your PDF
          </p>
        </div>
      ) : null}
    </main>
  );
}

function HeroVisual() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[560px] pb-6 lg:pb-0">
      <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:w-[78%]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Script</p>
        <p className="script-blur text-[15px] leading-relaxed text-ink/80">{script}</p>
      </div>
      <div className="board relative -mt-10 ml-auto w-[88%] p-6 sm:-mt-16 sm:p-7">
        <div className="grid grid-cols-2 gap-3">
          {heroCues.map((cue, index) => (
            <div
              key={cue.label}
              className={`flex min-w-0 items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2.5 ${
                index === 2 ? "border-cue text-cue" : "border-chalk/30 text-chalk"
              }`}
            >
              <CueIcon name={cue.icon} className="size-4 shrink-0" />
              <span
                className="hero-cue chalk min-w-0 whitespace-nowrap text-xl leading-tight"
                style={{ ["--write-delay" as string]: `${index * 180}ms` }}
              >
                {cue.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
