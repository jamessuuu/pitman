import { Link } from "react-router-dom";
import { probe } from "../data/probe.generated";

/**
 * /docs/limitations — BATCH-2-STANDARDS.md MUST: "an honest limits surface:
 * what this tool cannot know, where the numbers come from, what was NOT
 * measured."
 *
 * Rewritten from six dense paragraphs into the four claims the page is
 * actually making, each with its number visible. The full argument survives
 * behind disclosure — cut for scanning, not for content.
 */
export function LimitationsPage() {
  const { dataset } = probe;

  return (
    <div className="page page-narrow stack gap-6">
      <header className="stack gap-4 section">
        <p className="eyebrow">limits</p>
        <h1 className="display">What this cannot tell you</h1>
        <p className="lede">
          Real limits, not a disclaimer protecting a claim. If a number anywhere in this app needs a caveat, the
          caveat is on this page.
        </p>
      </header>

      <section className="stats stats-trio" aria-label="Limits at a glance">
        <div className="stat">
          <span className="stat-value">n={dataset.clips}</span>
          <span className="stat-label">clips, {dataset.speakers} speakers — a probe, not a population study</span>
        </div>
        <div className="stat">
          <span className="stat-value">96%</span>
          <span className="stat-label">confidence the model gave a word it got wrong</span>
        </div>
        <div className="stat">
          <span className="stat-value">0</span>
          <span className="stat-label">claims made about pronunciation or intelligibility</span>
        </div>
      </section>

      <section className="grid-2" aria-label="The four limits">
        <article className="card">
          <p className="card-tag">the framing law</p>
          <p className="h3">It measures the model, never the speaker</p>
          <p className="prose">
            Every mismatch is framed as model behaviour. Any explanation offered traces to exactly one of two
            evidenced classes; where neither applies, pitman states the mismatch and stops rather than inventing a
            cause. <Link to="/method">The evidence for both classes</Link>.
          </p>
        </article>

        <article className="card">
          <p className="card-tag">sample size</p>
          <p className="h3">Small, and stated as small</p>
          <p className="prose">
            {dataset.clips} clips and {dataset.controlClips} control clips. A pattern holding across two speakers is
            real and documented; it is not proof of a general rule. The source document says so, and this app
            inherits the caveat rather than rounding it away.
          </p>
        </article>

        <article className="card">
          <p className="card-tag">confidence</p>
          <p className="h3">Self-report, not correctness</p>
          <p className="prose">
            Per-word confidence is the probability the model assigned to its own output, recovered from its logits.
            A model can be extremely confident and wrong: this project&apos;s own testing found a mistaken{" "}
            <code>truck</code> scoring 96%. Confidence measures certainty, not truth.
          </p>
        </article>

        <article className="card">
          <p className="card-tag">precision</p>
          <p className="h3">Which model actually ran</p>
          <p className="prose">
            pitman defaults to the quantized q8 artifact because that is what a browser deployment ships. Where the
            wasm runtime cannot build a session for the quantized decoder graph, it loads fp32 instead — and the
            model panel says so, every time. It is never silent about which precision ran.
          </p>
        </article>
      </section>

      <section className="stack gap-3">
        <details className="disclosure">
          <summary>Why in-browser numbers can differ from the published ones</summary>
          <div className="disclosure-body prose">
            <p>
              The browser decodes audio through the Web Audio API; the probe decoded ffmpeg-produced WAV files and
              transcribed them in Node. These are genuinely different pipelines. For most clips it makes no visible
              difference; for at least one of the three committed reference clips the in-browser result measurably
              diverges from the probe&apos;s number for that clip.
            </p>
            <p>
              The method page reports the probe&apos;s Node measurement, for comparison — never silently substituted
              for what the app measures live in your browser. That distinction is asserted by the e2e suite, not just
              described here.
            </p>
          </div>
        </details>

        <details className="disclosure">
          <summary>What was not measured at all</summary>
          <div className="disclosure-body prose">
            <ul>
              <li>Pronunciation, phonetic correctness, or intelligibility to a human listener.</li>
              <li>
                Any accent, dialect, or speaker population beyond the two named evidence classes and their stated
                evidence.
              </li>
              <li>
                Anything outside English read from Common Voice&apos;s crowd-sourced prompts — no spontaneous or
                conversational speech.
              </li>
              <li>Browser-side latency at scale; the published timings are Node measurements on one machine.</li>
            </ul>
          </div>
        </details>
      </section>
    </div>
  );
}
