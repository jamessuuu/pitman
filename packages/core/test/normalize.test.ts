import { describe, expect, it } from "vitest";
import { normalize, tokenize } from "../src/normalize.js";

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("YOUNG Boy")).toBe("young boy");
  });

  it("strips punctuation, replacing it with a token boundary", () => {
    expect(normalize("Northern Ireland, Screen.")).toBe("northern ireland screen");
  });

  it("preserves apostrophes so contractions stay one token", () => {
    expect(tokenize("won't")).toEqual(["won't"]);
    expect(tokenize("America's")).toEqual(["america's"]);
  });

  it("folds curly apostrophes to straight ones", () => {
    expect(tokenize("won’t")).toEqual(["won't"]);
  });

  it("splits on hyphens as a token boundary, not deleting them", () => {
    // Calibrated against a real probe result: whisper-base.en's hypothesis
    // on common_voice_en_187061 contains the literal substring "pre-honed",
    // and the probe's committed alignment (docs/batch2-asr-probe.md's
    // underlying results/results.json) splits it into two separate tokens
    // — "pre" (an insertion) and "honed" (a substitution) — not one fused
    // token "prehoned". If punctuation were deleted instead of replaced
    // with a boundary, this fixture would fail.
    expect(tokenize("pre-honed")).toEqual(["pre", "honed"]);
  });

  it("collapses repeated whitespace", () => {
    expect(normalize("a   b\t\tc")).toBe("a b c");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalize("  hello  ")).toBe("hello");
  });

  it("keeps digits as their own tokens", () => {
    expect(tokenize("over 4 million")).toEqual(["over", "4", "million"]);
  });
});

describe("tokenize", () => {
  it("returns [] for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("returns [] for whitespace-only input", () => {
    expect(tokenize("   ")).toEqual([]);
  });

  it("returns [] for punctuation-only input", () => {
    expect(tokenize("...")).toEqual([]);
  });
});
