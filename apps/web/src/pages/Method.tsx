import { Link } from "react-router-dom";
import { probe } from "../data/probe.generated";
import { ProvenanceChips } from "../components/probe/Finding";
import { ControlComparison } from "../components/probe/ControlComparison";

/**
 * /method — the full measurement, for the reader who wants the tables.
 *
 * Every number is read out of docs/batch2-asr-probe.md at build time by
 * scripts/extract-probe.mjs. This page used to hand-transcribe them into
 * JSX, and had already drifted: it claimed the class-B confusion "recurs in
 * 3 of the 4 clip×model combinations" when the document says it appears in
 * ALL FOUR and that three of those four converge on the same wrong word.
 * That is exactly the drift `pnpm run probe:check` now prevents.
 */
export function MethodPage() {
  const { classB, headline, dataset, adjusted, distributions, taxonomy } = probe;

  return (
    <div className="page stack gap-6">
      <header className="stack gap-4 section">
        <p className="eyebrow">method · {probe.source}</p>
        <h1 className="display">The measurement, in full</h1>
        <p className="lede">
          An {dataset.clips}-clip probe of Filipino-accented English against Whisper tiny.en and base.en, with a{" "}
          {dataset.controlClips}-clip US-tagged control group run through the identical pipeline on the same day.
        </p>
        <ProvenanceChips />
      </header>

      <section aria-labelledby="dist-heading" className="stack gap-4">
        <div className="section-head">
          <h2 id="dist-heading" className="h2">
            Word error rate by model and precision
          </h2>
          <p className="prose">
            Reported at both precisions because the quantized artifact is the one a browser actually ships. The probe
            is explicit that its own first pass silently pulled full-precision weights no browser build would use.
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Precision</th>
                <th scope="col">Mean</th>
                <th scope="col">Median</th>
                <th scope="col">Stdev</th>
                <th scope="col">Min</th>
                <th scope="col">Max</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={`${d.model}-${d.precision}`}>
                  <td>{d.model}</td>
                  <td>{d.precision}</td>
                  <td className="num">{d.mean.toFixed(4)}</td>
                  <td className="num">{d.median.toFixed(4)}</td>
                  <td className="num">{d.stdev.toFixed(4)}</td>
                  <td className="num">{d.min.toFixed(3)}</td>
                  <td className="num">{d.max.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats stats-quad">
          <div className="stat">
            <span className="stat-value">
              {headline.perfect}/{headline.total}
            </span>
            <span className="stat-label">word-perfect in every one of the four model/precision runs</span>
          </div>
          <div className="stat">
            <span className="stat-value">{headline.perfectPct}%</span>
            <span className="stat-label">of clips with zero errors</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {headline.withError}/{headline.total}
            </span>
            <span className="stat-label">contain at least one real error</span>
          </div>
          <div className="stat">
            <span className="stat-value">{dataset.speakers}</span>
            <span className="stat-label">unique speakers, max two clips each</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="control-heading2" className="stack gap-4">
        <div className="section-head">
          <h2 id="control-heading2" className="h2">
            Against the control group
          </h2>
        </div>
        <ControlComparison />
      </section>

      <section aria-labelledby="classb-heading" className="stack gap-4">
        <div className="section-head">
          <h2 id="classb-heading" className="h2">
            The one class-B finding
          </h2>
        </div>
        <div className="grid-2">
          <article className="card">
            <p className="card-tag">measured</p>
            <p className="h3">
              <code>{classB.ref}</code> → <code>{classB.hyp}</code>
            </p>
            <p className="prose">
              Mis-transcribed in every one of the {classB.combinations} clip×model combinations it appears in, across{" "}
              {classB.speakers} speakers, in both models. {classB.convergent} of those {classB.combinations} land on
              the identical wrong word; the fourth lands on <code>trap</code>, which shares the same vowel.
            </p>
          </article>
          <article className="card">
            <p className="card-tag">not claimed</p>
            <p className="h3">A population-level finding</p>
            <p className="prose">
              One recurring word-pair at n={dataset.clips} is suggestive, not proof of a general phonological effect,
              and the source document does not claim more than that. Neither does this page.
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="detail-heading2" className="stack gap-3">
        <div className="section-head">
          <h2 id="detail-heading2" className="h2">
            The rest of the method
          </h2>
        </div>

        <details className="disclosure">
          <summary>How word error rate is computed</summary>
          <div className="disclosure-body prose">
            <p>
              WER = (substitutions + deletions + insertions) / reference word count, from a word-level Levenshtein
              alignment with full backtrace. Normalization: lowercase, strip punctuation except apostrophes, collapse
              whitespace. That engine lives in <code>packages/core</code> and is the same one scoring your own audio,
              so the numbers here and the numbers the app produces are computed identically.
            </p>
            <p>
              Whisper&apos;s full <code>EnglishTextNormalizer</code> is deliberately <em>not</em> implemented. That
              scope cut has a measurable cost — <code>four</code> vs <code>4</code>, and <code>its</code> vs{" "}
              <code>it&apos;s</code>, both inflate raw WER — so both a raw and an adjusted figure are reported below
              rather than only the flattering one.
            </p>
          </div>
        </details>

        <details className="disclosure">
          <summary>Raw vs artifact-adjusted word error rate</summary>
          <div className="disclosure-body">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Model / dtype</th>
                    <th scope="col">Raw mean</th>
                    <th scope="col">Raw median</th>
                    <th scope="col">Adjusted mean</th>
                    <th scope="col">Adjusted median</th>
                    <th scope="col">Clips affected</th>
                  </tr>
                </thead>
                <tbody>
                  {adjusted.map((a) => (
                    <tr key={a.label}>
                      <td>{a.label}</td>
                      <td className="num">{a.rawMean.toFixed(4)}</td>
                      <td className="num">{a.rawMedian.toFixed(4)}</td>
                      <td className="num">{a.adjustedMean.toFixed(4)}</td>
                      <td className="num">{a.adjustedMedian.toFixed(4)}</td>
                      <td className="num">{a.clipsAffected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>

        <details className="disclosure">
          <summary>Error taxonomy, and why it is a spelling proxy</summary>
          <div className="disclosure-body stack gap-3">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">tiny.en</th>
                    <th scope="col">base.en</th>
                  </tr>
                </thead>
                <tbody>
                  {taxonomy.map((t) => (
                    <tr key={t.category}>
                      <td style={t.isSub ? { paddingLeft: "2rem", color: "var(--fg-muted)" } : undefined}>
                        {t.category}
                      </td>
                      <td className="num">{t.tiny}</td>
                      <td className="num">{t.base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="prose">
              Classification is done on the <strong>spelling</strong> of substituted words, not on phonetic evidence —
              no forced alignment, no phonetic recognizer. A tag therefore means &ldquo;this spelling pattern is
              consistent with X&rdquo;, never &ldquo;X was confirmed&rdquo;. The control group then falsified that
              proxy on its own terms: it fired on a nominally native-English speaker misreading a Greek surname, which
              is precisely why no single per-clip result is presented as attributable to the speaker.
            </p>
          </div>
        </details>

        <details className="disclosure">
          <summary>Verdict, and the condition attached to it</summary>
          <div className="disclosure-body prose">
            <p>
              <strong>{probe.verdict}</strong>, on one binding condition: never present a single per-clip result as
              attributable to the speaker. That condition is enforced by{" "}
              <code>packages/core/test/evidence-classes.test.ts</code>, which fails the build if speaker-judging
              language reaches the app&apos;s copy — a test, not a style guideline.
            </p>
            <p>
              <Link to="/docs/limitations">What this tool cannot tell you</Link>
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
