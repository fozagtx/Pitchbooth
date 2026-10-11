import type { Cue } from "./board";
import { tokenize } from "./text";

export interface Word {
  text: string;
  start: number;
  end: number;
}

export type TrackerEvent =
  | { type: "reached"; slot: number }
  | { type: "skipped"; slot: number }
  | { type: "recovered"; slot: number }
  | { type: "stall"; slot: number; atMs: number };

export interface TrackerState {
  current: number | null;
  reached: number[];
  skipped: number[];
  stalls: number;
  revealed: number[];
  wordCount: number;
  lastWordEnd: number | null;
}

export interface Tracker {
  push(words: Word[]): void;
  tick(nowMs: number): TrackerEvent[];
  state(): TrackerState;
}

export function createTracker(
  cues: Cue[],
  opts: { stallMs?: number } = {},
): Tracker {
  const stallMs = opts.stallMs ?? 4000;
  const sortedCues = [...cues].sort((a, b) => a.slot - b.slot);
  const wordsByStart = new Map<number, Word>();
  const hitSlots = new Set<number>();
  const skippedSlots = new Set<number>();
  const revealedSlots = new Set<number>();
  const pendingEvents: TrackerEvent[] = [];
  let activityVersion = 0;
  let lastStallVersion: number | null = null;
  let stalls = 0;

  function orderedWords(): Word[] {
    return [...wordsByStart.values()].sort((a, b) => a.start - b.start);
  }

  function matchesCue(cue: Cue, tokens: string[]): boolean {
    return cue.keywords.some((keyword) => {
      const phrase = tokenize(keyword);
      if (phrase.length === 0) {
        return false;
      }
      return tokens.some((_, index) =>
        phrase.every((token, offset) => tokens[index + offset] === token),
      );
    });
  }

  function currentSlot(): number | null {
    return hitSlots.size === 0 ? null : Math.max(...hitSlots);
  }

  function lastWordEnd(): number | null {
    return wordsByStart.size === 0
      ? null
      : Math.max(...[...wordsByStart.values()].map((word) => word.end));
  }

  return {
    push(incomingWords) {
      let changed = false;
      for (const word of incomingWords) {
        const previous = wordsByStart.get(word.start);
        if (
          !previous ||
          previous.text !== word.text ||
          previous.end !== word.end
        ) {
          wordsByStart.set(word.start, word);
          changed = true;
        }
      }
      if (changed) {
        activityVersion += 1;
      }

      const tokens = orderedWords().flatMap((word) => tokenize(word.text));
      const newlyHit = sortedCues
        .filter((cue) => !hitSlots.has(cue.slot) && matchesCue(cue, tokens))
        .map((cue) => cue.slot);
      const newlyHitSet = new Set(newlyHit);

      for (const slot of newlyHit) {
        for (const cue of sortedCues) {
          if (
            cue.slot >= slot ||
            hitSlots.has(cue.slot) ||
            newlyHitSet.has(cue.slot) ||
            skippedSlots.has(cue.slot)
          ) {
            continue;
          }
          skippedSlots.add(cue.slot);
          pendingEvents.push({ type: "skipped", slot: cue.slot });
        }

        if (skippedSlots.delete(slot)) {
          pendingEvents.push({ type: "recovered", slot });
        } else {
          pendingEvents.push({ type: "reached", slot });
        }
        hitSlots.add(slot);
      }
    },

    tick(nowMs) {
      const events = pendingEvents.splice(0);
      const end = lastWordEnd();
      const elapsed = nowMs - (end ?? 0);
      const current = currentSlot();
      const finalSlot = sortedCues.at(-1)?.slot;
      const stallReady =
        end === null ? nowMs >= stallMs : elapsed >= stallMs;

      if (
        stallReady &&
        lastStallVersion !== activityVersion &&
        sortedCues.length > 0 &&
        (current === null || current < (finalSlot ?? 0))
      ) {
        const slot = current === null ? 0 : current + 1;
        stalls += 1;
        revealedSlots.add(slot);
        lastStallVersion = activityVersion;
        events.push({ type: "stall", slot, atMs: nowMs });
      }

      return events;
    },

    state() {
      const reached = [...hitSlots].sort((a, b) => a - b);
      return {
        current: currentSlot(),
        reached,
        skipped: [...skippedSlots].sort((a, b) => a - b),
        stalls,
        revealed: [...revealedSlots],
        wordCount: wordsByStart.size,
        lastWordEnd: lastWordEnd(),
      };
    },
  };
}
