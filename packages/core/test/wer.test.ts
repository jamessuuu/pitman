import { describe, expect, it } from "vitest";
import { computeWer } from "../src/wer.js";
import referenceFixtures from "../../../fixtures/reference.json" with { type: "json" };

describe("computeWer — edge cases", () => {
  it("is 0 for identical strings", () => {
    const r = computeWer("hello world", "hello world");
    expect(r.wer).toBe(0);
    expect(r.substitutions + r.deletions + r.insertions).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(computeWer("Hello World", "hello world").wer).toBe(0);
  });

  it("is 0/0 for two empty strings", () => {
    const r = computeWer("", "");
    expect(r.wer).toBe(0);
    expect(r.refWordCount).toBe(0);
  });

  it("counts a fully wrong hypothesis at 100% when lengths match", () => {
    const r = computeWer("a b c", "x y z");
    expect(r.wer).toBe(1);
    expect(r.substitutions).toBe(3);
  });

  it("scores a full deletion (empty hypothesis) at 100%", () => {
    const r = computeWer("a b c", "");
    expect(r.wer).toBe(1);
    expect(r.deletions).toBe(3);
  });
});

describe("computeWer — known-answer fixtures from docs/batch2-asr-probe.md", () => {
  // whisper-tiny.en, fp32 (Node.js, docs/batch2-asr-probe.md §5/§7, exact
  // values from the probe's committed results/results.json — not the
  // rounded numbers printed in the report's §7 table). Spans the full
  // observed WER range, 0 to 0.636, per the probe's own framing of this as
  // "the honesty case in miniature."
  const cases: Array<{
    label: string;
    reference: string;
    hypothesis: string;
    wer: number;
    substitutions: number;
    deletions: number;
    insertions: number;
    refWordCount: number;
  }> = [
    {
      label: "187059 — perfect",
      reference: "Young boy running outside on the pavement.",
      hypothesis: "Young boy running outside on the pavement.",
      wer: 0,
      substitutions: 0,
      deletions: 0,
      insertions: 0,
      refWordCount: 7,
    },
    {
      label: "39569507 — perfect, apostrophe-word",
      reference: "Chile is today one of South America's most stable and prosperous nations.",
      hypothesis: "Chile is today one of South America's most stable and prosperous nations.",
      wer: 0,
      substitutions: 0,
      deletions: 0,
      insertions: 0,
      refWordCount: 12,
    },
    {
      label: "34949915 — one function-word substitution",
      reference: "It is also funded through the National Lottery, Creative Scotland and Northern Ireland Screen.",
      hypothesis: "It is also funded to the National Lottery, Creative Scotland and Northern Ireland, Screen.",
      wer: 0.07142857142857142,
      substitutions: 1,
      deletions: 0,
      insertions: 0,
      refWordCount: 14,
    },
    {
      label: "40063901 — one content-word substitution",
      reference: "Enemies killed by beam attack won't drop any orbs.",
      hypothesis: "Enemies killed by beam attack won't drop any olives.",
      wer: 0.1111111111111111,
      substitutions: 1,
      deletions: 0,
      insertions: 0,
      refWordCount: 9,
    },
    {
      label: "40258941 — its/it's non-error artifact, still scored as a substitution (raw WER, matches probe's stated scope)",
      reference: "Its inhabitants emigrated and were replaced by Greek refugees.",
      hypothesis: "It's inhabitants emigrated and were replaced by Greek refugees.",
      wer: 0.1111111111111111,
      substitutions: 1,
      deletions: 0,
      insertions: 0,
      refWordCount: 9,
    },
    {
      label: "19739321 — four/4 non-error artifact, still scored as a substitution (raw WER)",
      reference: "The album eventually sold over four million records.",
      hypothesis: "The album eventually sold over 4 million records.",
      wer: 0.125,
      substitutions: 1,
      deletions: 0,
      insertions: 0,
      refWordCount: 8,
    },
    {
      label: "38102497 — class A (Cebanu)",
      reference: "The current president is Pavel Cebanu.",
      hypothesis: "The current president is Pavel Sebano.",
      wer: 0.16666666666666666,
      substitutions: 1,
      deletions: 0,
      insertions: 0,
      refWordCount: 6,
    },
    {
      label: "21786429 — insertion + substitution (Penelakut)",
      reference: "The present comprehensive school is run by the Penelakut.",
      hypothesis: "The present comprehensive school is run by the vanilla group.",
      wer: 0.2222222222222222,
      substitutions: 1,
      deletions: 0,
      insertions: 1,
      refWordCount: 9,
    },
    {
      label: "21786428 — track/trap near-miss + multiple substitutions",
      reference: 'The track "Remedy" was featured in the soundtrack for Tony Hawk\'s Underground.',
      hypothesis: "The trap remedy was featured in the San Trakport Tony House Underground.",
      wer: 0.3333333333333333,
      substitutions: 4,
      deletions: 0,
      insertions: 0,
      refWordCount: 12,
    },
    {
      label: "187061 — class B (track/truck), sub + insertion",
      reference: "Muzzled greyhounds are racing along a dog track.",
      hypothesis: "My soul preheans are racing along a dog truck.",
      wer: 0.5,
      substitutions: 3,
      deletions: 0,
      insertions: 1,
      refWordCount: 8,
    },
    {
      label: "43203251 — 4 substitutions in a row",
      reference: "Animal husbandry concentrates on meat and milk production.",
      hypothesis: "Animal husbandry concentrates and meet in love production.",
      wer: 0.5,
      substitutions: 4,
      deletions: 0,
      insertions: 0,
      refWordCount: 8,
    },
    {
      label: "34949917 — sub + deletion + insertion (Leclercq)",
      reference: "Leclercq instead opted to record live choirs and solo gospel singers.",
      hypothesis: "Lickler is instead opted to record live choirs on solo gospelsiness.",
      wer: 0.45454545454545453,
      substitutions: 3,
      deletions: 1,
      insertions: 1,
      refWordCount: 11,
    },
    {
      label: "42226707 — worst tiny.en fp32 case in the probe (0.636)",
      reference: "After this, Bow's hideaway is rebuilt and Rand rejoins the party.",
      hypothesis: "After this, both hideaway is revealed and you're on screen-join the park.",
      wer: 0.6363636363636364,
      substitutions: 5,
      deletions: 0,
      insertions: 2,
      refWordCount: 11,
    },
    {
      // The critical hyphen-as-token-boundary case (see normalize.test.ts):
      // whisper-base.en fp32 on the same 187061 clip. If normalize()
      // deleted the hyphen in "pre-honed" instead of treating it as a
      // separator, this fixture's substitution/insertion counts would be
      // wrong (a fused "prehoned" token cannot match "muzzled" and inflates
      // insertions incorrectly).
      label: "187061 — base.en fp32, worst case in the whole probe (1.125), contains a hyphenated hypothesis word",
      reference: "Muzzled greyhounds are racing along a dog track.",
      hypothesis: "My soul pre-honed sorry seeing a long a dog truck.",
      wer: 1.125,
      substitutions: 6,
      deletions: 0,
      insertions: 3,
      refWordCount: 8,
    },
  ];

  for (const c of cases) {
    it(`${c.label}: WER ${c.wer}`, () => {
      const r = computeWer(c.reference, c.hypothesis);
      expect(r.wer).toBeCloseTo(c.wer, 10);
      expect(r.substitutions).toBe(c.substitutions);
      expect(r.deletions).toBe(c.deletions);
      expect(r.insertions).toBe(c.insertions);
      expect(r.refWordCount).toBe(c.refWordCount);
    });
  }
});

describe("computeWer — against the 3 committed fixture clips (fixtures/reference.json)", () => {
  for (const clip of referenceFixtures.clips) {
    for (const [model, byDtype] of Object.entries(clip.probe)) {
      for (const [dtype, run] of Object.entries(byDtype as Record<string, { hypothesis: string; wer: number; substitutions: number; deletions: number; insertions: number }>)) {
        it(`${clip.id} — ${model} ${dtype}: WER ${run.wer}`, () => {
          const r = computeWer(clip.reference, run.hypothesis);
          expect(r.wer).toBeCloseTo(run.wer, 10);
          expect(r.substitutions).toBe(run.substitutions);
          expect(r.deletions).toBe(run.deletions);
          expect(r.insertions).toBe(run.insertions);
          expect(r.refWordCount).toBe(clip.refWordCount);
        });
      }
    }
  }
});
