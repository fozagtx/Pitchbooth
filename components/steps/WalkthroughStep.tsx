// SPDX-License-Identifier: MIT
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Keyboard, Mic, MicOff } from "lucide-react";
import { renameCue, validateBoard } from "@/lib/board";
import { walkthroughTurn } from "@/lib/client/api";
import { useListener } from "@/hooks/useListener";
import { useSpeaker } from "@/hooks/useSpeaker";
import { Board } from "@/components/Board";
import { OrbView, type CoachState } from "@/components/OrbView";
import type { StepProps } from "./types";

export function WalkthroughStep({ session, update, go }: StepProps) {
  const cues = [...session.board.cues].sort((a, b) => a.slot - b.slot);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const speaker = useSpeaker();
  const busy = useRef(false);
  const levelRef = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const cue = cues[Math.min(index, cues.length - 1)];

  const handleTurn = useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text || busy.current || done) return;
      busy.current = true;
      setThinking(true);
      setError(null);
      setHeard(text);
      try {
        const result = await walkthroughTurn(sessionRef.current, cue, text, attempt);
        if (result.adoptPhrase) {
          try {
            const next = renameCue(sessionRef.current.board, cue.id, result.adoptPhrase);
            if (validateBoard(next).length === 0) update((s) => ({ ...s, board: next }));
          } catch {}
        }
        setReply(result.reply);
        setThinking(false);
        const advance = result.verdict === "next";
        await speaker.speak(result.reply).catch(() => undefined);
        if (advance) {
          setAttempt(1);
          setHeard("");
          if (index >= cues.length - 1) setDone(true);
          else setIndex((value) => value + 1);
        } else {
          setAttempt((value) => value + 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "The coach could not answer.");
      } finally {
        setThinking(false);
        busy.current = false;
      }
    },
    [attempt, cue, cues.length, done, index, speaker, update],
  );

  const listener = useListener({
    onWords: (words) => {
      if (!busy.current) setHeard(words.map((word) => word.text).join(" "));
    },
    onTurn: (transcript) => void handleTurn(transcript),
    onSpeechStart: () => {
      if (speaker.speaking) speaker.stop();
    },
  });
  levelRef.current = listener.level;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") speaker.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speaker]);

  useEffect(() => () => listener.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const listening = listener.status === "listening";
  const state: CoachState = speaker.speaking ? "speaking" : thinking ? "thinking" : listening ? "listening" : "idle";

  function pressOrb() {
    if (speaker.speaking) {
      speaker.stop();
      return;
    }
    if (listener.status === "idle" || listener.status === "error") void listener.start();
  }

  const shownError = error ?? listener.error ?? speaker.error;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section aria-labelledby="walk-title" className="min-w-0">
        <h1 id="walk-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {done ? "Walkthrough done" : `Talk through ${cue.label}`}
        </h1>
        <p className="mt-1 text-muted">
          {done ? "Now pitch it start to finish." : `Cue ${index + 1} of ${cues.length}${attempt > 1 ? `, attempt ${attempt}` : ""}`}
        </p>
        <Board
          className="mt-5"
          board={session.board}
          focusSlot={done ? undefined : cue.slot}
          states={Object.fromEntries(cues.map((item, i) => [item.slot, i < index || done ? "reached" : i === index ? "current" : "idle"]))}
        />
      </section>

      <aside className="grid content-start justify-items-center gap-5 lg:pt-14">
        <OrbView
          state={state}
          onPress={pressOrb}
          getInputVolume={() => levelRef.current}
          getOutputVolume={() => (speaker.speaking ? 0.7 : 0)}
        />

        {listening ? (
          <button
            type="button"
            onClick={() => listener.stop()}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium"
          >
            <MicOff aria-hidden className="size-4" /> Mute
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void listener.start()}
            disabled={listener.status === "connecting"}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium disabled:opacity-60"
          >
            <Mic aria-hidden className="size-4" /> {listener.status === "connecting" ? "Connecting" : "Use microphone"}
          </button>
        )}

        <div className="w-full rounded-2xl border border-line bg-card p-5" aria-live="polite">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Coach</p>
          <p className="mt-1.5 min-h-12 text-[15px] leading-snug">
            {reply ?? "Say this section the way you would on stage. Headphones help the coach not hear itself."}
          </p>
          {heard ? (
            <>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">You</p>
              <p className="mt-1.5 text-sm leading-snug text-ink/70">{heard}</p>
            </>
          ) : null}
        </div>

        {shownError ? (
          <p role="alert" className="w-full text-sm text-[#b4235a]">
            {shownError}
          </p>
        ) : null}

        <form
          className="flex w-full items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const text = typed;
            setTyped("");
            void handleTurn(text);
          }}
        >
          <label className="relative flex-1">
            <span className="sr-only">Type instead</span>
            <Keyboard aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="Or type what you would say"
              disabled={done}
              className="h-11 w-full rounded-full border border-line bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted focus:border-ink/40"
            />
          </label>
          <button
            type="submit"
            disabled={!typed.trim() || thinking || done}
            aria-label="Send"
            className="grid size-11 place-items-center rounded-full bg-ink text-paper disabled:opacity-40"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            listener.stop();
            speaker.stop();
            go("run");
          }}
          className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-medium transition-transform duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] active:scale-[0.98] ${
            done ? "bg-ink text-paper" : "border border-line bg-card text-ink"
          }`}
        >
          Start timed run <ArrowRight aria-hidden className="size-4" />
        </button>
      </aside>
    </div>
  );
}
