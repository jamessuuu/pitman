import { useCallback, useId, useRef, useState } from "react";

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/** File-drop input (docs/pitman-SPEC.md D3: this path must work standalone, mic capture is layered on in M3). */
export function Dropzone({ onFile, disabled = false }: DropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
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
      <label htmlFor={inputId}>Drop a WAV or MP3 here, or choose a file — it is decoded and transcribed in this tab.</label>
      <input
        ref={inputRef}
        id={inputId}
        data-testid="file-input"
        type="file"
        accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
