import { useCallback, useId, useState } from "react";

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/**
 * File-drop input (docs/pitman-SPEC.md D3: this path must work standalone,
 * mic capture is layered on in M3).
 *
 * The visible control is a styled label; the real `<input type="file">` is an
 * opacity-0 overlay covering it at full size. That ordering matters:
 *
 * - The browser's default file control renders an unstyled system button and
 *   a "No file chosen" string, which was the loudest unfinished element left
 *   on the page.
 * - Hiding the input with `display:none` or `left:-9999px` would break the
 *   audits this project already fixed once (a zero-size or off-viewport
 *   focusable control fails the clipped-control and touch-target checks).
 *   A full-size transparent overlay keeps the input's real box on screen,
 *   keeps it focusable and keyboard-operable, and keeps the native picker
 *   one click away anywhere on the control.
 * - It stays `data-testid="file-input"`, so `setInputFiles` is unaffected.
 *   The e2e assertion for "the file path is available" now points at the
 *   visible affordance (`file-control`) rather than at the transparent input,
 *   because asserting on the thing a person can actually see is the point of
 *   that test.
 */
export function Dropzone({ onFile, disabled = false }: DropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) {
        setFileName(file.name);
        onFile(file);
      }
    },
    [onFile],
  );

  return (
    <div
      className={isDragging ? "dropzone dropzone-active" : "dropzone"}
      data-testid="dropzone"
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
    >
      <p className="dropzone-hint">
        {isDragging ? "Drop it — nothing is uploaded." : "Drop a WAV or MP3 here, or pick one. It is decoded and transcribed in this tab."}
      </p>

      <label
        className={disabled ? "file-control file-control-disabled" : "file-control"}
        htmlFor={inputId}
        data-testid="file-control"
      >
        <span className="file-control-btn">Choose an audio file</span>
        <span className="file-control-name data" data-testid="file-control-name">
          {fileName ?? "WAV or MP3"}
        </span>
        <input
          id={inputId}
          data-testid="file-input"
          className="file-input-overlay"
          type="file"
          accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
