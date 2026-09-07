import { useCallback, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Dropzone } from "../components/Dropzone";
import { MicButton } from "../components/MicButton";
import { ModelPanel } from "../components/ModelPanel";
import { ConfidenceViz } from "../components/ConfidenceViz";
import { DiffView } from "../components/DiffView";
import { DistributionStrip, ProvenanceChips } from "../components/probe/Finding";
import { MisheardPairs } from "../components/probe/Misheard";
import { ControlComparison } from "../components/probe/ControlComparison";
import { WorkedExample } from "../components/probe/WorkedExample";
import { useAsr } from "../lib/use-asr";
import { decodeAudioFileTo16kMono, AudioDecodeError } from "../lib/decode-audio";
import { probe } from "../data/probe.generated";

const STATUS_COPY: Record<string, string> = {
  idle: "",
  "loading-model": "Loading the model on your device…",
  transcribing: "Transcribing on-device…",
  done: "Done.",
  error: "Something went wrong.",
};

export function ListenPage() {
  const { state, transcribeAudio } = useAsr();
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const initialMeant = searchParams.get("meant") ?? "";
  const liveRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setDecodeError(null);
      try {
        const audio = await decodeAudioFileTo16kMono(file);
        await transcribeAudio(audio);
      } catch (err) {
        if (err instanceof AudioDecodeError) {
          setDecodeError(err.message);
        } else {
          setDecodeError(`Unexpected error reading "${file.name}": ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    },
    [transcribeAudio],
  );

  const goLive = useCallback(() => {
    liveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    liveRef.current?.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true });
  }, []);

  const busy = state.status === "loading-model" || state.status === "transcribing";
  const { headline, classB } = probe;

  return (
    <>
      {/* ---------- the finding, and the tool that produced it ---------- */}
      <section className="ambient" aria-labelledby="listen-heading">
        <div className="page hero">
          <div className="hero-grid">
            <div className="stack gap-4 rise">
              <p className="eyebrow">on-device speech · measured {probe.probeDate}</p>
              <h1 id="listen-heading" className="display">
                Whisper got <em>{headline.perfect} of {headline.total}</em> clips word-perfect. Here is exactly what
                it heard on the other {headline.withError}.
              </h1>
              <p className="lede">
                pitman shows what a browser speech model actually transcribed — the words, the confidence, the diff
                against what you meant — entirely on your device. It reports the model&apos;s behaviour. It never
                grades the speaker.
              </p>
              <ProvenanceChips />
              <DistributionStrip />
            </div>

            <div className="rise rise-2">
              <WorkedExample onGoLive={goLive} />
            </div>
          </div>
        </div>
      </section>

      <div className="page stack gap-8">
        {/* ---------- what it heard instead ---------- */}
        <section className="section" aria-labelledby="heard-heading">
          <div className="section-head">
            <p className="eyebrow">§7 · ten real pairs, ascending error rate</p>
            <h2 id="heard-heading" className="h2">
              What it heard instead
            </h2>
            <p className="prose">
              Every line below is a measured transcription of a real recording, not an illustration. The highlighted
              words come from the alignment engine, not from a person marking them up.
            </p>
          </div>
          <MisheardPairs />
        </section>

        {/* ---------- the control group ---------- */}
        <section className="section" aria-labelledby="control-heading">
          <div className="section-head">
            <p className="eyebrow">§8 · the check the probe ran on itself</p>
            <h2 id="control-heading" className="h2">
              A control group, or the gap means nothing
            </h2>
            <p className="prose">
              An {probe.dataset.controlClips}-clip US-tagged set went through the identical pipeline on the same day.
              Without it, &ldquo;the model made errors here&rdquo; is indistinguishable from &ldquo;the model makes
              errors&rdquo;.
            </p>
          </div>
          <ControlComparison />
        </section>

        {/* ---------- the two evidence classes ---------- */}
        <section className="section" aria-labelledby="classes-heading">
          <div className="section-head">
            <p className="eyebrow">the framing law</p>
            <h2 id="classes-heading" className="h2">
              Two explanations, separately evidenced. Never a third.
            </h2>
          </div>
          <div className="grid-2">
            <article className="card">
              <p className="card-tag">
                <span className="tab-dot dot-A" aria-hidden="true" />
                class A · vocabulary gap
              </p>
              <p className="h3">The model has never seen the word</p>
              <p className="prose">
                Rare proper nouns, so it guesses wrong for everyone. The control set proves it: a nominally
                native-English speaker misreading the Greek surname <code>Vlachos</code> broke the identical way,
                tripping the identical spelling-pattern heuristic. A rare word is rare for everybody.
              </p>
            </article>
            <article className="card">
              <p className="card-tag">
                <span className="tab-dot dot-B" aria-hidden="true" />
                class B · documented across speakers
              </p>
              <p className="h3">
                <code>{classB.ref}</code> → <code>{classB.hyp}</code>
              </p>
              <p className="prose">
                Mis-transcribed in <strong>every one of the {classB.combinations}</strong> clip×model combinations it
                appears in, across {classB.speakers} different speakers, with{" "}
                <strong>{classB.convergent} of those {classB.combinations}</strong> landing on the identical wrong
                word — and no counterpart anywhere in the control set. One evidenced word-pair. Not a claim about a
                sound in general.
              </p>
            </article>
          </div>
          <p className="prose" style={{ marginTop: "1.25rem" }}>
            <strong>
              pitman never attributes a mismatch to how someone speaks.
            </strong>{" "}
            That is not a style guideline — it is enforced by a test that fails the build if speaker-judging language
            reaches the app&apos;s copy (<code>packages/core/test/evidence-classes.test.ts</code>). When neither class
            applies, the tool says no established pattern applies, and stops.
          </p>
        </section>

        {/* ---------- live tool ---------- */}
        <section className="section" aria-labelledby="live-heading" ref={liveRef}>
          <div className="section-head">
            <p className="eyebrow">your turn</p>
            <h2 id="live-heading" className="h2">
              Run it on your own audio
            </h2>
            <p className="prose">
              Record a clip or drop a WAV/MP3. The model downloads to your device on first use and the audio never
              leaves the tab — asserted by an e2e test that fails on any non-GET request or any host outside the
              model CDN.
            </p>
          </div>

          <div className="tool">
            <div className="tool-actions">
              <MicButton onRecording={handleFile} disabled={busy} />
            </div>

            <Dropzone onFile={handleFile} disabled={busy} />

            <p className="status-note" role="status" aria-live="polite" data-testid="asr-status">
              {state.status === "loading-model" && state.downloadProgressPct !== null ? (
                <>
                  <span>Loading the model on your device… {Math.round(state.downloadProgressPct)}%</span>
                  <span className="meter">
                    <span className="meter-fill" style={{ width: `${Math.round(state.downloadProgressPct)}%` }} />
                  </span>
                </>
              ) : (
                STATUS_COPY[state.status]
              )}
            </p>

            {decodeError && (
              <p className="error-note" role="alert" data-testid="decode-error">
                {decodeError}
              </p>
            )}

            {state.status === "error" && state.errorMessage && (
              <p className="error-note" role="alert" data-testid="asr-error">
                {state.errorMessage}
              </p>
            )}

            {state.words.length > 0 ? (
              <ConfidenceViz words={state.words} />
            ) : (
              state.text && (
                <p className="transcript" data-testid="transcript">
                  {state.text}
                </p>
              )
            )}

            {state.status === "done" && state.text && <DiffView heard={state.text} initialMeant={initialMeant} />}

            <ModelPanel state={state} />
          </div>

          <p className="small" style={{ marginTop: "0.9rem" }}>
            Not sure what to say? The{" "}
            <Link to="/reference" className="ref-card-try" style={{ display: "inline" }}>
              reference cards
            </Link>{" "}
            are sentences chosen from the probe&apos;s own findings.
          </p>
        </section>

        {/* ---------- the long argument, folded ---------- */}
        <section className="section" aria-labelledby="detail-heading">
          <div className="section-head">
            <p className="eyebrow">detail</p>
            <h2 id="detail-heading" className="h2">
              How the measurement was made
            </h2>
          </div>

          <details className="disclosure">
            <summary>Dataset and selection</summary>
            <div className="disclosure-body prose">
              <p>
                {probe.dataset.clips} clips from {probe.dataset.speakers} speakers, drawn from{" "}
                {probe.dataset.corpus} ({probe.dataset.license}) via the ungated{" "}
                <code>fsicoli/common_voice_22_0</code> mirror. Filters: primary self-reported tag containing
                &ldquo;Filip&rdquo;, no community down-votes, at least two up-votes, 4-25 word sentences, at most two
                clips per speaker. The control group used identical filters against a single-tag &ldquo;United States
                English&rdquo; population. {probe.dataset.audioSeconds}s of audio, mean{" "}
                {probe.dataset.meanClipSeconds}s per clip.
              </p>
              <p>{probe.dataset.measuredWith}. Full document: <code>{probe.source}</code>.</p>
            </div>
          </details>

          <details className="disclosure">
            <summary>Why these numbers are on this page and not in a spreadsheet</summary>
            <div className="disclosure-body prose">
              <p>
                Every figure here is parsed out of <code>{probe.source}</code> at build time by{" "}
                <code>scripts/extract-probe.mjs</code> and compiled into the bundle. Nothing is fetched at runtime, so
                this page cannot deploy successfully and then render empty; and <code>pnpm run probe:check</code>{" "}
                fails CI the moment the document and the page disagree.
              </p>
            </div>
          </details>

          <details className="disclosure">
            <summary>What this measurement does not establish</summary>
            <div className="disclosure-body prose">
              <p>
                The two groups read different sentences, so this is an unmatched-groups comparison — some of the gap
                is sentence difficulty rather than anything about the speech. The class-A failure mode is confirmed
                present in <em>both</em> groups. At n={probe.dataset.clips} the model-size and quantization deltas sit
                inside the noise: the honest statement is that they shift <em>which</em> clips fail, not that one
                model is better. Verdict recorded by the probe: <strong>{probe.verdict}</strong>.
              </p>
              <p>
                <Link to="/method">Full method</Link> · <Link to="/docs/limitations">Limitations</Link>
              </p>
            </div>
          </details>
        </section>
      </div>
    </>
  );
}
