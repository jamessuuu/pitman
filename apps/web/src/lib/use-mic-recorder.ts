import { useCallback, useRef, useState } from "react";

export type MicStatus = "idle" | "requesting" | "recording" | "denied" | "unsupported" | "error" | "timeout";

const PERMISSION_TIMEOUT_MS = 15_000;

/**
 * Mic capture. D3 (docs/pitman-SPEC.md): mic-denied/no-mic must land on a
 * fully functional file-drop path, never a dead end — this hook only ever
 * reports its own status; it never disables or hides the Dropzone (see
 * pages/Listen.tsx, where the Dropzone always renders unconditionally).
 *
 * Real finding from manual verification (mcp__agent-browser): if the
 * browser's native permission prompt is never answered (observed: a
 * headed Chrome profile with no real microphone and no auto-answer
 * policy), getUserMedia()'s promise never settles — no error, no
 * timeout, forever. Un-timeboxed, that would leave the mic button stuck
 * on "Requesting microphone access…" with no way out except reloading —
 * its own small dead end, even though file-drop stays usable underneath.
 * Race against a timeout so the UI always recovers to an actionable state.
 */
export function useMicRecorder(onRecording: (file: File) => void) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");
    let stream: MediaStream;
    // Kept outside the race so a late permission grant (after we've already
    // given up and shown "timeout") doesn't leave an orphaned open
    // microphone stream running in the background.
    const rawRequest = navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      stream = await Promise.race([
        rawRequest,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("mic-permission-timeout")), PERMISSION_TIMEOUT_MS),
        ),
      ]);
    } catch (err) {
      if (err instanceof Error && err.message === "mic-permission-timeout") {
        rawRequest.then((lateStream) => lateStream.getTracks().forEach((t) => t.stop())).catch(() => {});
        setStatus("timeout");
        return;
      }
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("denied");
      } else if (name === "NotFoundError") {
        setStatus("unsupported");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const file = new File([blob], "recording.webm", { type: blob.type });
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onRecording(file);
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }, [onRecording]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    setStatus("idle");
  }, []);

  return { status, errorMessage, start, stop };
}
