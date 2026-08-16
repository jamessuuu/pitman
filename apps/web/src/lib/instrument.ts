// Must be imported and called BEFORE @huggingface/transformers loads, so the
// monkey-patch is in place before onnxruntime-web's WebGPU backend (if used)
// ever calls GPUQueue.prototype.submit. This is the raw signal
// packages/core's provider-readback.ts consumes as plain data — see that
// file's header comment for full attribution to the sibling shipgauge
// project, which established this exact mechanism.
//
// Why this exists at all: a pipeline configured with device:"webgpu" can
// silently fall back to CPU/WASM inside onnxruntime-web with no thrown
// error and no guaranteed console line. Counting real GPU command-buffer
// submissions is the only signal that cannot lie about what actually ran.

let submitCount = 0;
let patched = false;
const consoleWarnings: string[] = [];

/** Install the GPUQueue.submit + console interceptors. Idempotent. */
export function installInstrumentation(): void {
  if (patched) return;
  patched = true;

  const gpu = (globalThis as { GPUQueue?: { prototype: { submit: (...a: unknown[]) => unknown } } }).GPUQueue;
  if (gpu?.prototype?.submit) {
    const original = gpu.prototype.submit;
    gpu.prototype.submit = function patchedSubmit(this: unknown, ...args: unknown[]) {
      submitCount++;
      return original.apply(this, args as never);
    };
  }

  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    consoleWarnings.push(args.map((a) => String(a)).join(" "));
    originalWarn(...args);
  };
}

/** GPU adapter presence, checked once, cheaply — used as the "no adapter at all" fast path. */
export async function gpuAdapterAvailable(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null && adapter !== undefined;
  } catch {
    return false;
  }
}

/** Snapshot of the signals collected since installInstrumentation() ran, for one inference call. */
export function readSignalsSnapshot(): { gpuSubmitCount: number; consoleFallbackWarnings: string[] } {
  return { gpuSubmitCount: submitCount, consoleFallbackWarnings: [...consoleWarnings] };
}

/** Reset the counters between measured inference calls (e.g. cold vs warm). */
export function resetSignals(): void {
  submitCount = 0;
  consoleWarnings.length = 0;
}
