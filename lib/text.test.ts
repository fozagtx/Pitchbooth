// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { normalizeWord, stripDashes, tokenize } from "./text";

describe("text normalization", () => {
  it("strips punctuation while preserving digits, dollar signs, and percent signs", () => {
    expect(normalizeWord("$2M%")).toBe("$2m%");
    expect(normalizeWord("Founder’s!")).toBe("founder");
    expect(normalizeWord("it's")).toBe("it");
    expect(normalizeWord("tested")).toBe("test");
    expect(normalizeWord("running")).toBe("runn");
  });

  it("tokenizes text into normalized non-empty words", () => {
    expect(tokenize("You know, $2M ARR! ...")).toEqual([
      "you",
      "know",
      "$2m",
      "arr",
    ]);
  });

  it("replaces dashes in strings, nested objects, and arrays", () => {
    expect(stripDashes("EHR \u2014 and")).toBe("EHR, and");
    expect(stripDashes("12\u201314")).toBe("12-14");
    expect(stripDashes({
      details: {
        examples: ["EHR \u2014 and", { range: "12\u201314" }],
      },
    })).toEqual({
      details: {
        examples: ["EHR, and", { range: "12-14" }],
      },
    });
  });
});
