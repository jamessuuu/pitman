/**
 * Text normalization for WER scoring, ported from the probe's method
 * (docs/batch2-asr-probe.md §4): lowercase; strip all punctuation except
 * apostrophes (so contractions survive as single tokens); collapse
 * whitespace; tokenize on whitespace.
 *
 * One addition beyond the probe's stated rule, calibrated against its own
 * example alignments (docs/batch2-asr-probe.md §5/§7): punctuation
 * (including hyphens) is replaced with a SPACE, not deleted outright — a
 * hyphen therefore acts as a token boundary. This was confirmed necessary
 * by the probe's own data: whisper-base.en's hypothesis on
 * common_voice_en_187061 contains the literal substring "pre-honed", and
 * the probe's committed alignment (results/results.json) splits it into two
 * separate tokens, "pre" (an insertion) and "honed" (a substitution) — not
 * one fused token "prehoned". Deleting punctuation with no replacement
 * would produce the fused form and fail that known-answer fixture.
 *
 * Curly/smart apostrophes (U+2019) are folded to the straight apostrophe
 * (U+0027) before punctuation stripping, so "won't" typed with either glyph
 * normalizes identically. Not itself exercised by probe data (Common Voice
 * transcripts use straight quotes), but a disclosed, conservative addition.
 */

const CURLY_APOSTROPHE = /’/g;
const NON_WORD_NON_SPACE = /[^\p{L}\p{N}'\s]/gu;
const WHITESPACE_RUN = /\s+/g;

/** Lowercase, fold smart quotes, strip punctuation (hyphens -> space boundary), collapse whitespace. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(CURLY_APOSTROPHE, "'")
    .replace(NON_WORD_NON_SPACE, " ")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

/** normalize() then split on whitespace. Empty/whitespace-only input yields []. */
export function tokenize(text: string): string[] {
  const normalized = normalize(text);
  return normalized.length === 0 ? [] : normalized.split(" ");
}
