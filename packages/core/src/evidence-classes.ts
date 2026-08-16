import type { AlignEntry } from "./align.js";

/**
 * THE FRAMING LAW (docs/pitman-SPEC.md D1 — absolute, program-binding):
 * pitman never judges the speaker. Every mismatch is model behavior — "the
 * model heard X" — and any explanation offered for WHY must trace to one of
 * exactly two evidenced classes:
 *
 *   (A) "the model doesn't know this word/name" — general out-of-vocabulary.
 *       Evidenced non-accent-specific by the probe's own US-accent control
 *       group (docs/batch2-asr-probe.md §8): the identical failure mode,
 *       including the same spelling-proxy pattern, broke on a nominally
 *       native-English speaker misreading an unfamiliar surname (Vlachos ->
 *       Blachel/Blachos). A rare word is rare for everyone.
 *
 *   (B) "this confusion is documented across multiple speakers" —
 *       multi-datapoint only. The probe's one qualifying finding is
 *       track -> truck (§6 bucket B): recurs in 3 of 4 clip×model
 *       combinations, across 2 different speakers, in both models, with no
 *       counterpart in the control group.
 *
 * No other explanation may be offered. Where a mismatch matches neither
 * lexicon below, the copy states the mismatch and stops — it does NOT
 * invent a cause. This mirrors the sibling halo-halo project's AMBIGUOUS
 * discipline: forcing a classification the evidence doesn't support turns a
 * real uncertainty into a false-confidence claim, which is worse than
 * admitting "no established pattern yet."
 *
 * Both lexicons are small and versioned ON PURPOSE. Adding an entry means
 * adding real, citable, multi-datapoint evidence to this file's comments —
 * never a guess promoted to a citation after the fact.
 */

export interface DocumentedConfusion {
  /** Reference word, lowercase. */
  ref: string;
  /** What the model heard instead, lowercase. */
  hyp: string;
  evidence: string;
}

/** Class B — recurring, phonetically-grounded confusions with >=2 independent speaker datapoints. */
export const DOCUMENTED_CONFUSIONS: readonly DocumentedConfusion[] = [
  {
    ref: "track",
    hyp: "truck",
    evidence:
      'docs/batch2-asr-probe.md §6 bucket B: "track" -> "truck" recurs in 3 of the 4 clip×model combinations it appears in, across 2 different Filipino-tagged speakers, in both whisper-tiny.en and whisper-base.en, with no counterpart in the probe\'s 18-clip US-tagged control group.',
  },
];

export interface KnownVocabularyGap {
  /** The reference word/name the model does not know, lowercase. */
  word: string;
  evidence: string;
}

/** Class A — proper nouns/rare words the probe measured as OOV for the model, confirmed non-accent-specific by the control group. */
export const KNOWN_VOCABULARY_GAPS: readonly KnownVocabularyGap[] = [
  {
    word: "cebanu",
    evidence:
      'docs/batch2-asr-probe.md §6 bucket A: "Cebanu" (a Moldovan surname) -> tiny.en "Sebano", base.en "Cebano" — both models land close but wrong on a rare surname neither has seen.',
  },
  {
    word: "penelakut",
    evidence:
      'docs/batch2-asr-probe.md §6 bucket A: "Penelakut" (a real Canadian First Nations place name) -> both models independently hallucinate "vanilla" — a language-model prior taking over on an out-of-vocabulary token, not a mishearing of a specific sound.',
  },
  {
    word: "leclercq",
    evidence:
      'docs/batch2-asr-probe.md §6 bucket A: "Leclercq" (a French surname) -> both models land on the same wrong word, "Lickler" — convergent failure on a rare name, not a speaker-specific mishearing.',
  },
  {
    word: "hawk's",
    evidence:
      'docs/batch2-asr-probe.md §6 bucket A: "Hawk\'s" (from "Tony Hawk\'s Underground") -> both models miss it, converging on "house"/"House" — the surrounding rare word "soundtrack" breaks differently in each model in the same sentence, while the model gets the plain name "Tony" right, showing the breakage tracks word-rarity, not the speaker.',
  },
  {
    word: "vlachos",
    evidence:
      'docs/batch2-asr-probe.md §8: from the probe\'s own US-tagged CONTROL GROUP — "Vlachos" (a Greek surname) -> "Blachel"/"Blachos", the identical failure pattern on a nominally native-English speaker. This is the single entry that most directly proves class A is a general vocabulary limitation, not tied to any one speaker group.',
  },
] as const;

export type EvidenceClass = "A" | "B" | "unclassified" | "correct";

export interface MismatchClassification {
  evidenceClass: EvidenceClass;
  /** Framing-law-compliant copy. Never attributes the mismatch to "your accent" — enforced by evidence-classes.test.ts scanning every string this module can produce. */
  copy: string;
  evidence?: string;
}

function lookupConfusion(ref: string, hyp: string): DocumentedConfusion | undefined {
  return DOCUMENTED_CONFUSIONS.find((c) => c.ref === ref && c.hyp === hyp);
}

function lookupGap(ref: string): KnownVocabularyGap | undefined {
  return KNOWN_VOCABULARY_GAPS.find((g) => g.word === ref);
}

/**
 * Classify one alignment entry (docs/batch2-asr-probe.md's S/D/I op) into
 * an evidence class and its display copy. "M" (match) entries are not
 * errors — classifying one returns evidenceClass "correct" with empty copy
 * so callers can map the whole alignment array without pre-filtering.
 */
export function classifyMismatch(entry: AlignEntry): MismatchClassification {
  if (entry.op === "M") {
    return { evidenceClass: "correct", copy: "" };
  }

  const ref = entry.ref?.toLowerCase() ?? null;
  const hyp = entry.hyp?.toLowerCase() ?? null;

  if (entry.op === "S" && ref !== null && hyp !== null) {
    const documented = lookupConfusion(ref, hyp);
    if (documented) {
      return {
        evidenceClass: "B",
        copy: `The model heard "${entry.hyp}" instead of "${entry.ref}". This exact mix-up is documented across multiple speakers — a repeatable pattern in how the model hears this sound, not something about this recording.`,
        evidence: documented.evidence,
      };
    }
    const gap = lookupGap(ref);
    if (gap) {
      return {
        evidenceClass: "A",
        copy: `The model doesn't know the word "${entry.ref}" — it heard "${entry.hyp}" instead. That's a vocabulary gap in the model, not a mishearing of how it was said: a control-group check with unrelated speakers found the model misses equally rare words for everyone.`,
        evidence: gap.evidence,
      };
    }
    return {
      evidenceClass: "unclassified",
      copy: `The model heard "${entry.hyp}" instead of "${entry.ref}" here. There's no established pattern explaining this specific mismatch yet.`,
    };
  }

  if (entry.op === "D" && ref !== null) {
    const gap = lookupGap(ref);
    if (gap) {
      return {
        evidenceClass: "A",
        copy: `The model doesn't know the word "${entry.ref}" — it dropped it entirely. That's a vocabulary gap in the model: a control-group check with unrelated speakers found the model misses equally rare words for everyone.`,
        evidence: gap.evidence,
      };
    }
    return {
      evidenceClass: "unclassified",
      copy: `The model didn't catch "${entry.ref}" here. There's no established pattern explaining this specific miss yet.`,
    };
  }

  // Insertion: the model added a word that was not said. Neither evidenced
  // class applies to an insertion by construction (there is no reference
  // word to be "unknown" or "confused").
  return {
    evidenceClass: "unclassified",
    copy: `The model added an extra word, "${entry.hyp ?? ""}", that wasn't said.`,
  };
}
