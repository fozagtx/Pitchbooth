import { fillerRate, scoreRun, topFixes } from "../score";
import type { Cue } from "../board";
import type { Word } from "../tracker";
import {
  GradeOutputSchema,
  WalkthroughOutputSchema,
  type WalkthroughOutput,
} from "../coach";
import type { LocalSession, RunRecord } from "./store";

function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }
  const error = body.error;
  if (typeof error === "string") {
    return error;
  }
  if (Array.isArray(error)) {
    return error.map(String).join(" ");
  }
  return fallback;
}

async function readResult(
  response: Response,
  fallback: string,
): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessage(body, fallback));
  }
  if (!body || typeof body !== "object" || !("result" in body)) {
    throw new Error(fallback);
  }
  return body.result;
}

export async function walkthroughTurn(
  s: LocalSession,
  cue: Cue,
  transcript: string,
  attempt: number,
): Promise<WalkthroughOutput> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eveSessionId: s.eveSessionId,
      kind: "walkthrough",
      payload: { cue, transcript, attempt },
    }),
  });
  const result = await readResult(
    response,
    "The coach could not complete this turn.",
  );
  return WalkthroughOutputSchema.parse(result);
}

export async function gradeRun(
  s: LocalSession,
  input: {
    transcript: string;
    level: number;
    words: Word[];
    durationSec: number;
    stalls: number;
  },
): Promise<RunRecord> {
  const wpm = input.durationSec > 0
    ? (input.words.length * 60) / input.durationSec
    : 0;
  const fillersPer100 = fillerRate(input.words);
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eveSessionId: s.eveSessionId,
      kind: "grade",
      payload: {
        rubric: s.rubric,
        transcript: input.transcript,
        board: s.board,
        targetSec: s.targetSec,
        level: input.level,
        measured: {
          wpm,
          durationSec: input.durationSec,
          stalls: input.stalls,
          fillersPer100,
        },
      },
    }),
  });
  const result = GradeOutputSchema.parse(await readResult(
    response,
    "The coach could not complete this turn.",
  ));
  const score = scoreRun({
    rubric: s.rubric,
    coach: result.coach,
    words: input.words,
    durationSec: input.durationSec,
    targetSec: s.targetSec,
    level: input.level,
    stalls: input.stalls,
  });
  const lines = [...score.content, ...score.delivery];

  return {
    at: new Date().toISOString(),
    level: input.level,
    total: score.total,
    lines,
    fixes: topFixes(lines, 3).map((line) => ({
      line,
      drill: result.drills[line.key] ?? "",
    })),
    cues: result.cues,
    durationSec: input.durationSec,
    stalls: input.stalls,
    wpm,
  };
}
