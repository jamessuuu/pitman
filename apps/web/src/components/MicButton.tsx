import { useMicRecorder, type MicStatus } from "../lib/use-mic-recorder";

const STATUS_COPY: Record<MicStatus, string> = {
  idle: "",
  requesting: "Requesting microphone access…",
  recording: "Recording — click again to stop.",
  denied: "Microphone access was denied. You can still drop a file below.",
  unsupported: "No microphone available in this browser. You can still drop a file below.",
  error: "Couldn't access the microphone. You can still drop a file below.",
  timeout: "The microphone permission prompt didn't get answered in time. You can try again, or drop a file below.",
};

interface MicButtonProps {
  onRecording: (file: File) => void;
  disabled?: boolean;
}

/** D3: mic capture is additive to file-drop, never a gate in front of it. */
export function MicButton({ onRecording, disabled = false }: MicButtonProps) {
  const { status, start, stop } = useMicRecorder(onRecording);
  const isRecording = status === "recording";

  return (
    <div className="mic-control">
      <button
        type="button"
        className={isRecording ? "mic-button mic-button-recording" : "mic-button"}
        onClick={isRecording ? stop : start}
        disabled={disabled || status === "requesting"}
        aria-pressed={isRecording}
      >
        {isRecording ? "Stop recording" : "Record a clip"}
      </button>
      {STATUS_COPY[status] && (
        <p className="status-note" role="status" aria-live="polite" data-testid="mic-status">
          {STATUS_COPY[status]}
        </p>
      )}
    </div>
  );
}
