import type { AsrState } from "../lib/use-asr";
import { formatBytes } from "../lib/model-metrics";

/** docs/pitman-SPEC.md Surfaces §3: model/precision, execution-provider readback (never config), cold/warm time, true download size. */
export function ModelPanel({ state }: { state: AsrState }) {
  if (state.status === "idle") return null;

  return (
    <>
      <dl className="model-panel" data-testid="model-panel">
        <div>
          <dt>Model</dt>
          <dd data-testid="model-dtype">
            {state.model.replace("Xenova/", "")} {state.actualDtype === null ? "" : `(${state.actualDtype})`}
          </dd>
        </div>
        <div>
          <dt>Execution provider</dt>
          <dd data-testid="provider-readback">
            {state.provider ? state.provider.actualProvider : "detecting…"}
            {state.provider?.fallbackDetected && " (fallback detected)"}
          </dd>
        </div>
        <div>
          <dt>Model load time</dt>
          <dd data-testid="load-ms">{state.loadMs === null ? "—" : `${Math.round(state.loadMs)} ms`}</dd>
        </div>
        <div>
          <dt>Inference time</dt>
          <dd data-testid="infer-ms">{state.inferMs === null ? "—" : `${Math.round(state.inferMs)} ms`}</dd>
        </div>
        <div>
          <dt>Downloaded</dt>
          <dd data-testid="download-size">{state.bytesLoaded === null ? "—" : formatBytes(state.bytesLoaded)}</dd>
        </div>
      </dl>
      {state.dtypeFallbackReason && (
        <p className="status-note" data-testid="dtype-fallback-note">
          Running the full-precision (fp32) model instead of the smaller quantized one: your browser&apos;s
          fallback engine can&apos;t run the quantized version of this model
          (<a href="/docs/limitations">details</a>).
        </p>
      )}
    </>
  );
}
