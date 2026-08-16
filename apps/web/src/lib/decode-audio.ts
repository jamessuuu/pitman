// Decode an arbitrary audio File (wav/mp3/etc.) to the 16kHz mono
// Float32Array whisper expects, entirely with the Web Audio API — no
// upload, no server round-trip (docs/pitman-SPEC.md: "Nothing leaves the
// device — Network-tab verifiable").
const WHISPER_SAMPLE_RATE = 16000;

export class AudioDecodeError extends Error {}

export async function decodeAudioFileTo16kMono(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();

  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new AudioDecodeError("This browser has no Web Audio API — cannot decode audio on-device.");
  }

  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (err) {
    throw new AudioDecodeError(`Could not decode "${file.name}" as audio: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    void decodeCtx.close();
  }

  if (decoded.sampleRate === WHISPER_SAMPLE_RATE && decoded.numberOfChannels === 1) {
    return decoded.getChannelData(0).slice();
  }

  // Resample + downmix to mono via OfflineAudioContext, the standard
  // web-platform way to do this without shipping a resampling library.
  const durationSeconds = decoded.duration;
  const offline = new OfflineAudioContext(1, Math.ceil(durationSeconds * WHISPER_SAMPLE_RATE), WHISPER_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}
