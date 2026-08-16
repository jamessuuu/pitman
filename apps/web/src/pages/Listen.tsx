// Listen mode — record or drop a clip, transcribe on-device, show confidence
// + diff. Scaffolded in M0; the actual pipeline, mic/file-drop UI, and
// confidence/diff visualization are built in M2-M4 (docs/pitman-SPEC.md).
export function ListenPage() {
  return (
    <section className="page" aria-labelledby="listen-heading">
      <h1 id="listen-heading">See exactly what the model heard</h1>
      <p className="lede">
        Record a short clip or drop a WAV/MP3 file. pitman transcribes it entirely on your device — nothing leaves
        your browser — and shows you the model&apos;s transcript with per-word confidence.
      </p>
      <p className="status-note" role="status">
        Listen mode is under construction. The on-device model pipeline lands in a later milestone.
      </p>
    </section>
  );
}
