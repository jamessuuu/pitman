// /method — the probe story: dataset provenance, the control group, per-model
// numbers (docs/pitman-SPEC.md Surfaces §4). Full content lands in M5; this
// scaffold links to the source document so the story is never unreachable.
export function MethodPage() {
  return (
    <section className="page" aria-labelledby="method-heading">
      <h1 id="method-heading">Method</h1>
      <p className="lede">
        pitman is built on a real measurement, not a hunch: an 18-clip probe of Filipino-accented English against
        Whisper tiny.en and base.en, with a US-tagged control group run through the identical pipeline. The full
        writeup — dataset provenance, WER methodology, the error taxonomy, and the control-group comparison — is
        being ported into this page in a later milestone.
      </p>
      <p className="status-note" role="status">
        In the meantime, the source document is committed at <code>docs/batch2-asr-probe.md</code>.
      </p>
    </section>
  );
}
