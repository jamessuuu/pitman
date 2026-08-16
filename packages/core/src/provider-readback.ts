/**
 * Pure decision logic for "did inference actually run on the execution
 * provider we asked for". Ported from, and credited to, the sibling
 * project shipgauge (github.com/jamessuuu/shipgauge, scripts/lib/provider-readback.mjs
 * — "a browser-ML shippability study" built earlier in this program), which
 * established the exact mechanism: never trust the requested `device`
 * config alone. The raw signal (GPUQueue.prototype.submit call count,
 * captured by monkey-patching it BEFORE transformers.js loads; see
 * apps/web/src/lib/instrument.ts) is handed to this module as plain data,
 * which is what makes the determination unit-testable without a browser —
 * same rationale shipgauge used, reused verbatim here.
 *
 * pitman's model panel (docs/pitman-SPEC.md, Surfaces §3: "execution
 * provider READ BACK at runtime, never config") is the direct consumer.
 */

export type RequestedDevice = "wasm" | "webgpu";
export type ActualProvider = "webgpu" | "wasm" | "wasm-silent-fallback" | "unavailable" | "anomalous";

export interface ProviderSignals {
  requestedDevice: RequestedDevice;
  gpuAdapterAvailable: boolean;
  gpuSubmitCount: number;
  consoleFallbackWarnings: string[];
}

export interface ProviderVerdict {
  actualProvider: ActualProvider;
  fallbackDetected: boolean;
  confidence: "high" | "medium";
  reasoning: string;
}

const FALLBACK_LOG_PATTERNS = [
  /were not assigned to the preferred execution providers/i,
  /falling back to (wasm|cpu)/i,
  /webgpu.*not supported/i,
];

/** Does any captured console line look like an ORT/transformers.js fallback warning? */
export function hasFallbackWarning(lines: readonly string[]): boolean {
  if (!Array.isArray(lines)) return false;
  return lines.some((line) => typeof line === "string" && FALLBACK_LOG_PATTERNS.some((re) => re.test(line)));
}

/**
 * Derive the actual execution provider from runtime signals. A request for
 * 'webgpu' with zero GPU queue submissions during inference is reported as
 * a silent fallback regardless of what the pipeline's own config said.
 */
export function deriveExecutionProvider(signals: ProviderSignals): ProviderVerdict {
  const {
    requestedDevice,
    gpuAdapterAvailable = false,
    gpuSubmitCount = 0,
    consoleFallbackWarnings = [],
  } = signals ?? ({} as ProviderSignals);

  const sawFallbackLog = hasFallbackWarning(consoleFallbackWarnings);

  if (requestedDevice === "webgpu") {
    if (!gpuAdapterAvailable) {
      return {
        actualProvider: "unavailable",
        fallbackDetected: true,
        confidence: "high",
        reasoning:
          "webgpu was requested but navigator.gpu.requestAdapter() failed or returned null before the pipeline was even constructed — hardware/browser cannot run this row at all.",
      };
    }
    if (gpuSubmitCount > 0) {
      return {
        actualProvider: "webgpu",
        fallbackDetected: sawFallbackLog,
        confidence: sawFallbackLog ? "medium" : "high",
        reasoning: sawFallbackLog
          ? `GPUQueue.submit() was called ${gpuSubmitCount} time(s) during inference, confirming real GPU dispatch, but a console warning also indicates some graph nodes fell back to a non-preferred provider (partial fallback, not silent).`
          : `GPUQueue.submit() was called ${gpuSubmitCount} time(s) during inference — genuine GPU command-buffer dispatch observed, read back from the WebGPU runtime itself, not inferred from config.`,
      };
    }
    return {
      actualProvider: "wasm-silent-fallback",
      fallbackDetected: true,
      confidence: "high",
      reasoning:
        'webgpu was requested and a GPU adapter WAS available, but zero GPUQueue.submit() calls were observed during the inference call — the pipeline silently ran on CPU/WASM despite device:"webgpu" in its own config. This is the failure mode config-only logging can never catch.',
    };
  }

  // requestedDevice === 'wasm'
  if (gpuSubmitCount > 0) {
    return {
      actualProvider: "anomalous",
      fallbackDetected: false,
      confidence: "medium",
      reasoning: `wasm was requested but ${gpuSubmitCount} GPUQueue.submit() call(s) were observed anyway — unexpected; worth a manual look before trusting this row.`,
    };
  }
  return {
    actualProvider: "wasm",
    fallbackDetected: false,
    confidence: "high",
    reasoning: "wasm was requested and zero GPU queue submissions were observed, as expected.",
  };
}
