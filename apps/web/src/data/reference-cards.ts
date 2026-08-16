// Reference cards — docs/pitman-SPEC.md Surfaces §2: "short practice
// sentences with known reference text, probe-informed... Card copy teaches
// the two classes." Every sentence here is a REAL sentence from the probe
// (docs/batch2-asr-probe.md §7 / packages/core/test/wer.test.ts's
// known-answer fixtures), never invented — a card with a fabricated
// sentence would be exactly the kind of unverified claim D1 rules out.
//
// packages/core's KNOWN_VOCABULARY_GAPS also lists "vlachos" (from the
// probe's control group, §8) — no full reference sentence for it exists
// anywhere in the probe document, so it has no card here. Listed, not
// invented.
export interface ReferenceCard {
  id: string;
  evidenceClass: "A" | "B";
  targetWord: string;
  sentence: string;
  explanation: string;
  citation: string;
}

export const REFERENCE_CARDS: ReferenceCard[] = [
  {
    id: "cebanu",
    evidenceClass: "A",
    targetWord: "Cebanu",
    sentence: "The current president is Pavel Cebanu.",
    explanation:
      'This has a rare surname. Watch it miss "Cebanu" — the model doesn\'t know the word, for anyone, ' +
      "regardless of who says it.",
    citation:
      'docs/batch2-asr-probe.md §6 bucket A: "Cebanu" (a Moldovan surname) -> tiny.en "Sebano", base.en "Cebano".',
  },
  {
    id: "penelakut",
    evidenceClass: "A",
    targetWord: "Penelakut",
    sentence: "The present comprehensive school is run by the Penelakut.",
    explanation:
      'A real, rare place name. Both probe models hallucinated "vanilla" here — a language-model prior taking ' +
      "over on a word the model has never seen, not a mishearing of a specific sound.",
    citation:
      'docs/batch2-asr-probe.md §6 bucket A: "Penelakut" (a real Canadian First Nations place name) -> both ' +
      'models independently produced "vanilla".',
  },
  {
    id: "leclercq",
    evidenceClass: "A",
    targetWord: "Leclercq",
    sentence: "Leclercq instead opted to record live choirs and solo gospel singers.",
    explanation:
      'A French surname the model has rarely, if ever, seen written out. Both probe models landed on the same ' +
      'wrong word, "Lickler" — convergent failure on a rare name, not something particular to one voice.',
    citation:
      'docs/batch2-asr-probe.md §6 bucket A: "Leclercq" -> both models land on the same wrong word, "Lickler".',
  },
  {
    id: "hawks",
    evidenceClass: "A",
    targetWord: "Hawk's",
    sentence: 'The track "Remedy" was featured in the soundtrack for Tony Hawk\'s Underground.',
    explanation:
      'Both probe models missed "Hawk\'s", converging on "house"/"House" — while the plain name "Tony" right ' +
      "next to it came through fine. The breakage tracks word-rarity in this exact phrase, not a blanket effect.",
    citation:
      'docs/batch2-asr-probe.md §6 bucket A: "Hawk\'s" -> both models miss it, converging on "house"/"House".',
  },
  {
    id: "track-truck",
    evidenceClass: "B",
    targetWord: "track",
    sentence: "Muzzled greyhounds are racing along a dog track.",
    explanation:
      '"track" -> "truck" is the one recurring, non-proper-noun confusion the probe found: it showed up in 3 of ' +
      "4 clip x model combinations, across 2 different speakers, in both models — with no counterpart at all in " +
      "the probe's control group. That combination of evidence is what makes this class B instead of class A.",
    citation:
      'docs/batch2-asr-probe.md §6 bucket B: "track" -> "truck" recurs across 2 different Filipino-tagged ' +
      "speakers, in both whisper-tiny.en and whisper-base.en, absent from the probe's 18-clip US-tagged control group.",
  },
];
