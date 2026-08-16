// /docs/limitations — BATCH-2-STANDARDS.md MUST: "an honest limits surface:
// what this tool cannot know, where the numbers come from, what was NOT
// measured." docs/pitman-SPEC.md: "Numbers come from an 18-clip probe...
// small n, stated; q8 differs from fp32; confidence is self-report, not
// truth; the tool measures the model, not the speaker — restate the
// framing law verbatim."
export function LimitationsPage() {
  return (
    <section className="page page-wide" aria-labelledby="limitations-heading">
      <h1 id="limitations-heading">Limitations</h1>
      <p className="lede">
        Everything on this page is a real, stated limit of what pitman can tell you — not a disclaimer buried to
        protect a claim. If a number or a claim elsewhere in this app needs a caveat, it lives here.
      </p>

      <h2>The framing law, restated</h2>
      <p>
        pitman never judges the speaker. Every mismatch is framed as model behavior — &ldquo;the model heard
        X&rdquo; — and any explanation offered for why traces to exactly one of two evidenced classes: the model
        doesn&apos;t know a word (general vocabulary gap, not specific to any one speaker group), or a specific
        confusion documented across multiple speakers. Where neither applies, pitman states the mismatch and stops
        — it does not invent a cause. See <a href="/method">/method</a> for the full evidence behind both classes.
      </p>

      <h2>The sample is small</h2>
      <p>
        Every number on the <a href="/method">method page</a> comes from an 18-clip probe (12 speakers) and an
        18-clip control group (18 speakers) — not a population study. A pattern holding across 2 speakers (the
        probe&apos;s one class-B finding) is real and documented, but it is not proof of a general rule; the probe
        document says this explicitly and this app inherits that caveat rather than rounding it away.
      </p>

      <h2>q8 vs. fp32 — what actually ships to your browser</h2>
      <p>
        pitman defaults to the quantized (q8) model, because q8 — not full-precision fp32 — is what a real browser
        deployment ships. On a device where your browser can use WebGPU, that is exactly what runs. On the wasm
        fallback path, this build hit a real limitation: the ONNX Runtime build shipped by this browser
        environment cannot construct a session for the quantized decoder graph at all (a specific, reproduced
        error, not a guess — see <code>docs/DEVIATIONS.md</code>&apos;s &ldquo;M2 — D2 finding&rdquo;), so wasm
        loads the larger, full-precision (fp32) model instead. When that happens, the model panel says so
        directly, every time — it is never silent about which precision actually ran.
      </p>
      <p>
        A second, separate finding: the browser&apos;s own audio decoding (Web Audio API, for both the microphone
        and file-drop paths) is not byte-identical to the pipeline the probe used to measure its published numbers
        (ffmpeg-decoded WAV files, transcribed in Node.js). For most clips this makes no visible difference; for at
        least one of the three committed reference clips, the in-browser transcription measurably diverges from
        the probe&apos;s own number for that clip. The numbers on the method page are the probe&apos;s Node.js
        measurement — reported for comparison, never silently substituted for what this app measures live in your
        browser.
      </p>

      <h2>Confidence is the model&apos;s self-report, not ground truth</h2>
      <p>
        The per-word confidence you see in Listen mode is a real, computed number — the probability the model
        itself assigned to the word it produced, recovered from the model&apos;s own logits (see{" "}
        <code>src/lib/confidence.ts</code>). It is not independently verified against what was actually said, and
        it is not a measure of how understandable your speech was to a human. A model can be highly confident
        about a wrong word (this app&apos;s own reference-clip testing found exactly that: a confused
        &ldquo;truck&rdquo; scored 96% confidence) — confidence measures the model&apos;s certainty, not
        correctness.
      </p>

      <h2>What was not measured</h2>
      <ul>
        <li>No claim is made about pronunciation, phonetic correctness, or intelligibility to a human listener.</li>
        <li>No claim is made about any accent, dialect, or speaker population beyond the two named evidence classes and their stated evidence.</li>
        <li>The probe covers English only, read from Common Voice&apos;s crowd-sourced prompts — not spontaneous or conversational speech.</li>
      </ul>
    </section>
  );
}
