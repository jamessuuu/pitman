// On-device ASR pipeline wrapper. whisper-tiny.en at q8 is the default per
// docs/pitman-SPEC.md D2 ("q8 is what browsers actually ship — the probe's
// own correction"); base.en is selectable as the documented degrade path.
//
// installInstrumentation() MUST run before this module's first import of
// @huggingface/transformers triggers any GPU work, so the caller
// (src/lib/use-asr.ts) is responsible for ordering.
//
// M2 D2 finding (full writeup in docs/DEVIATIONS.md): q8 verified WORKING
// on webgpu (exact-match transcription, manually confirmed). On the wasm
// execution provider, q8 (and int8/uint8 — all three tried) fails session
// creation outright with an onnxruntime-web error
// ("qdq_actions.cc:137 TransposeDQWeightsForMatMulNBits Missing required
// scale") — an upstream WASM-backend limitation with this model family's
// quantized decoder graph, reproduced identically on both tiny.en and
// base.en, so "degrade to base.en" (D2's other named option) does not fix
// it. fp32 on wasm avoids the failing operator entirely and works — BUT
// only when requested as the FIRST session construction in a page: a
// failed q8 session-creation attempt leaves onnxruntime-web/WASM state
// corrupted such that a same-page fp32 retry afterward *also* fails
// (reproduced: try/catch fallback attempted, fp32 retry still threw the
// identical q8 error). The fix is therefore to route by device UP FRONT —
// never attempt the doomed wasm+q8 construction at all — not a
// try-then-catch. q8 is still what loads whenever the provider can
// actually run it (webgpu, always); wasm always gets fp32 directly, with
// the fact surfaced in the model panel (never hidden).
import { env, pipeline, type AutomaticSpeechRecognitionPipeline, type ProgressInfo } from "@huggingface/transformers";
import { gpuAdapterAvailable, readSignalsSnapshot, resetSignals } from "./instrument";
import { deriveExecutionProvider, type ProviderVerdict, type RequestedDevice } from "@pitman/core";
import { transcribeWithConfidence, type WordConfidence } from "./confidence";

// Importing @huggingface/transformers (above) sets
// env.backends.onnx.wasm.wasmPaths to a jsdelivr CDN URL as a MODULE-LOAD-
// TIME side effect (found during M2 e2e verification: the zero-upload
// network assertion caught a real request to cdn.jsdelivr.net). Overriding
// it here, before any pipeline() call, keeps the ONNX Runtime WASM runtime
// itself same-origin — "nothing leaves the device" (docs/pitman-SPEC.md)
// has to hold for the inference engine's own bootstrap, not just model
// weights and audio. These files are NOT bundled by Vite (an onnxruntime-web
// package.json "exports" restriction blocks resolving its dist/*.mjs as a
// subpath import); scripts/copy-ort-assets.mjs copies them from
// node_modules into apps/web/public/ort/ (gitignored) before dev/build, and
// this references that stable, un-hashed public path.
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    wasm: "/ort/ort-wasm-simd-threaded.asyncify.wasm",
    mjs: "/ort/ort-wasm-simd-threaded.asyncify.mjs",
  };
}

export type ModelId = "Xenova/whisper-tiny.en" | "Xenova/whisper-base.en";
export type ActualDtype = "q8" | "fp32";

const WASM_Q8_UNSUPPORTED_REASON =
  "wasm cannot construct a session for the quantized (q8) decoder graph in this browser's ONNX Runtime build " +
  '("qdq_actions.cc:137 TransposeDQWeightsForMatMulNBits Missing required scale") — reproduced on both ' +
  "whisper-tiny.en and whisper-base.en. Loading the full-precision (fp32) model instead.";

export interface LoadResult {
  pipeline: AutomaticSpeechRecognitionPipeline;
  loadMs: number;
  requestedDevice: RequestedDevice;
  provider: ProviderVerdict;
  /** Which precision actually loaded — see module header for why this can differ from the requested "q8" default. */
  actualDtype: ActualDtype;
  dtypeFallbackReason: string | null;
  /**
   * Real bytes read from the network for this load, per transformers.js's
   * own stream-reading progress tracking (status "progress_total"). NOT the
   * Resource Timing API: Hugging Face's CDN omits Timing-Allow-Origin on
   * these cross-origin responses, so transferSize/encodedBodySize are
   * always 0 there — confirmed by manual in-browser check during M2 build
   * (real request durations up to 6.4s, transferSize still 0). This is the
   * "true download size" docs/pitman-SPEC.md Surfaces §3 asks for; a
   * warm/cached load reports 0, which is itself the honest signal.
   */
  bytesLoaded: number;
}

export interface TranscribeResult {
  text: string;
  chunks?: Array<{ text: string; timestamp: [number, number | null] }>;
  words: WordConfidence[];
  inferMs: number;
  provider: ProviderVerdict;
}

const pipelineCache = new Map<string, Promise<AutomaticSpeechRecognitionPipeline>>();

function cacheKey(model: ModelId, device: RequestedDevice, dtype: string): string {
  return `${model}|${device}|${dtype}`;
}

async function constructPipeline(
  model: ModelId,
  device: RequestedDevice,
  dtype: ActualDtype,
  progress_callback: (info: ProgressInfo) => void,
): Promise<AutomaticSpeechRecognitionPipeline> {
  const key = cacheKey(model, device, dtype);
  let cached = pipelineCache.get(key);
  if (!cached) {
    cached = pipeline("automatic-speech-recognition", model, {
      device,
      dtype,
      progress_callback,
    }) as Promise<AutomaticSpeechRecognitionPipeline>;
    pipelineCache.set(key, cached);
  }
  try {
    return await cached;
  } catch (err) {
    // A failed construction must not poison the cache for a later retry.
    pipelineCache.delete(key);
    throw err;
  }
}

/**
 * Load (or reuse) the ASR pipeline. Cold load = first call for a given
 * model/device/dtype combination (downloads + compiles); warm load = a
 * cached pipeline resolved again (docs/pitman-SPEC.md Surfaces §3: "cold vs
 * warm load time"). Routes dtype by device UP FRONT — see module header for
 * why a try-then-catch fallback does not work here.
 */
export async function loadAsrPipeline(
  model: ModelId,
  device: RequestedDevice,
  onProgress?: (info: ProgressInfo) => void,
): Promise<LoadResult> {
  resetSignals();
  const adapterAvailable = await gpuAdapterAvailable();

  let bytesLoaded = 0;
  const progress_callback = (info: ProgressInfo) => {
    if (info.status === "progress_total") bytesLoaded = info.loaded;
    onProgress?.(info);
  };

  const actualDtype: ActualDtype = device === "wasm" ? "fp32" : "q8";
  const dtypeFallbackReason = device === "wasm" ? WASM_Q8_UNSUPPORTED_REASON : null;

  const start = performance.now();
  const asrPipeline = await constructPipeline(model, device, actualDtype, progress_callback);
  const loadMs = performance.now() - start;

  // A cold load runs real inference-adjacent graph construction but no
  // GPUQueue.submit necessarily happens until the first transcribe() call,
  // so provider verdict at load time is a best-effort read; the caller
  // re-reads it after the first transcribe() for a load-bearing verdict.
  const signals = readSignalsSnapshot();
  const provider = deriveExecutionProvider({
    requestedDevice: device,
    gpuAdapterAvailable: adapterAvailable,
    gpuSubmitCount: signals.gpuSubmitCount,
    consoleFallbackWarnings: signals.consoleFallbackWarnings,
  });

  return { pipeline: asrPipeline, loadMs, requestedDevice: device, provider, actualDtype, dtypeFallbackReason, bytesLoaded };
}

/**
 * Run one transcription and read back the execution-provider verdict for
 * THIS call. Uses transcribeWithConfidence (confidence.ts) as the sole
 * transcription path — it produces the same text a plain pipeline() call
 * would (via the identical internal _decode_asr method), plus real
 * per-word confidence, in one pass. See confidence.ts's module header for
 * why greedy pipeline() calls alone can never supply confidence data.
 */
export async function transcribe(
  asrPipeline: AutomaticSpeechRecognitionPipeline,
  audio: Float32Array,
  requestedDevice: RequestedDevice,
): Promise<TranscribeResult> {
  resetSignals();
  const adapterAvailable = await gpuAdapterAvailable();

  const start = performance.now();
  const { text, words } = await transcribeWithConfidence(asrPipeline, audio);
  const inferMs = performance.now() - start;

  const signals = readSignalsSnapshot();
  const provider = deriveExecutionProvider({
    requestedDevice,
    gpuAdapterAvailable: adapterAvailable,
    gpuSubmitCount: signals.gpuSubmitCount,
    consoleFallbackWarnings: signals.consoleFallbackWarnings,
  });

  const chunks = words.map((w) => ({ text: w.text, timestamp: [w.start ?? 0, w.end] as [number, number | null] }));

  return { text, chunks, words, inferMs, provider };
}
