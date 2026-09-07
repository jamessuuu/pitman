import { probe } from "../../data/probe.generated";

/**
 * The control group, drawn. docs/batch2-asr-probe.md §8 ran an 18-clip
 * US-tagged control set through the identical pipeline on the same day —
 * which is the only reason any gap here can be read at all.
 *
 * Bars are scaled against a fixed axis maximum rather than the largest
 * value, so the two model groups stay comparable to each other.
 */

const AXIS_MAX = 0.25;
const pct = (wer: number) => `${Math.min(100, (wer / AXIS_MAX) * 100)}%`;

export function ControlComparison() {
  return (
    <div className="stack gap-4" data-testid="control-comparison">
      <div className="bars">
        {probe.control.headline.map((row) => (
          <div key={row.model} className="stack gap-2">
            <div className="bar-row">
              <div className="bar-head">
                <span className="data">
                  <strong>{row.model}</strong> · Filipino-tagged
                </span>
                <span className="data">{row.filipinoMean.toFixed(4)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill bar-measured" style={{ width: pct(row.filipinoMean) }} />
              </div>
            </div>
            <div className="bar-row">
              <div className="bar-head">
                <span className="data" style={{ color: "var(--fg-muted)" }}>
                  US-tagged control
                </span>
                <span className="data" style={{ color: "var(--fg-muted)" }}>
                  {row.controlMean.toFixed(4)} <span aria-hidden="true">·</span> {row.relativeDelta}
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill bar-control" style={{ width: pct(row.controlMean) }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="small">
        Mean word error rate, fp32, axis to {AXIS_MAX}. Same pipeline, same corpus, same day — the two sets read
        different sentences, so this is an unmatched-groups comparison, not a matched-pairs one.
      </p>

      <div className="stats stats-quad" data-testid="control-stats">
        {probe.control.errorOps.map((row) => (
          <div key={row.model} className="stat">
            <span className="stat-value">
              {row.filipino}
              <span style={{ color: "var(--fg-faint)" }}> / {row.control}</span>
            </span>
            <span className="stat-label">
              error operations, {row.model.replace("whisper-", "")} — measured set vs control
            </span>
          </div>
        ))}
        {probe.control.buckets.map((row) => (
          <div key={row.model} className="stat">
            <span className="stat-value">
              {row.filipino[0]}
              <span style={{ color: "var(--fg-faint)" }}> / {row.control[0]}</span>
            </span>
            <span className="stat-label">
              word-perfect clips of {probe.headline.total}, {row.model.replace("whisper-", "")} — measured vs control
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
