import { describe, expect, it } from "vitest";
import { downsample, floatTo16BitPcm, turnToWords } from "./stt";

describe("speech helpers", () => {
  it("converts AssemblyAI Turn words and offsets their timestamps", () => {
    expect(turnToWords({
      type: "Turn",
      end_of_turn: false,
      words: [
        { text: "Hello", start: 10, end: 200, word_is_final: false },
        { text: "again", start: 210, end: 400, word_is_final: false },
      ],
    }, 5000)).toEqual([
      { text: "Hello", start: 5010, end: 5200 },
      { text: "again", start: 5210, end: 5400 },
    ]);

    expect(turnToWords({
      type: "Turn",
      end_of_turn: true,
      words: [
        { text: "Hello", start: 10, end: 200, word_is_final: true },
        { text: "again", start: 210, end: 400, word_is_final: false },
      ],
    }, 0)).toEqual([{ text: "Hello", start: 10, end: 200 }]);

    expect(turnToWords({ type: "Begin" }, 0)).toEqual([]);
  });

  it("converts float samples to signed 16-bit PCM with clipping", () => {
    expect([...floatTo16BitPcm(new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]))])
      .toEqual([-32768, -32768, -16384, 0, 16384, 32767, 32767]);
  });

  it("averages source samples into the 16 kHz rate", () => {
    expect([...downsample(
      new Float32Array([0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5]),
      32000,
      16000,
    )]).toEqual([0.25, 0.75, -0.25, -0.75]);
  });
});
