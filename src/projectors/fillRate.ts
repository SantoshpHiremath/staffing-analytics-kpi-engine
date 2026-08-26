/**
 * fillRate.ts — KPI projector: Fill Rate
 * ---------------------------------------
 * Fill rate = share of requisitions that reached "filled" status, out of
 * all requisitions that reached a terminal state (filled or cancelled).
 * Requisitions still "open" are deliberately excluded from the
 * denominator — including them would understate fill rate for any
 * period that includes recent, still-in-flight requisitions, which is a
 * genuine correctness bug this project would otherwise ship with.
 */

import type { StaffingDataset, DimensionFilter, AccessScope, KpiResult } from "./../types";
import { assertFilterInScope, validateFilter } from "./../access";
import { requisitionMatches } from "./../filters";

export const MIN_SAMPLE_SIZE = 5;

export function projectFillRate(
  dataset: StaffingDataset,
  filter: DimensionFilter,
  scope: AccessScope
): KpiResult {
  validateFilter(filter);
  assertFilterInScope(filter, scope);

  const inScope = dataset.requisitions.filter((r) =>
    requisitionMatches(r, filter, scope, "openedAt")
  );
  const terminal = inScope.filter((r) => r.status === "filled" || r.status === "cancelled");
  const filled = terminal.filter((r) => r.status === "filled");

  const value = terminal.length === 0 ? 0 : (filled.length / terminal.length) * 100;

  return {
    metric: "fill_rate",
    value: Math.round(value * 10) / 10,
    unit: "percent",
    sampleSize: terminal.length,
    lowConfidence: terminal.length < MIN_SAMPLE_SIZE,
  };
}
