// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { createTracker } from "./tracker";
import type { Cue } from "./board";

const cues: Cue[] = [
  {
    id: "market",
    slot: 0,
    act: "Open",
    label: "Market leader",
    icon: "star",
    section: "Opening",
    keywords: ["market leader"],
  },
  {
    id: "product",
    slot: 1,
    act: "Product",
    label: "Product design",
    icon: "star",
    section: "Product",
    keywords: ["product design"],
  },
  {
    id: "ask",
    slot: 2,
    act: "Close",
    label: "The ask",
    icon: "star",
    section: "Close",
    keywords: ["ask"],
  },
];

describe("tracker", () => {
  it("deduplicates partial re-sends and recovers skipped cues from consecutive keywords", () => {
    const tracker = createTracker(cues);
    tracker.push([{ text: "Ask", start: 0, end: 50 }]);
    expect(tracker.tick(50)).toEqual([
      { type: "skipped", slot: 0 },
      { type: "skipped", slot: 1 },
      { type: "reached", slot: 2 },
    ]);

    tracker.push([{ text: "produ", start: 100, end: 120 }]);
    tracker.push([{ text: "product", start: 100, end: 130 }]);
    tracker.push([{ text: "design", start: 150, end: 180 }]);
    expect(tracker.tick(180)).toEqual([{ type: "recovered", slot: 1 }]);

    tracker.push([
      { text: "market", start: 200, end: 230 },
      { text: "leader", start: 240, end: 270 },
    ]);
    expect(tracker.tick(270)).toEqual([{ type: "recovered", slot: 0 }]);
    expect(tracker.state()).toMatchObject({
      current: 2,
      reached: [0, 1, 2],
      skipped: [],
      wordCount: 5,
      lastWordEnd: 270,
    });
  });

  it("emits one stall per silence and none after the final cue is reached", () => {
    const tracker = createTracker(cues.slice(0, 2), { stallMs: 4000 });
    expect(tracker.tick(3999)).toEqual([]);
    expect(tracker.tick(4000)).toEqual([
      { type: "stall", slot: 0, atMs: 4000 },
    ]);
    expect(tracker.tick(8000)).toEqual([]);

    tracker.push([
      { text: "market", start: 5000, end: 5050 },
      { text: "leader", start: 5050, end: 5100 },
    ]);
    expect(tracker.tick(5100)).toEqual([{ type: "reached", slot: 0 }]);
    expect(tracker.tick(9100)).toEqual([
      { type: "stall", slot: 1, atMs: 9100 },
    ]);

    tracker.push([{ text: "product design", start: 9200, end: 9300 }]);
    expect(tracker.tick(9300)).toEqual([{ type: "reached", slot: 1 }]);
    expect(tracker.tick(14000)).toEqual([]);
    expect(tracker.state()).toMatchObject({
      current: 1,
      stalls: 2,
      revealed: [0, 1],
    });
  });
});
