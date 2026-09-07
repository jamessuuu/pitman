import { useMemo, useState } from "react";
import { align, computeWer, tokenize, classifyMismatch, type AlignEntry } from "@pitman/core";
import { probe } from "../../data/probe.generated";

/**
 * The tool, above the fold, with a real clip already in it.
 *
 * The page used to open on an empty dashed drop zone waiting for a visitor
 * to supply audio AND sit through a model download before anything at all
 * appeared. This renders one of the probe's three committed clips
 * immediately — real audio, the real reference sentence, the real measured
 * hypothesis, and the alignment between them computed here by the same
 * @pitman/core engine that scores live audio.
 *
 * What it deliberately does NOT show is per-word confidence: the probe
 * measured WER and the edit script, not token logprobs. Confidence is a
 * live-inference-only surface, and saying so is more useful than inventing
 * a plausible-looking number.
 */

const CLASS_LABEL: Record<string, string> = {
  none: "no error",
  A: "class A · vocabulary gap",
  B: "class B · documented across speakers",
};

function DiffTokens({ entries }: { entries: AlignEntry[] }) {
  return (
    <p className="diff-tokens" data-testid="sample-diff">
      {entries.map((entry, i) => {
        if (entry.op === "M") {
          return (
            <span key={i} className="diff-tok diff-match">
              {entry.ref}{" "}
            </span>
          );
        }
        const cls = entry.op === "S" ? "diff-sub" : entry.op === "D" ? "diff-del" : "diff-ins";
        const shown = entry.op === "D" ? entry.ref : entry.hyp;
        return (
          <span key={i} className={`diff-tok ${cls}`} title={classifyMismatch(entry).copy}>
            {shown}{" "}
          </span>
        );
      })}
    </p>
  );
}

export function WorkedExample({ onGoLive }: { onGoLive?: () => void }) {
  // `probe` is `as const`, so an inferred state type would be the literal id
  // of whichever clip happens to be the default — widen it explicitly.
  const [activeId, setActiveId] = useState<string>(probe.clips[1]?.id ?? probe.clips[0]!.id);
  const clip = probe.clips.find((c) => c.id === activeId) ?? probe.clips[0]!;
  const run = clip.probe["tiny.en"].fp32;

  const entries = useMemo(() => align(tokenize(clip.reference), tokenize(run.hypothesis)), [clip, run.hypothesis]);
  const recomputed = useMemo(() => computeWer(clip.reference, run.hypothesis), [clip, run.hypothesis]);

  return (
    <div className="tool" data-testid="worked-example">
      <div className="tool-head">
        <div className="stack gap-1">
          <p className="eyebrow">worked example · measured, not simulated</p>
          <p className="h3">whisper-tiny.en, fp32, on a real Common Voice clip</p>
        </div>
      </div>

      <ul className="sample-tabs" role="group" aria-label="Choose a probe clip">
        {probe.clips.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              className="sample-tab"
              aria-pressed={c.id === activeId}
              onClick={() => setActiveId(c.id)}
            >
              <span className={`tab-dot dot-${c.evidenceClass}`} aria-hidden="true" />
              clip {i + 1} · {CLASS_LABEL[c.evidenceClass]}
            </button>
          </li>
        ))}
      </ul>

      <audio
        controls
        preload="none"
        src={`/fixtures/${clip.file}`}
        data-testid="sample-audio"
        style={{ width: "100%", maxWidth: "100%" }}
      >
        Your browser cannot play audio.
      </audio>

      <div className="stack gap-2">
        <p className="pair-label">said</p>
        <p className="transcript" data-testid="sample-reference">
          {clip.reference}
        </p>
      </div>

      <div className="stack gap-2">
        <p className="pair-label">what the model heard</p>
        <DiffTokens entries={entries} />
        <p className="diff-legend">
          <span className="diff-chip diff-match">match</span>
          <span className="diff-chip diff-sub">heard something else</span>
          <span className="diff-chip diff-del">missed</span>
          <span className="diff-chip diff-ins">added</span>
        </p>
      </div>

      <div className="stats stats-quad" data-testid="sample-stats">
        <div className="stat">
          <span className="stat-value">{run.wer.toFixed(3)}</span>
          <span className="stat-label">word error rate</span>
        </div>
        <div className="stat">
          <span className="stat-value">{run.substitutions}</span>
          <span className="stat-label">substitutions</span>
        </div>
        <div className="stat">
          <span className="stat-value">{run.deletions}</span>
          <span className="stat-label">deletions</span>
        </div>
        <div className="stat">
          <span className="stat-value">{run.insertions}</span>
          <span className="stat-label">insertions</span>
        </div>
      </div>

      <p className="small">
        {clip.note} Re-scored in your browser just now by the same engine that scores your own audio:{" "}
        <strong className="data">{recomputed.wer.toFixed(3)}</strong>. Per-word confidence is a live-inference
        surface — the probe recorded transcripts and edit operations, not token probabilities, so this example does
        not show a confidence figure it never measured.
      </p>

      {onGoLive && (
        <div className="tool-actions">
          <button type="button" className="btn" onClick={onGoLive} data-testid="go-live">
            Run it on your own voice
          </button>
          <span className="small">Downloads the model to your device. Nothing is uploaded.</span>
        </div>
      )}
    </div>
  );
}
