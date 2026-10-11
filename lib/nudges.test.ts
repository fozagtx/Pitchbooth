import { describe, expect, it } from "vitest";
import { createNudger, wpm } from "./nudges";
import type { Word } from "./tracker";

describe("nudges", () => {
  it("prioritizes time cues and enforces the 20 second throttle", () => {
    const words: Word[] = Array.from({ length: 60 }, (_, index) => ({
      text: "word",
      start: 170000 + index * 10,
      end: 170010 + index * 10,
    }));
    const nudger = createNudger({ targetSec: 200 });

    expect(nudger.evaluate([], 169999)).toBeNull();
    expect(nudger.evaluate(words, 170000)).toBe("Wrap up");
    expect(nudger.evaluate(words, 189999)).toBeNull();
    expect(nudger.evaluate(words, 190000)).toBe("Slower");
    expect(nudger.evaluate(words, 200000)).toBe("Over time");
    expect(nudger.evaluate(words, 201000)).toBeNull();
  });

  it("repeats Slower after the throttle interval", () => {
    const words: Word[] = Array.from({ length: 400 }, (_, index) => ({
      text: "word",
      start: index * 300,
      end: index * 300 + 100,
    }));
    const nudger = createNudger({ targetSec: 120 });

    expect(nudger.evaluate(words, 20000)).toBe("Slower");
    expect(nudger.evaluate(words, 39999)).toBeNull();
    expect(nudger.evaluate(words, 40000)).toBe("Slower");
  });

  it("counts word starts in the half-open WPM interval", () => {
    const words: Word[] = [
      { text: "one", start: 0, end: 1 },
      { text: "two", start: 9999, end: 10000 },
      { text: "three", start: 10000, end: 10001 },
    ];
    expect(wpm(words, 0, 10000)).toBe(12);
  });
});
