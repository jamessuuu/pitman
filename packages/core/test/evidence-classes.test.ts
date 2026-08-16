import { describe, expect, it } from "vitest";
import type { AlignEntry } from "../src/align.js";
import {
  classifyMismatch,
  DOCUMENTED_CONFUSIONS,
  KNOWN_VOCABULARY_GAPS,
} from "../src/evidence-classes.js";

/**
 * THE FRAMING LAW, TESTED (docs/pitman-SPEC.md D1): "No surface may
 * attribute an error to 'your accent'." This suite is the mechanical
 * enforcement of that sentence — a build with green tests but a stray
 * "accent" string in this module is not done, per BATCH-2-STANDARDS.md.
 */
describe("evidence-classes — D1 framing law regression (no 'accent', anywhere)", () => {
  function allCopyAndEvidence(): string[] {
    const strings: string[] = [];

    // Every documented-confusion pair, as the substitution it was measured as.
    for (const c of DOCUMENTED_CONFUSIONS) {
      const r = classifyMismatch({ op: "S", ref: c.ref, hyp: c.hyp });
      strings.push(r.copy, r.evidence ?? "");
    }

    // Every known vocabulary gap, as both a substitution and a deletion.
    for (const g of KNOWN_VOCABULARY_GAPS) {
      const asSub = classifyMismatch({ op: "S", ref: g.word, hyp: "something-else" });
      const asDel = classifyMismatch({ op: "D", ref: g.word, hyp: null });
      strings.push(asSub.copy, asSub.evidence ?? "", asDel.copy, asDel.evidence ?? "");
    }

    // A sweep of arbitrary, unlisted words through every op shape —
    // exercises the "unclassified" fallback copy paths.
    const arbitraryWords = ["banana", "orbit", "lantern", "quiet", "harbor", "velvet"];
    for (const w of arbitraryWords) {
      strings.push(classifyMismatch({ op: "S", ref: w, hyp: "xyz" }).copy);
      strings.push(classifyMismatch({ op: "D", ref: w, hyp: null }).copy);
      strings.push(classifyMismatch({ op: "I", ref: null, hyp: w }).copy);
      strings.push(classifyMismatch({ op: "M", ref: w, hyp: w }).copy);
    }

    return strings;
  }

  it("never contains the substring 'accent' (case-insensitive) in any copy or evidence string", () => {
    const offenders = allCopyAndEvidence().filter((s) => /accent/i.test(s));
    expect(offenders).toEqual([]);
  });

  it("never contains other speaker-judging language ('your english', 'pronunciation', 'correct english')", () => {
    const bannedPatterns = [/your english/i, /pronunciation/i, /correct english/i, /native speaker/i];
    const offenders = allCopyAndEvidence().filter((s) => bannedPatterns.some((re) => re.test(s)));
    expect(offenders).toEqual([]);
  });
});

describe("classifyMismatch — routing", () => {
  it("routes a documented confusion pair to class B, citing the probe", () => {
    const entry: AlignEntry = { op: "S", ref: "track", hyp: "truck" };
    const result = classifyMismatch(entry);
    expect(result.evidenceClass).toBe("B");
    expect(result.copy).toContain("documented across multiple speakers");
    expect(result.evidence).toContain("batch2-asr-probe.md");
  });

  it("class B routing is case-insensitive", () => {
    const result = classifyMismatch({ op: "S", ref: "Track", hyp: "Truck" });
    expect(result.evidenceClass).toBe("B");
  });

  it("routes a known vocabulary gap to class A when substituted", () => {
    const result = classifyMismatch({ op: "S", ref: "Cebanu", hyp: "Sebano" });
    expect(result.evidenceClass).toBe("A");
    expect(result.copy).toContain("vocabulary gap");
    expect(result.evidence).toContain("batch2-asr-probe.md");
  });

  it("routes a known vocabulary gap to class A when deleted outright", () => {
    const result = classifyMismatch({ op: "D", ref: "Penelakut", hyp: null });
    expect(result.evidenceClass).toBe("A");
    expect(result.copy).toContain("dropped it entirely");
  });

  it("routes an arbitrary, uncatalogued substitution to 'unclassified' — never invents a cause", () => {
    const result = classifyMismatch({ op: "S", ref: "umbrella", hyp: "elephant" });
    expect(result.evidenceClass).toBe("unclassified");
    expect(result.evidence).toBeUndefined();
    expect(result.copy).toContain("no established pattern");
  });

  it("routes an arbitrary deletion to 'unclassified'", () => {
    const result = classifyMismatch({ op: "D", ref: "umbrella", hyp: null });
    expect(result.evidenceClass).toBe("unclassified");
  });

  it("routes any insertion to 'unclassified' — neither class applies by construction", () => {
    const result = classifyMismatch({ op: "I", ref: null, hyp: "extra" });
    expect(result.evidenceClass).toBe("unclassified");
    expect(result.copy).toContain("extra word");
  });

  it("routes a match to 'correct' with empty copy", () => {
    const result = classifyMismatch({ op: "M", ref: "hello", hyp: "hello" });
    expect(result.evidenceClass).toBe("correct");
    expect(result.copy).toBe("");
  });

  it("every DOCUMENTED_CONFUSIONS entry has >=2-speaker/multi-datapoint evidence text (spec: 'multi-datapoint only')", () => {
    for (const c of DOCUMENTED_CONFUSIONS) {
      expect(c.evidence.toLowerCase()).toMatch(/speaker/);
    }
  });

  it("every KNOWN_VOCABULARY_GAPS entry's evidence references the probe or its control group", () => {
    for (const g of KNOWN_VOCABULARY_GAPS) {
      expect(g.evidence).toContain("batch2-asr-probe.md");
    }
  });
});
