// Byte formatting for the "true download size" readout
// (docs/pitman-SPEC.md Surfaces §3). The actual byte count comes from
// transformers.js's own progress_callback (src/lib/asr-pipeline.ts), not
// the Resource Timing API: Hugging Face's CDN responses lack
// Timing-Allow-Origin, so transferSize/encodedBodySize read 0 for every
// cross-origin entry regardless of real transfer size — confirmed by
// manual in-browser inspection during M2 (real multi-second download
// durations, transferSize still 0 on every entry).
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B (cached)";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
