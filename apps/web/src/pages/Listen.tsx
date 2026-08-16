import { Dropzone } from "../components/Dropzone";
import { MicButton } from "../components/MicButton";
import { ModelPanel } from "../components/ModelPanel";
import { ConfidenceViz } from "../components/ConfidenceViz";
import { DiffView } from "../components/DiffView";
import { useAsr } from "../lib/use-asr";
import { decodeAudioFileTo16kMono, AudioDecodeError } from "../lib/decode-audio";
import { useCallback, useState } from "react";

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

  const busy = state.status === "loading-model" || state.status === "transcribing";

  return (
    <section className="page" aria-labelledby="listen-heading">
      <h1 id="listen-heading">See exactly what the model heard</h1>
      <p className="lede">
        Record a short clip or drop a WAV/MP3 file. pitman transcribes it entirely on your device — nothing leaves
        your browser — and shows you the model&apos;s transcript with per-word confidence.
      </p>

      <MicButton onRecording={handleFile} disabled={busy} />
      <Dropzone onFile={handleFile} disabled={busy} />

      <p className="status-note" role="status" aria-live="polite" data-testid="asr-status">
        {state.status === "loading-model" && state.downloadProgressPct !== null
          ? `Loading the model on your device… ${Math.round(state.downloadProgressPct)}%`
          : STATUS_COPY[state.status]}
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

      {state.status === "done" && state.text && <DiffView heard={state.text} />}

      <ModelPanel state={state} />
    </section>
  );
}
