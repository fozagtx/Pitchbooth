"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { AgentState } from "./ui/orb";

const Orb = dynamic(() => import("./ui/orb").then((mod) => mod.Orb), { ssr: false });

export type CoachState = "idle" | "listening" | "thinking" | "speaking";

const labels: Record<CoachState, string> = {
  idle: "Tap to start",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function OrbView({
  state,
  onPress,
  getInputVolume,
  getOutputVolume,
}: {
  state: CoachState;
  onPress: () => void;
  getInputVolume?: () => number;
  getOutputVolume?: () => number;
}) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(hasWebGL()), []);

  const agentState: AgentState =
    state === "listening" ? "listening" : state === "thinking" ? "thinking" : state === "speaking" ? "talking" : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onPress}
        aria-label={state === "speaking" ? "Interrupt the coach" : state === "idle" ? "Start talking" : labels[state]}
        className="relative size-52 rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_40px_rgba(31,42,38,0.14)] transition-transform duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:scale-[1.02] active:scale-[0.98] sm:size-60"
      >
        {webgl ? (
          <span className="absolute inset-2 overflow-hidden rounded-full">
            <Orb
              colors={["#F2D16B", "#9FB8AC"]}
              agentState={agentState}
              getInputVolume={getInputVolume}
              getOutputVolume={getOutputVolume}
            />
          </span>
        ) : (
          <span
            aria-hidden
            className={`absolute inset-6 rounded-full bg-slate transition-transform duration-[var(--duration-slow)] ${
              state === "speaking" ? "scale-105" : state === "listening" ? "scale-100" : "scale-95"
            }`}
          />
        )}
      </button>
      <p aria-live="polite" className="text-sm font-medium text-muted">
        {state === "thinking" ? <span className="t-shimmer" data-text={labels[state]}>{labels[state]}</span> : labels[state]}
      </p>
    </div>
  );
}
