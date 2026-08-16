import { describe, expect, it } from "vitest";
import { align } from "../src/align.js";

describe("align", () => {
  it("aligns identical sequences as all matches", () => {
    const result = align(["a", "b", "c"], ["a", "b", "c"]);
    expect(result).toEqual([
      { op: "M", ref: "a", hyp: "a" },
      { op: "M", ref: "b", hyp: "b" },
      { op: "M", ref: "c", hyp: "c" },
    ]);
  });

  it("detects a single substitution", () => {
    const result = align(["a", "b", "c"], ["a", "x", "c"]);
    expect(result).toEqual([
      { op: "M", ref: "a", hyp: "a" },
      { op: "S", ref: "b", hyp: "x" },
      { op: "M", ref: "c", hyp: "c" },
    ]);
  });

  it("detects a deletion (ref word missing from hyp)", () => {
    const result = align(["a", "b", "c"], ["a", "c"]);
    expect(result).toEqual([
      { op: "M", ref: "a", hyp: "a" },
      { op: "D", ref: "b", hyp: null },
      { op: "M", ref: "c", hyp: "c" },
    ]);
  });

  it("detects an insertion (extra hyp word)", () => {
    const result = align(["a", "c"], ["a", "b", "c"]);
    expect(result).toEqual([
      { op: "M", ref: "a", hyp: "a" },
      { op: "I", ref: null, hyp: "b" },
      { op: "M", ref: "c", hyp: "c" },
    ]);
  });

  it("handles both sequences empty", () => {
    expect(align([], [])).toEqual([]);
  });

  it("handles empty ref (all insertions)", () => {
    expect(align([], ["a", "b"])).toEqual([
      { op: "I", ref: null, hyp: "a" },
      { op: "I", ref: null, hyp: "b" },
    ]);
  });

  it("handles empty hyp (all deletions)", () => {
    expect(align(["a", "b"], [])).toEqual([
      { op: "D", ref: "a", hyp: null },
      { op: "D", ref: "b", hyp: null },
    ]);
  });

  // Real, already-computed answer from docs/batch2-asr-probe.md (via
  // results/results.json, whisper-tiny.en fp32, common_voice_en_21786429):
  // ref "...run by the Penelakut." hyp "...run by the vanilla group."
  it("matches the probe's own alignment for the Penelakut clip (insertion before substitution)", () => {
    const ref = ["the", "present", "comprehensive", "school", "is", "run", "by", "the", "penelakut"];
    const hyp = ["the", "present", "comprehensive", "school", "is", "run", "by", "the", "vanilla", "group"];
    const result = align(ref, hyp);
    expect(result).toEqual([
      { op: "M", ref: "the", hyp: "the" },
      { op: "M", ref: "present", hyp: "present" },
      { op: "M", ref: "comprehensive", hyp: "comprehensive" },
      { op: "M", ref: "school", hyp: "school" },
      { op: "M", ref: "is", hyp: "is" },
      { op: "M", ref: "run", hyp: "run" },
      { op: "M", ref: "by", hyp: "by" },
      { op: "M", ref: "the", hyp: "the" },
      { op: "I", ref: null, hyp: "vanilla" },
      { op: "S", ref: "penelakut", hyp: "group" },
    ]);
  });
});
