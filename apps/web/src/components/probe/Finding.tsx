import { probe } from "../../data/probe.generated";

/**
 * The finding, at size, with its provenance named on the page.
 *
 * Every number here is read out of docs/batch2-asr-probe.md by
 * scripts/extract-probe.mjs at build time — the page cannot drift from the
 * document, and cannot render blank if a fetch fails, because there is no
 * fetch. `pnpm run probe:check` fails CI if the two ever disagree.
 */

const { headline, buckets, dataset, probeDate } = probe;

/** 18 cells, one per clip, coloured by the bucket the probe measured it into. */
export function DistributionStrip() {
  const cells: { cls: string; label: string }[] = [
    ...Array.from({ length: buckets.perfect }, () => ({ cls: "dist-perfect", label: "word-perfect" })),
    ...Array.from({ length: buckets.good }, () => ({ cls: "dist-good", label: "WER 0-0.15" })),
    ...Array.from({ length: buckets.moderate }, () => ({ cls: "dist-moderate", label: "WER 0.15-0.4" })),
    ...Array.from({ length: buckets.bad }, () => ({ cls: "dist-bad", label: "WER above 0.4" })),
  ];

  return (
    <div className="stack gap-2" data-testid="distribution-strip">
      <div
        className="dist"
        role="img"
        aria-label={`Distribution of ${headline.total} clips by measured word error rate: ${buckets.perfect} word-perfect, ${buckets.good} between 0 and 0.15, ${buckets.moderate} between 0.15 and 0.4, ${buckets.bad} above 0.4.`}
      >
        {cells.map((cell, i) => (
          <span key={i} className={`dist-cell ${cell.cls}`} title={`clip ${i + 1} — ${cell.label}`} />
        ))}
      </div>
      <ul className="legend">
        <li>
          <span className="swatch dist-perfect" />
          {buckets.perfect} word-perfect
        </li>
        <li>
          <span className="swatch dist-good" />
          {buckets.good} near-perfect
        </li>
        <li>
          <span className="swatch dist-moderate" />
          {buckets.moderate} moderate
        </li>
        <li>
          <span className="swatch dist-bad" />
          {buckets.bad} broken
        </li>
      </ul>
    </div>
  );
}

/** Provenance: the exact corpus, models, precisions and sample the number came from. */
export function ProvenanceChips() {
  const chips: [string, string][] = [
    ["model", "whisper tiny.en + base.en"],
    ["precision", "fp32 + q8"],
    ["n", `${dataset.clips} clips / ${dataset.speakers} speakers`],
    ["control", `${dataset.controlClips} clips / ${dataset.controlSpeakers} speakers`],
    ["corpus", `Common Voice v22.0 · ${dataset.license}`],
    ["audio", `${dataset.audioSeconds}s · mean ${dataset.meanClipSeconds}s`],
    ["runtime", "onnxruntime-node"],
    ["measured", probeDate],
  ];

  return (
    <ul className="chips" data-testid="provenance-chips">
      {chips.map(([k, v]) => (
        <li key={k} className="chip">
          {k} <b>{v}</b>
        </li>
      ))}
    </ul>
  );
}
