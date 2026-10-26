// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import {
  fillerCount,
  fillerRate,
  fillerScore,
  paceScore,
  recoveryScore,
  scoreRun,
  timeScore,
  topFixes,
} from "./score";
import type { Word } from "./tracker";

describe("scoring", () => {
  it("scores pace and time at their boundaries and rounds to one decimal", () => {
    expect([90, 110, 130, 165, 190, 215, 216].map(paceScore)).toEqual([
      0, 3, 6, 6, 3, 0, 0,
    ]);
    expect(timeScore(330, 300)).toBe(5);
    expect(timeScore(399, 300)).toBe(2.1);
    expect(timeScore(450, 300)).toBe(0);
  });

  it("caps recovery by level and counts filler phrases as one item", () => {
    const words: Word[] = [
      { text: "um", start: 0, end: 1 },
      { text: "you", start: 2, end: 3 },
      { text: "know,", start: 4, end: 5 },
      { text: "kind", start: 6, end: 7 },
      { text: "of", start: 8, end: 9 },
      { text: "basically.", start: 10, end: 11 },
      { text: "er", start: 12, end: 13 },
      ...Array.from({ length: 93 }, (_, index) => ({
        text: "clear",
        start: 14 + index * 2,
        end: 15 + index * 2,
      })),
    ];

    expect(recoveryScore(1, 0)).toBe(2);
    expect(recoveryScore(4, 2)).toBe(3);
    expect(recoveryScore(4, 9)).toBe(0);
    expect(fillerCount(words)).toBe(5);
    expect(fillerRate(words)).toBe(5);
    expect([1, 3.5, 6].map(fillerScore)).toEqual([4, 2, 0]);
  });

  it("builds rubric lines, clamps coach points, and derives measured notes", () => {
    const words: Word[] = Array.from({ length: 108 }, (_, index) => ({
      text: "clear",
      start: index * 500,
      end: index * 500 + 250,
    }));
    const result = scoreRun({
      rubric: "school",
      coach: {
        thesis: { points: 50, note: "Strong claim" },
        evidence: { points: 10, note: "Add sources" },
        structure: { points: 10, note: "Easy to follow" },
        clarity: { points: 8, note: "Concise" },
      },
      words,
      durationSec: 65,
      targetSec: 60,
      level: 2,
      stalls: 1,
    });

    expect(result.content).toEqual([
      {
        key: "thesis",
        label: "Thesis",
        points: 15,
        max: 15,
        note: "Strong claim",
        measured: false,
      },
      {
        key: "evidence",
        label: "Evidence",
        points: 10,
        max: 20,
        note: "Add sources",
        measured: false,
      },
      {
        key: "organisation",
        label: "Organisation",
        points: 0,
        max: 15,
        note: "Not covered",
        measured: false,
      },
      {
        key: "conclusion",
        label: "Conclusion",
        points: 0,
        max: 10,
        note: "Not covered",
        measured: false,
      },
    ]);
    expect(result.delivery.map(({ key, note }) => [key, note])).toEqual([
      ["structure", "Easy to follow"],
      ["clarity", "Concise"],
      ["pace", "100 wpm"],
      ["time", "1:05 of 1:00"],
      ["recovery", "1 stall at level 2"],
      ["filler", "0.0 fillers per 100 words"],
    ]);
    expect(
      scoreRun({
        rubric: "school",
        coach: {},
        words: [],
        durationSec: 0,
        targetSec: 60,
        level: 3,
        stalls: 2,
      }).delivery.find(({ key }) => key === "recovery")?.note,
    ).toBe("2 stalls at level 3");
    expect(result.total).toBe(56);
    expect(result.delivery.slice(2).every((line) => line.measured)).toBe(true);
  });

  it("ranks top fixes by gap, then by the larger maximum", () => {
    const lines = [
      { key: "a", label: "A", points: 5, max: 10, note: "", measured: false },
      { key: "b", label: "B", points: 15, max: 20, note: "", measured: false },
      { key: "c", label: "C", points: 2, max: 8, note: "", measured: false },
      { key: "d", label: "D", points: 10, max: 10, note: "", measured: false },
    ];
    expect(topFixes(lines, 3).map((line) => line.key)).toEqual(["c", "b", "a"]);
    expect(topFixes(lines, 1).map((line) => line.key)).toEqual(["c"]);
  });
});
