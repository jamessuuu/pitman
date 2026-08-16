import { describe, expect, it } from "vitest";
import { deriveExecutionProvider, hasFallbackWarning } from "../src/provider-readback.js";

describe("hasFallbackWarning", () => {
  it("detects a known ORT fallback pattern", () => {
    expect(hasFallbackWarning(["some nodes were not assigned to the preferred execution providers"])).toBe(true);
  });

  it("detects 'falling back to wasm'", () => {
    expect(hasFallbackWarning(["falling back to wasm"])).toBe(true);
  });

  it("returns false for unrelated console lines", () => {
    expect(hasFallbackWarning(["model loaded", "tokenizer ready"])).toBe(false);
  });

  it("returns false for non-array input", () => {
    // @ts-expect-error deliberate bad input
    expect(hasFallbackWarning(undefined)).toBe(false);
  });
});

describe("deriveExecutionProvider", () => {
  it("reports genuine webgpu when submits > 0 and no fallback log", () => {
    const v = deriveExecutionProvider({
      requestedDevice: "webgpu",
      gpuAdapterAvailable: true,
      gpuSubmitCount: 12,
      consoleFallbackWarnings: [],
    });
    expect(v.actualProvider).toBe("webgpu");
    expect(v.fallbackDetected).toBe(false);
    expect(v.confidence).toBe("high");
  });

  it("catches SILENT wasm fallback: webgpu requested, adapter available, zero submits", () => {
    const v = deriveExecutionProvider({
      requestedDevice: "webgpu",
      gpuAdapterAvailable: true,
      gpuSubmitCount: 0,
      consoleFallbackWarnings: [],
    });
    expect(v.actualProvider).toBe("wasm-silent-fallback");
    expect(v.fallbackDetected).toBe(true);
    expect(v.confidence).toBe("high");
  });

  it("reports unavailable when webgpu requested but no adapter", () => {
    const v = deriveExecutionProvider({
      requestedDevice: "webgpu",
      gpuAdapterAvailable: false,
      gpuSubmitCount: 0,
      consoleFallbackWarnings: [],
    });
    expect(v.actualProvider).toBe("unavailable");
    expect(v.fallbackDetected).toBe(true);
  });

  it("flags medium confidence on partial fallback (submits > 0 but a fallback log line seen)", () => {
    const v = deriveExecutionProvider({
      requestedDevice: "webgpu",
      gpuAdapterAvailable: true,
      gpuSubmitCount: 5,
      consoleFallbackWarnings: ["some nodes were not assigned to the preferred execution providers"],
    });
    expect(v.actualProvider).toBe("webgpu");
    expect(v.fallbackDetected).toBe(true);
    expect(v.confidence).toBe("medium");
  });

  it("reports plain wasm when requested and zero submits", () => {
    const v = deriveExecutionProvider({
      requestedDevice: "wasm",
      gpuAdapterAvailable: true,
      gpuSubmitCount: 0,
      consoleFallbackWarnings: [],
    });
    expect(v.actualProvider).toBe("wasm");
    expect(v.fallbackDetected).toBe(false);
  });

  it("flags anomalous when wasm requested but GPU submits observed anyway", () => {
    const v = deriveExecutionProvider({
      requestedDevice: "wasm",
      gpuAdapterAvailable: true,
      gpuSubmitCount: 3,
      consoleFallbackWarnings: [],
    });
    expect(v.actualProvider).toBe("anomalous");
    expect(v.confidence).toBe("medium");
  });
});
