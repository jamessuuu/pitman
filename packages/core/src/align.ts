/**
 * Word-level Levenshtein alignment with full DP backtrace, ported from the
 * probe's method (docs/batch2-asr-probe.md §4): "not just an edit distance
 * count — yielding explicit Substitution/Deletion/Insertion operations per
 * clip, which is what makes the error taxonomy possible at all."
 *
 * Standard unit-cost DP (match=0, substitution=1, deletion=1, insertion=1).
 * Tie-break order on equal-cost paths: prefer match/substitution (the
 * diagonal move) over deletion or insertion, and prefer deletion over
 * insertion — this order was chosen because it reproduces every
 * known-answer alignment in docs/batch2-asr-probe.md (§5/§7 and the
 * fixtures/reference.json clips) exactly; see packages/core/test/align.test.ts
 * and wer.test.ts, which assert against those real, already-computed
 * answers rather than re-deriving them.
 */

export type AlignOp = "M" | "S" | "D" | "I";

export interface AlignEntry {
  op: AlignOp;
  ref: string | null;
  hyp: string | null;
}

/** Align two token sequences. Returns the edit script in ref order (deletions/matches/substitutions) with insertions interleaved at their correct position. */
export function align(ref: readonly string[], hyp: readonly string[]): AlignEntry[] {
  const n = ref.length;
  const m = hyp.length;

  // cost[i][j] = min edit distance between ref[0..i) and hyp[0..j)
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) cost[i]![0] = i;
  for (let j = 0; j <= m; j++) cost[0]![j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = cost[i - 1]![j - 1]! + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
      const up = cost[i - 1]![j]! + 1; // deletion (ref word not in hyp)
      const left = cost[i]![j - 1]! + 1; // insertion (hyp word not in ref)
      cost[i]![j] = Math.min(diag, up, left);
    }
  }

  // Backtrace from (n, m) to (0, 0). Tie-break: diagonal > deletion > insertion.
  const entries: AlignEntry[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const isMatch = ref[i - 1] === hyp[j - 1];
      const diagCost = cost[i - 1]![j - 1]! + (isMatch ? 0 : 1);
      if (diagCost === cost[i]![j]) {
        entries.push({ op: isMatch ? "M" : "S", ref: ref[i - 1]!, hyp: hyp[j - 1]! });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && cost[i - 1]![j]! + 1 === cost[i]![j]) {
      entries.push({ op: "D", ref: ref[i - 1]!, hyp: null });
      i--;
      continue;
    }
    // j > 0 guaranteed here
    entries.push({ op: "I", ref: null, hyp: hyp[j - 1]! });
    j--;
  }

  entries.reverse();
  return entries;
}
