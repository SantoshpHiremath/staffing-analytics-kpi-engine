/**
 * semanticLayer.ts
 * ----------------
 * The single entry point a UI (or API layer) calls to get any named KPI,
 * sliced by any supported dimension, scoped to what the caller is
 * allowed to see. This is the semantic layer:
 * metric *names* are registered once here, and callers ask for
 * a metric by name rather than knowing how each one is computed.
 */

import type { StaffingDataset, DimensionFilter, AccessScope, KpiResult } from "./types";
import { projectFillRate } from "./projectors/fillRate";
import { projectTimeToHire, weightedAverage } from "./projectors/timeToHire";
import { projectTurnoverRate } from "./projectors/turnover";
import { projectCostPerHire, findOrphanedFilledRequisitions } from "./projectors/costPerHire";
import { isBusinessUnitInScope } from "./access";

export type MetricName = "fill_rate" | "time_to_hire" | "turnover_rate" | "cost_per_hire";

const REGISTRY: Record<
  MetricName,
  (dataset: StaffingDataset, filter: DimensionFilter, scope: AccessScope) => KpiResult
> = {
  fill_rate: projectFillRate,
  time_to_hire: projectTimeToHire,
  turnover_rate: projectTurnoverRate,
  cost_per_hire: projectCostPerHire,
};

export function getKpi(
  metric: MetricName,
  dataset: StaffingDataset,
  filter: DimensionFilter = {},
  scope: AccessScope = { allowedBusinessUnits: "*" }
): KpiResult {
  const projector = REGISTRY[metric];
  if (!projector) {
    throw new Error(`Unknown metric "${metric}". Known metrics: ${Object.keys(REGISTRY).join(", ")}`);
  }
  return projector(dataset, filter, scope);
}

/**
 * Slices one metric across every distinct value of a dimension (e.g.
 * "time_to_hire broken down by businessUnit") — the "slice any KPI by
 * business unit, agency, role, cost centre or time period" ask, plus
 * verifies the weighted rollup of the slices matches the unsliced
 * overall figure (see weightedAverage in timeToHire.ts).
 *
 * Dimension values are discovered ONLY from rows the caller is scoped to
 * see (isBusinessUnitInScope), not from the full unscoped dataset. This
 * is a deliberate fix for a real bug caught by this project's own test
 * suite during development: discovering values from all rows and then
 * querying each one individually caused a scoped caller (e.g. scoped to
 * ["Logistics"]) to hit an AccessDeniedError on "Manufacturing" — a
 * dimension value they should simply never see, not one that should
 * surface as an error.
 */
export function getKpiByDimension(
  metric: MetricName,
  dimension: "businessUnit" | "costCentre" | "role" | "agencyId",
  dataset: StaffingDataset,
  scope: AccessScope = { allowedBusinessUnits: "*" }
): { dimensionValue: string; result: KpiResult }[] {
  const values = new Set<string>();
  for (const r of dataset.requisitions) {
    if (!isBusinessUnitInScope(r.businessUnit, scope)) continue;
    const v = dimension === "agencyId" ? r.agencyId : (r as any)[dimension];
    if (v) values.add(v);
  }

  return Array.from(values)
    .sort()
    .map((dimensionValue) => ({
      dimensionValue,
      result: getKpi(metric, dataset, { [dimension]: dimensionValue }, scope),
    }));
}

export { weightedAverage, findOrphanedFilledRequisitions };
