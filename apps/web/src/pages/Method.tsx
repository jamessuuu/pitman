// /method — docs/pitman-SPEC.md Surfaces §4: "the probe story: dataset
// provenance, the control group that broke our own first proxy, per-model
// numbers." Every number below is copied from docs/batch2-asr-probe.md,
// not recomputed or rounded differently — that source document is the
// single source of truth; if the two ever disagree, the source document
// wins and this page has drifted.
export function MethodPage() {
  return (
    <section className="page page-wide" aria-labelledby="method-heading">
      <h1 id="method-heading">Method</h1>
      <p className="lede">
        pitman is built on a real measurement, not a hunch: an 18-clip probe of Filipino-accented English against
        Whisper tiny.en and base.en, with an 18-clip US-tagged control group run through the identical pipeline on
        the same day. The full document is committed at{" "}
        <code>docs/batch2-asr-probe.md</code>; this page summarizes it.
      </p>

      <h2>Dataset</h2>
      <p>
        18 clips from 12 speakers, drawn from Mozilla Common Voice English v22.0 (via the ungated{" "}
        <code>fsicoli/common_voice_22_0</code> mirror on Hugging Face), licensed CC0-1.0. Selected from the{" "}
        <code>test.tsv</code> split by: self-reported accent tag containing &ldquo;Filip&rdquo; as the primary tag,{" "}
        <code>down_votes == 0</code>, <code>up_votes &gt;= 2</code>, sentence length 4-25 words, and at most 2 clips
        per speaker. A second, separately-built 18-clip/18-speaker control group used the identical filters against
        a single-tag &ldquo;United States English&rdquo; accent instead.
      </p>

      <h2>WER methodology</h2>
      <p>
        Word Error Rate = (Substitutions + Deletions + Insertions) / reference word count, from a word-level
        Levenshtein alignment with full backtrace (ported into <code>packages/core</code> and tested against every
        known-answer pair below). Normalization: lowercase, strip punctuation except apostrophes, collapse
        whitespace — matching what pitman&apos;s own WER engine does at runtime, so the numbers below and the
        numbers this app produces on your own audio are computed the same way.
      </p>

      <h2>Results — mean WER by model and precision</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Precision</th>
              <th scope="col">Filipino-tagged (n=18)</th>
              <th scope="col">US-tagged control (n=18)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>whisper-tiny.en</td>
              <td>fp32</td>
              <td>0.1795</td>
              <td>0.1258</td>
            </tr>
            <tr>
              <td>whisper-tiny.en</td>
              <td>q8 (what browsers ship)</td>
              <td>0.2076</td>
              <td>—</td>
            </tr>
            <tr>
              <td>whisper-base.en</td>
              <td>fp32</td>
              <td>0.1852</td>
              <td>0.0840</td>
            </tr>
            <tr>
              <td>whisper-base.en</td>
              <td>q8 (what browsers ship)</td>
              <td>0.1574</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The shape that matters more than any single mean: <strong>7 of 18 clips (39%) were transcribed perfectly in
        every one of the four model/precision combinations</strong>. The remaining clips spread across a real tail
        out to WER 0.5-1.125, rather than clustering just above zero. That mix — a solid cluster of clean
        transcriptions plus a genuine tail of real breakage — is what a per-clip confidence and diff tool has
        something honest to show on.
      </p>

      <h2>The two evidence classes</h2>
      <p>
        The probe&apos;s error taxonomy splits into exactly two explainable buckets — and pitman never offers a
        third, invented explanation. When the app flags a mismatch, it only ever cites one of these two, or says
        plainly that no established pattern applies yet.
      </p>
      <dl className="class-defs">
        <dt>Class A — the model doesn&apos;t know the word</dt>
        <dd>
          Rare proper nouns and place names the model has never seen written out, so it guesses wrong for anyone.
          The control group is what proves this: the identical failure mode, including one identical
          spelling-pattern (a Greek surname, &ldquo;Vlachos&rdquo; → &ldquo;Blachel&rdquo;), showed up on a
          nominally native-English speaker misreading an unfamiliar name. A rare word is rare for everyone.
        </dd>
        <dt>Class B — documented across multiple speakers</dt>
        <dd>
          &ldquo;track&rdquo; → &ldquo;truck&rdquo; is the probe&apos;s one qualifying case: it recurs in 3 of the 4
          clip×model combinations it appears in, across 2 different Filipino-tagged speakers, in both models, with
          no counterpart anywhere in the control group. One recurring, evidenced word-pair — not a general claim
          about a sound.
        </dd>
      </dl>

      <h2>What the control group does and doesn&apos;t prove</h2>
      <p>
        A real, consistent gap shows up in every cut of the data: more errors, more error operations, and a
        strictly higher median WER on the Filipino-tagged set than on the control, in both models. But this is an{" "}
        <strong>unmatched-groups comparison</strong> — the two groups read different sentences, so some of the gap
        could be sentence-difficulty variance rather than anything about the speech itself. And the rare-word
        failure mode (class A) is confirmed present in <em>both</em> groups, not unique to the Filipino set — which
        is exactly why pitman never attributes a class-A miss to how something was said. The honest reading: some
        of the gap is generic ASR weakness on uncommon words that would trip up any accent at similar rates, and
        some residual gap is not explained by that alone — anchored by the one class-B finding that has no
        control-group counterpart at all.
      </p>

      <h2>Verdict</h2>
      <p>
        The probe&apos;s own conclusion — <strong>VIABLE-INTERESTING</strong>, on one binding condition: never
        present a single per-clip result as attributable to the speaker. This is the framing law pitman is built
        around, and it is enforced by an automated test
        (<code>packages/core/test/evidence-classes.test.ts</code>) that fails the build if the word &ldquo;accent&rdquo;
        — or any other speaker-judging language — ever appears in the app&apos;s own copy.
      </p>
    </section>
  );
}
