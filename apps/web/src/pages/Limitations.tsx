// /docs/limitations — the honest limits surface required by
// BATCH-2-STANDARDS.md. Full content (measured numbers, q8-vs-fp32 caveat,
// confidence-is-not-truth, the framing law restated) lands in M5.
export function LimitationsPage() {
  return (
    <section className="page" aria-labelledby="limitations-heading">
      <h1 id="limitations-heading">Limitations</h1>
      <p className="lede">
        pitman measures the model, never the speaker. This page will state exactly what the numbers behind pitman
        can and cannot tell you: the probe&apos;s sample size, the gap between quantized (q8) and full-precision
        (fp32) accuracy, and why per-word confidence is the model&apos;s self-report, not ground truth.
      </p>
      <p className="status-note" role="status">
        This page is a placeholder — the full limitations content is written in a later milestone.
      </p>
    </section>
  );
}
