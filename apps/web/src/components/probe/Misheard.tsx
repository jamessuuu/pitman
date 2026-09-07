import { useMemo } from "react";
import { align, tokenize } from "@pitman/core";
import { probe } from "../../data/probe.generated";

/**
 * The ten example pairs from docs/batch2-asr-probe.md §7 — the most
 * persuasive thing this repository owns, and until now the page showed none
 * of them.
 *
 * The words highlighted on the "heard" line are not hand-marked: they come
 * from @pitman/core's own alignment, the same engine that scores a visitor's
 * own audio. So the markup is derived from the measurement rather than
 * decorating it.
 */

function werClass(wer: number): string {
  if (wer === 0) return "pair-perfect";
  if (wer < 0.3) return "pair-mid";
  return "pair-bad";
}

/** Render the hypothesis with substituted/inserted words marked. */
function HeardLine({ reference, heard }: { reference: string; heard: string }) {
  const marked = useMemo(() => {
    const entries = align(tokenize(reference), tokenize(heard));
    // Walk the original words so casing and punctuation survive display,
    // using the alignment only to decide which ones to mark.
    const hypWords = heard.split(/\s+/).filter(Boolean);
    const flags: boolean[] = [];
    for (const entry of entries) {
      if (entry.op === "M") flags.push(false);
      else if (entry.op === "S" || entry.op === "I") flags.push(true);
      // Deletions consume a reference word and produce no hypothesis word.
    }
    return hypWords.map((word, i) => ({ word, changed: flags[i] ?? false }));
  }, [reference, heard]);

  return (
    <span className="pair-text pair-heard">
      {marked.map((m, i) => (
        <span key={i}>
          {m.changed ? <mark>{m.word}</mark> : m.word}
          {i < marked.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

export function MisheardPairs({ limit }: { limit?: number }) {
  const examples = limit ? probe.examples.slice(0, limit) : probe.examples;

  return (
    <ul className="pairs" data-testid="misheard-pairs">
      {examples.map((ex, i) => (
        <li key={i} className={`pair ${werClass(ex.wer)}`}>
          <span className="pair-wer" aria-label={`word error rate ${ex.wer.toFixed(3)}`}>
            {ex.wer.toFixed(3)}
          </span>
          <span className="pair-lines">
            <span className="pair-line">
              <span className="pair-label">said</span>
              <span className="pair-text pair-said">{ex.reference}</span>
            </span>
            <span className="pair-line">
              <span className="pair-label">heard</span>
              {ex.wer === 0 ? (
                <span className="pair-text pair-heard">{ex.heard}</span>
              ) : (
                <HeardLine reference={ex.reference} heard={ex.heard} />
              )}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
