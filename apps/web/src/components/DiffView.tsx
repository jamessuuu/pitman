import { useId, useMemo, useState } from "react";
import { align, classifyMismatch, tokenize, type AlignEntry } from "@pitman/core";

/**
 * docs/pitman-SPEC.md Surfaces §1: "Optionally type what you MEANT to say
 * → word-level alignment diff (S/D/I coloring)." Every mismatch is routed
 * through @pitman/core's classifyMismatch — the D1 framing-law-tested copy
 * selector (packages/core/src/evidence-classes.ts) — so this surface can
 * never attribute an error to "your accent" (enforced by
 * evidence-classes.test.ts, not just by convention here).
 */
export function DiffView({ heard, initialMeant = "" }: { heard: string; initialMeant?: string }) {
  const inputId = useId();
  const [meant, setMeant] = useState(initialMeant);

  const entries = useMemo<AlignEntry[]>(() => {
    if (meant.trim().length === 0) return [];
    return align(tokenize(meant), tokenize(heard));
  }, [meant, heard]);

  return (
    <div className="diff-view">
      <label htmlFor={inputId}>What did you mean to say? (optional)</label>
      <textarea
        id={inputId}
        data-testid="meant-input"
        rows={2}
        value={meant}
        onChange={(e) => setMeant(e.target.value)}
        placeholder="Type the sentence you were actually trying to say…"
      />
      {entries.length > 0 && (
        <div className="diff-result" data-testid="diff-result">
          <p className="diff-legend">
            <span className="diff-chip diff-match">said &amp; heard match</span>
            <span className="diff-chip diff-sub">model heard something else</span>
            <span className="diff-chip diff-del">model missed this</span>
            <span className="diff-chip diff-ins">model added this</span>
          </p>
          <p className="diff-tokens">
            {entries.map((entry, i) => (
              <DiffToken key={i} entry={entry} />
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

function DiffToken({ entry }: { entry: AlignEntry }) {
  if (entry.op === "M") {
    return <span className="diff-tok diff-match">{entry.ref} </span>;
  }

  const classification = classifyMismatch(entry);
  const label = entry.op === "S" ? "diff-sub" : entry.op === "D" ? "diff-del" : "diff-ins";
  const shown = entry.op === "D" ? entry.ref : entry.hyp;

  return (
    <span className={`diff-tok ${label}`} title={classification.copy}>
      {shown}{" "}
    </span>
  );
}
