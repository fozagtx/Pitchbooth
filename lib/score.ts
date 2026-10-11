import type { Word } from "./tracker";
import { tokenize } from "./text";

export interface Line {
  key: string;
  label: string;
  points: number;
  max: number;
  note: string;
  measured: boolean;
}

export const FILLERS = [
  "um",
  "uh",
  "uhm",
  "erm",
  "er",
  "ah",
  "hmm",
  "you know",
  "i mean",
  "kind of",
  "sort of",
  "basically",
  "literally",
] as const;

const founderRubric = [
  ["opening", "Opening", 10],
  ["traction", "Traction", 10],
  ["problem", "Problem", 8],
  ["solution", "Solution", 8],
  ["market", "Market", 6],
  ["business_model", "Business model", 6],
  ["team", "Team", 6],
  ["ask", "Ask", 6],
] as const;

const schoolRubric = [
  ["thesis", "Thesis", 15],
  ["evidence", "Evidence", 20],
  ["organisation", "Organisation", 15],
  ["conclusion", "Conclusion", 10],
] as const;

const deliveryCoachRubric = [
  ["structure", "Structure", 10],
  ["clarity", "Clarity", 10],
] as const;

const measuredRubric = [
  ["pace", "Pace", 6],
  ["time", "Time", 5],
  ["recovery", "Recovery", 5],
  ["filler", "Filler", 4],
] as const;

function roundOne(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function paceScore(wpm: number): number {
  if (wpm < 90 || wpm > 215) {
    return 0;
  }
  if (wpm <= 130) {
    return roundOne(((wpm - 90) / 40) * 6);
  }
  if (wpm <= 165) {
    return 6;
  }
  return roundOne(((215 - wpm) / 50) * 6);
}

export function timeScore(actualSec: number, targetSec: number): number {
  if (targetSec <= 0) {
    return actualSec === targetSec ? 5 : 0;
  }
  const difference = Math.abs(actualSec - targetSec) / targetSec;
  if (difference <= 0.1) {
    return 5;
  }
  if (difference >= 0.5) {
    return 0;
  }
  return roundOne(((0.5 - difference) / 0.4) * 5);
}

export function recoveryScore(level: number, stalls: number): number {
  const caps: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5 };
  const cap = caps[level] ?? 0;
  return Math.max(0, cap - Math.max(0, stalls));
}

export function fillerCount(words: Word[]): number {
  const tokens = words.flatMap((word) => tokenize(word.text));
  const phrases = FILLERS.map((filler) => tokenize(filler));
  let count = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    for (const phrase of phrases) {
      if (
        phrase.every((token, offset) => tokens[index + offset] === token)
      ) {
        count += 1;
      }
    }
  }

  return count;
}

export function fillerRate(words: Word[]): number {
  return words.length === 0 ? 0 : (fillerCount(words) / words.length) * 100;
}

export function fillerScore(rate: number): number {
  if (rate <= 1) {
    return 4;
  }
  if (rate >= 6) {
    return 0;
  }
  return roundOne(4 - ((rate - 1) / 5) * 4);
}

function coachLines(
  rubric: ReadonlyArray<readonly [string, string, number]>,
  coach: Record<string, { points: number; note: string }>,
): Line[] {
  return rubric.map(([key, label, max]) => {
    const entry = coach[key];
    const points = entry && Number.isFinite(entry.points)
      ? Math.min(max, Math.max(0, entry.points))
      : 0;
    return {
      key,
      label,
      points,
      max,
      note: entry?.note ?? "Not covered",
      measured: false,
    };
  });
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remaining = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export function scoreRun(input: {
  rubric: "founder" | "school";
  coach: Record<string, { points: number; note: string }>;
  words: Word[];
  durationSec: number;
  targetSec: number;
  level: number;
  stalls: number;
}): { total: number; content: Line[]; delivery: Line[] } {
  const rubric =
    input.rubric === "founder" ? founderRubric : schoolRubric;
  const content = coachLines(rubric, input.coach);
  const delivery = coachLines(deliveryCoachRubric, input.coach);
  const wpm = input.durationSec > 0
    ? (input.words.length * 60) / input.durationSec
    : 0;
  const rate = fillerRate(input.words);
  const measured: Line[] = [
    {
      key: "pace",
      label: "Pace",
      points: paceScore(wpm),
      max: 6,
      note: `${Math.round(wpm)} wpm`,
      measured: true,
    },
    {
      key: "time",
      label: "Time",
      points: timeScore(input.durationSec, input.targetSec),
      max: 5,
      note: `${formatDuration(input.durationSec)} of ${formatDuration(input.targetSec)}`,
      measured: true,
    },
    {
      key: "recovery",
      label: "Recovery",
      points: recoveryScore(input.level, input.stalls),
      max: 5,
      note: `${input.stalls} stall${input.stalls === 1 ? "" : "s"} at level ${input.level}`,
      measured: true,
    },
    {
      key: "filler",
      label: "Filler",
      points: fillerScore(rate),
      max: 4,
      note: `${rate.toFixed(1)} fillers per 100 words`,
      measured: true,
    },
  ];
  delivery.push(...measured);
  const total = Math.round(
    [...content, ...delivery].reduce((sum, line) => sum + line.points, 0),
  );

  return {
    total: Math.min(100, Math.max(0, total)),
    content,
    delivery,
  };
}

export function topFixes(lines: Line[], n = 3): Line[] {
  return lines
    .filter((line) => line.max - line.points > 0)
    .sort(
      (a, b) =>
        b.max - b.points - (a.max - a.points) || b.max - a.max,
    )
    .slice(0, Math.max(0, n));
}
