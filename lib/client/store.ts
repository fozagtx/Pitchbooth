import type { Board } from "../board";
import type { Line } from "../score";

export type Rubric = "founder" | "school";

export interface SlideInfo {
  index: number;
  text: string;
  preview: string;
}

export interface RunRecord {
  at: string;
  level: number;
  total: number;
  lines: Line[];
  fixes: { line: Line; drill: string }[];
  cues: Record<string, {
    status: "landed" | "weak" | "missed";
    note: string;
  }>;
  durationSec: number;
  stalls: number;
  wpm: number;
}

export interface LocalSession {
  id: string;
  createdAt: string;
  rubric: Rubric;
  targetSec: number;
  eveSessionId: string;
  board: Board;
  slides: SlideInfo[];
  runs: RunRecord[];
}

function sessionKey(id: string): string {
  return `pitchbooth:${id}`;
}

function getStorage(storage?: Storage): Storage {
  if (storage) {
    return storage;
  }
  if (typeof window === "undefined") {
    throw new Error("Local session storage is only available in the browser.");
  }
  return window.localStorage;
}

function isLocalSession(value: unknown, id: string): value is LocalSession {
  if (!value || typeof value !== "object") {
    return false;
  }
  const session = value as Partial<LocalSession>;
  return session.id === id &&
    typeof session.createdAt === "string" &&
    (session.rubric === "founder" || session.rubric === "school") &&
    typeof session.targetSec === "number" &&
    typeof session.eveSessionId === "string" &&
    !!session.board &&
    Array.isArray(session.slides) &&
    Array.isArray(session.runs);
}

function isQuotaExceeded(error: unknown): boolean {
  return !!error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "QuotaExceededError";
}

export function loadSession(
  id: string,
  storage?: Storage,
): LocalSession | null {
  const value = getStorage(storage).getItem(sessionKey(id));
  if (value === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return isLocalSession(parsed, id) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(s: LocalSession, storage?: Storage): void {
  const target = getStorage(storage);
  const key = sessionKey(s.id);
  const value = JSON.stringify(s);

  try {
    target.setItem(key, value);
  } catch (error) {
    if (!isQuotaExceeded(error)) {
      throw error;
    }
    const withoutPreviews: LocalSession = {
      ...s,
      slides: s.slides.map((slide) => ({ ...slide, preview: "" })),
    };
    target.setItem(key, JSON.stringify(withoutPreviews));
  }
}

export function updateSession(
  id: string,
  fn: (s: LocalSession) => LocalSession,
  storage?: Storage,
): LocalSession | null {
  const current = loadSession(id, storage);
  if (!current) {
    return null;
  }
  const updated = fn(current);
  saveSession(updated, storage);
  return updated;
}
