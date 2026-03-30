import { DAYS } from "../../lib/constants";

export function ScoreComparisonMeter({ beforeScore, afterScore }) {
  const beforeWidth = Math.min(Math.max(beforeScore, 0), 100);
  const afterWidth = Math.min(Math.max(afterScore, 0), 100);

  return (
    <div className="score-meter">
      <div className="score-meter-row">
        <div className="score-meter-label">Baseline</div>
        <div className="score-meter-track">
          <div className="score-meter-fill danger" style={{ width: `${beforeWidth}%` }} />
        </div>
        <div className="score-meter-value">{beforeScore}</div>
      </div>
      <div className="score-meter-row">
        <div className="score-meter-label">Optimized</div>
        <div className="score-meter-track">
          <div className="score-meter-fill safe" style={{ width: `${afterWidth}%` }} />
        </div>
        <div className="score-meter-value">{afterScore}</div>
      </div>
    </div>
  );
}

export function WorkloadDeltaChart({ before, after }) {
  const peak = Math.max(...before, ...after, 1);

  return (
    <div className="delta-chart-wrap">
      <div className="delta-legend">
        <div className="delta-legend-item"><span className="delta-legend-swatch before" />Baseline</div>
        <div className="delta-legend-item"><span className="delta-legend-swatch after" />Optimized</div>
      </div>
      <div className="delta-columns">
      {DAYS.map((day, index) => {
        const beforeHours = before[index] ?? 0;
        const afterHours = after[index] ?? 0;
        const delta = Number((beforeHours - afterHours).toFixed(1));

        return (
          <div className="delta-column" key={day}>
            <div className="delta-bars">
              <div className="delta-bar-group">
                <div className="delta-bar-label">{beforeHours}h</div>
                <div className="delta-bar before" style={{ height: `${(beforeHours / peak) * 100}%` }} />
              </div>
              <div className="delta-bar-group">
                <div className="delta-bar-label">{afterHours}h</div>
                <div className="delta-bar after" style={{ height: `${(afterHours / peak) * 100}%` }} />
              </div>
            </div>
            <div className={`delta-chip${delta > 0 ? " positive" : delta < 0 ? " negative" : ""}`}>
              {delta > 0 ? `-${delta}h` : delta < 0 ? `+${Math.abs(delta)}h` : "0h"}
            </div>
            <div className="delta-axis">{day}</div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export function WeeklyLoadHeatmap({ before, after }) {
  const peak = Math.max(...before, ...after, 1);

  return (
    <div className="heatmap-grid">
      <div className="heatmap-header">Day</div>
      <div className="heatmap-header">Before</div>
      <div className="heatmap-header">After</div>
      {DAYS.flatMap((day, index) => {
        const beforeHours = before[index] ?? 0;
        const afterHours = after[index] ?? 0;
        return [
          <div className="heatmap-day" key={`${day}-label`}>{day}</div>,
          <HeatCell key={`${day}-before`} hours={beforeHours} peak={peak} tone="danger" />,
          <HeatCell key={`${day}-after`} hours={afterHours} peak={peak} tone="safe" />,
        ];
      })}
    </div>
  );
}

function HeatCell({ hours, peak, tone }) {
  const intensity = Math.max(hours / peak, 0.08);
  return (
    <div
      className={`heatmap-cell ${tone}`}
      style={{ opacity: intensity }}
    >
      {hours}h
    </div>
  );
}
