/**
 * KpiDashboard.tsx
 * ----------------
 * A minimal, real React + TypeScript component consuming the semantic
 * layer directly, surfacing the KPIs in a React UI. Deliberately small and unstyled (no design system to fake):
 * the point is a genuinely typed, tested data flow from raw dataset to
 * rendered KPI cards, not a polished mockup.
 */

import { useMemo, useState } from "react";
import type { StaffingDataset, AccessScope } from "../types";
import { getKpi, getKpiByDimension, type MetricName } from "../semanticLayer";

const METRIC_LABELS: Record<MetricName, string> = {
  fill_rate: "Fill Rate",
  time_to_hire: "Time to Hire",
  turnover_rate: "Turnover Rate",
  cost_per_hire: "Cost per Hire",
};

const ALL_METRICS = Object.keys(METRIC_LABELS) as MetricName[];

export interface KpiDashboardProps {
  dataset: StaffingDataset;
  scope?: AccessScope;
}

export function KpiDashboard({ dataset, scope = { allowedBusinessUnits: "*" } }: KpiDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricName>("fill_rate");

  const overall = useMemo(() => getKpi(selectedMetric, dataset, {}, scope), [selectedMetric, dataset, scope]);

  const byBusinessUnit = useMemo(
    () => getKpiByDimension(selectedMetric, "businessUnit", dataset, scope),
    [selectedMetric, dataset, scope]
  );

  return (
    <div data-testid="kpi-dashboard">
      <h2>Staffing Analytics</h2>

      <div role="tablist" aria-label="Select KPI">
        {ALL_METRICS.map((metric) => (
          <button
            key={metric}
            role="tab"
            aria-selected={metric === selectedMetric}
            onClick={() => setSelectedMetric(metric)}
            data-testid={`metric-tab-${metric}`}
          >
            {METRIC_LABELS[metric]}
          </button>
        ))}
      </div>

      <section data-testid="overall-kpi-card">
        <h3>{METRIC_LABELS[selectedMetric]} (overall)</h3>
        <p data-testid="overall-kpi-value">
          {overall.value} {overall.unit}
        </p>
        <p data-testid="overall-kpi-sample-size">n = {overall.sampleSize}</p>
        {overall.lowConfidence && <p data-testid="low-confidence-warning">Low confidence — small sample size</p>}
      </section>

      <section aria-label="Breakdown by business unit">
        <h3>By Business Unit</h3>
        <ul>
          {byBusinessUnit.map(({ dimensionValue, result }) => (
            <li key={dimensionValue} data-testid={`bu-row-${dimensionValue}`}>
              <span>{dimensionValue}</span>
              <span>
                {" "}
                {result.value} {result.unit} (n={result.sampleSize})
                {result.lowConfidence ? " — low confidence" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
