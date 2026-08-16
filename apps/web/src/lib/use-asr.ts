import { useCallback, useRef, useState } from "react";
import { installInstrumentation, gpuAdapterAvailable } from "./instrument";
import { loadAsrPipeline, transcribe, type ModelId, type LoadResult, type ActualDtype } from "./asr-pipeline";
import type { WordConfidence } from "./confidence";
import type { AutomaticSpeechRecognitionPipeline, ProgressInfo } from "@huggingface/transformers";
import type { ProviderVerdict, RequestedDevice } from "@pitman/core";

installInstrumentation();

export type AsrStatus = "idle" | "loading-model" | "transcribing" | "done" | "error";

export interface AsrState {
  status: AsrStatus;
  model: ModelId;
  text: string;
  words: WordConfidence[];
  loadMs: number | null;
  inferMs: number | null;
  provider: ProviderVerdict | null;
  actualDtype: ActualDtype | null;
  dtypeFallbackReason: string | null;
  wasCached: boolean | null;
  bytesLoaded: number | null;
  downloadProgressPct: number | null;
  errorMessage: string | null;
}

const INITIAL_STATE: AsrState = {
  status: "idle",
  model: "Xenova/whisper-tiny.en",
  text: "",
  words: [],
  loadMs: null,
  inferMs: null,
  provider: null,
  actualDtype: null,
  dtypeFallbackReason: null,
  wasCached: null,
  bytesLoaded: null,
  downloadProgressPct: null,
  errorMessage: null,
};

/**
 * Resolve the device to REQUEST: prefer webgpu when a GPU adapter is
 * present, else wasm. What actually ran is always read back afterward via
 * @pitman/core's deriveExecutionProvider — this is only the initial ask.
 */
async function pickRequestedDevice(): Promise<RequestedDevice> {
  return (await gpuAdapterAvailable()) ? "webgpu" : "wasm";
}

export function useAsr() {
  const [state, setState] = useState<AsrState>(INITIAL_STATE);
  const pipelineRef = useRef<AutomaticSpeechRecognitionPipeline | null>(null);
  const loadedForRef = useRef<{ model: ModelId; device: RequestedDevice } | null>(null);

  const transcribeAudio = useCallback(async (audio: Float32Array, model: ModelId = state.model) => {
    setState((s) => ({ ...s, status: "loading-model", model, errorMessage: null, downloadProgressPct: null }));

    const onProgress = (info: ProgressInfo) => {
      if (info.status === "progress_total") {
        setState((s) => ({ ...s, downloadProgressPct: info.progress }));
      }
    };

    let device = await pickRequestedDevice();
    let load: LoadResult;
    try {
      load = await loadAsrPipeline(model, device, onProgress);
    } catch (err) {
      // webgpu pipeline construction can throw outright on some
      // browser/driver combinations even when an adapter reported present;
      // wasm (with its own internal q8->fp32 fallback, see
      // asr-pipeline.ts's module header) is the documented, always-available
      // last resort.
      if (device === "webgpu") {
        device = "wasm";
        try {
          load = await loadAsrPipeline(model, device, onProgress);
        } catch (fallbackErr) {
          setState((s) => ({
            ...s,
            status: "error",
            errorMessage: `Model failed to load on wasm too: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
          }));
          return;
        }
      } else {
        setState((s) => ({
          ...s,
          status: "error",
          errorMessage: `Model failed to load: ${err instanceof Error ? err.message : String(err)}`,
        }));
        return;
      }
    }

    pipelineRef.current = load.pipeline;
    loadedForRef.current = { model, device };

    setState((s) => ({
      ...s,
      status: "transcribing",
      loadMs: load.loadMs,
      provider: load.provider,
      actualDtype: load.actualDtype,
      dtypeFallbackReason: load.dtypeFallbackReason,
      wasCached: load.wasCached,
      bytesLoaded: load.bytesLoaded,
      downloadProgressPct: 100,
    }));

    try {
      const result = await transcribe(load.pipeline, audio, device);
      setState((s) => ({
        ...s,
        status: "done",
        text: result.text,
        words: result.words,
        inferMs: result.inferMs,
        provider: result.provider,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: `Transcription failed: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, [state.model]);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, transcribeAudio, reset };
}
