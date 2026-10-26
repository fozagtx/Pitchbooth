// SPDX-License-Identifier: MIT
"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cueView, type Board as BoardData, type Cue, type CueState } from "@/lib/board";
import { CueIcon } from "./CueIcon";

export type CueStatus = "landed" | "weak" | "missed";

interface BoardProps {
  board: BoardData;
  level?: number;
  states?: Record<number, CueState>;
  revealed?: number[];
  annotations?: Record<string, { status: CueStatus; note: string }>;
  focusSlot?: number;
  writeIn?: boolean;
  nudge?: string | null;
  onRename?: (id: string, label: string) => string | null;
  onSelect?: (cue: Cue) => void;
  className?: string;
}

export function Board({
  board,
  level = 1,
  states,
  revealed = [],
  annotations,
  focusSlot,
  writeIn = false,
  nudge,
  onRename,
  onSelect,
  className = "",
}: BoardProps) {
  const cues = [...board.cues].sort((a, b) => a.slot - b.slot);

  return (
    <div className={`board p-5 sm:p-8 ${className}`}>
      {nudge ? (
        <p
          key={nudge}
          role="status"
          className="chalk nudge-in pointer-events-none absolute right-6 -top-1 z-10 text-3xl text-cue sm:right-10 sm:top-5 sm:text-4xl"
        >
          {nudge}
        </p>
      ) : null}
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cues.map((cue, index) => (
          <CueSlot
            key={cue.id}
            cue={cue}
            actLabel={index === 0 || cues[index - 1].act !== cue.act ? cue.act : undefined}
            level={level}
            state={states?.[cue.slot] ?? "idle"}
            live={Boolean(states)}
            revealed={revealed.includes(cue.slot)}
            annotation={annotations?.[cue.id]}
            focused={focusSlot === cue.slot}
            writeDelay={writeIn ? cue.slot * 260 : undefined}
            onRename={onRename}
            onSelect={onSelect}
          />
        ))}
      </ol>
    </div>
  );
}

function CueSlot({
  cue,
  actLabel,
  level,
  state,
  live,
  revealed,
  annotation,
  focused,
  writeDelay,
  onRename,
  onSelect,
}: {
  cue: Cue;
  actLabel?: string;
  level: number;
  state: CueState;
  live: boolean;
  revealed: boolean;
  annotation?: { status: CueStatus; note: string };
  focused: boolean;
  writeDelay?: number;
  onRename?: (id: string, label: string) => string | null;
  onSelect?: (cue: Cue) => void;
}) {
  const view = cueView(cue, level, state, revealed);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cue.label);
  const [error, setError] = useState<string | null>(null);

  const current = state === "current" || focused;
  const status = annotation?.status;
  const tone = view.skipped || status === "missed"
    ? "border-skip text-skip"
    : status === "weak"
      ? "border-cue/70 text-cue"
      : current
        ? "border-cue text-cue bg-white/[0.04]"
        : view.lit || state === "reached" || status === "landed"
          ? "border-chalk/60 text-chalk"
          : live
            ? "border-chalk/20 text-chalk/70"
            : "border-chalk/25 text-chalk";
  const empty = !view.text && !view.icon;

  function save() {
    const label = draft.trim().replace(/\s+/g, " ");
    if (label === cue.label) {
      setEditing(false);
      setError(null);
      return;
    }
    const problem = onRename?.(cue.id, label) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    setEditing(false);
    setError(null);
  }

  const body = (
    <>
      <span className="flex min-h-9 items-center gap-3">
        {view.icon ? (
          <CueIcon name={view.icon} className="size-5 shrink-0 opacity-90" />
        ) : null}
        {editing ? (
          <input
            autoFocus
            value={draft}
            aria-label={`Rename ${cue.label}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") {
                setDraft(cue.label);
                setEditing(false);
                setError(null);
              }
            }}
            className="chalk w-full min-w-0 rounded-md bg-white/10 px-2 py-0.5 text-2xl text-chalk outline-none ring-1 ring-cue"
          />
        ) : view.text ? (
          <span
            className={`chalk block min-w-0 truncate text-2xl leading-tight sm:text-[1.7rem] ${writeDelay !== undefined ? "chalk-write" : ""}`}
            style={writeDelay !== undefined ? { ["--write-delay" as string]: `${writeDelay}ms` } : undefined}
          >
            {view.text}
          </span>
        ) : null}
        {status === "landed" ? <Check aria-hidden className="ml-auto size-4 shrink-0" /> : null}
      </span>
      {view.section && !editing ? (
        <span className="mt-1 block truncate text-xs text-chalk-dim">{view.section}</span>
      ) : null}
      {view.skipped ? (
        <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-skip">Skipped</span>
      ) : null}
      {annotation?.note ? (
        <span className="mt-1 block text-xs leading-snug text-chalk/80">{annotation.note}</span>
      ) : null}
      {error ? <span className="mt-1 block text-xs text-skip">{error}</span> : null}
    </>
  );

  const slotClass = `slot block w-full rounded-xl border-2 border-dashed px-4 py-3 text-left ${tone} ${
    empty ? (view.lit ? "border-solid bg-chalk/15" : "min-h-[62px]") : ""
  } ${empty && !view.lit && !view.skipped && !live ? "slot-pulse" : ""}`;

  return (
    <li aria-current={current ? "step" : undefined} data-slot={cue.slot} className="min-w-0">
      <p className="mb-1.5 h-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-chalk-dim">
        {actLabel ?? ""}
      </p>
      {onRename && !editing ? (
        <button
          type="button"
          className={`${slotClass} cursor-text hover:border-chalk/50`}
          onClick={() => {
            setDraft(cue.label);
            setEditing(true);
          }}
          aria-label={`${cue.label}, ${cue.section}. Click to reword`}
        >
          {body}
        </button>
      ) : onSelect ? (
        <button type="button" className={`${slotClass} hover:border-chalk/50`} onClick={() => onSelect(cue)}>
          {body}
        </button>
      ) : (
        <div className={slotClass} aria-label={empty ? `Slot ${cue.slot + 1}` : undefined}>
          {body}
        </div>
      )}
    </li>
  );
}
