import type { WordConfidence } from "../lib/confidence";

/**
 * docs/pitman-SPEC.md Surfaces §1: "transcript with per-segment/word
 * confidence visualization." Confidence is the MODEL's self-report on its
 * own output — not a claim about the speaker (docs/pitman-SPEC.md D1).
 * Real numbers from packages/core-independent computation in
 * src/lib/confidence.ts (a teacher-forcing pass), never estimated.
 */
function confidenceTier(c: number): "high" | "medium" | "low" {
  if (c >= 0.85) return "high";
  if (c >= 0.5) return "medium";
  return "low";
}

export function ConfidenceViz({ words }: { words: WordConfidence[] }) {
  if (words.length === 0) return null;

  return (
    <p
      className="confidence-viz transcript"
      data-testid="transcript"
      aria-label="Transcript with per-word model confidence"
    >
      {words.map((w, i) => {
        const tier = confidenceTier(w.confidence);
        const pct = Math.round(w.confidence * 100);
        return (
          <span key={i} className={`conf-word conf-${tier}`} title={`The model was ${pct}% confident in this word.`}>
            {w.text}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
}
