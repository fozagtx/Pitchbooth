import { describe, expect, it } from "vitest";
import type { Board } from "../board";
import type { Line } from "../score";
import {
  loadSession,
  saveSession,
  updateSession,
  type LocalSession,
} from "./store";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

class QuotaOnceStorage extends MemoryStorage {
  private failed = false;

  override setItem(key: string, value: string): void {
    if (!this.failed) {
      this.failed = true;
      throw new DOMException("Storage is full", "QuotaExceededError");
    }
    super.setItem(key, value);
  }
}

const board: Board = {
  cues: Array.from({ length: 5 }, (_, slot) => ({
    id: `cue-${slot}`,
    slot,
    act: ["Open", "Problem", "Product", "Proof", "Close"][slot],
    label: `Cue ${slot}`,
    icon: "lightbulb",
    section: "Section",
    keywords: [`keyword-${slot}`],
  })),
  opener: "Opening line",
  closer: "Closing line",
  gaps: [],
};

const contentLine: Line = {
  key: "opening",
  label: "Opening",
  points: 8,
  max: 10,
  note: "Clear",
  measured: false,
};

const session: LocalSession = {
  id: "session-123",
  createdAt: "2026-10-11T14:00:00.000Z",
  rubric: "founder",
  targetSec: 300,
  eveSessionId: "eve-session",
  board,
  slides: [{
    index: 0,
    text: "A slide title",
    preview: "data:image/jpeg;base64,thumbnail",
  }],
  runs: [{
    at: "2026-10-11T14:05:00.000Z",
    level: 1,
    total: 84,
    lines: [contentLine],
    fixes: [{ line: contentLine, drill: "Practice the opener" }],
    cues: {
      "cue-0": { status: "landed", note: "Clear" },
    },
    durationSec: 300,
    stalls: 1,
    wpm: 145,
  }],
};

describe("local session storage", () => {
  it("stores and loads a session under its namespaced key", () => {
    const storage = new MemoryStorage();

    saveSession(session, storage);

    expect(storage.key(0)).toBe("pitchbooth:session-123");
    expect(loadSession(session.id, storage)).toEqual(session);
  });

  it("returns null for absent or malformed session data", () => {
    const storage = new MemoryStorage();
    storage.setItem("pitchbooth:session-123", "{");

    expect(loadSession("missing", storage)).toBeNull();
    expect(loadSession(session.id, storage)).toBeNull();
  });

  it("persists the value returned by an update callback", () => {
    const storage = new MemoryStorage();
    saveSession(session, storage);

    const updated = updateSession(
      session.id,
      (current) => ({ ...current, targetSec: 420 }),
      storage,
    );

    expect(updated?.targetSec).toBe(420);
    expect(loadSession(session.id, storage)?.targetSec).toBe(420);
  });

  it("drops slide previews and retries after a quota error", () => {
    const storage = new QuotaOnceStorage();

    saveSession(session, storage);

    const saved = JSON.parse(
      storage.getItem("pitchbooth:session-123") ?? "null",
    ) as LocalSession;
    expect(saved.slides[0].preview).toBe("");
    expect(saved.runs).toEqual(session.runs);
  });
});
