import { align, type AlignEntry } from "./align.js";
import { tokenize } from "./normalize.js";

export interface WerResult {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  refWordCount: number;
  alignment: AlignEntry[];
}

/**
 * WER = (S + D + I) / N, N = reference word count. Ported from the probe's
 * method (docs/batch2-asr-probe.md §4). This is the RAW number, matching
 * what the probe reports as "raw WER" — no number-word or contraction
 * normalization beyond normalize.ts's punctuation/case rules, so the two
 * non-error artifacts the probe names explicitly ("four" vs "4", "its" vs
 * "it's") score as substitutions here too, exactly as they do in the
 * probe's own committed results. This is a disclosed scope match, not an
 * oversight — see docs/pitman-SPEC.md and the probe's §4/§5 "artifact-
 * adjusted" discussion for why both numbers matter and neither should be
 * shown alone if this fact is ever surfaced in UI copy.
 *
 * refWordCount === 0 is an edge case with no meaningful rate: returns
 * wer: 0 if hyp is also empty (nothing to transcribe, nothing missed),
 * otherwise Infinity is avoided by defining wer as insertions / 1 guard —
 * in practice this only matters for empty-string unit tests, never for a
 * real reference sentence.
 */
export function computeWer(reference: string, hypothesis: string): WerResult {
  const refTokens = tokenize(reference);
  const hypTokens = tokenize(hypothesis);
  const alignment = align(refTokens, hypTokens);

  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  for (const entry of alignment) {
    if (entry.op === "S") substitutions++;
    else if (entry.op === "D") deletions++;
    else if (entry.op === "I") insertions++;
  }

  const refWordCount = refTokens.length;
  const errorOps = substitutions + deletions + insertions;
  const wer = refWordCount === 0 ? (errorOps === 0 ? 0 : errorOps) : errorOps / refWordCount;

  return { wer, substitutions, deletions, insertions, refWordCount, alignment };
}
