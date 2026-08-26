/**
 * turnover.ts — KPI projector: Turnover Rate
 * ---------------------------------------------
 * Turnover rate = share of placements that ended early (terminatedEarly)
 * out of all placements that have actually ended within the requested
 * period. Active (not-yet-ended) placements are excluded from the
 * denominator, mirroring the fill-rate projector's terminal-state-only
 * approach — an in-flight placement hasn't "turned over" yet, and
 * counting it as a non-turnover would deflate the rate incorrectly.
 */

import type { StaffingDataset, DimensionFilter, AccessScope, KpiResult } from "./../types";
import { assertFilterInScope, validateFilter } from "./../access";
import { placementMatches } from "./../filters";
import { MIN_SAMPLE_SIZE } from "./fillRate";

export function projectTurnoverRate(
  dataset: StaffingDataset,
  filter: DimensionFilter,
  scope: AccessScope
): KpiResult {
  validateFilter(filter);
  assertFilterInScope(filter, scope);

  const ended = dataset.placements.filter(
    (p) => p.endedAt !== null && placementMatches(p, filter, scope, "endedAt")
  );
  const turnedOver = ended.filter((p) => p.terminatedEarly);

  const value = ended.length === 0 ? 0 : (turnedOver.length / ended.length) * 100;

  return {
    metric: "turnover_rate",
    value: Math.round(value * 10) / 10,
    unit: "percent",
    sampleSize: ended.length,
    lowConfidence: ended.length < MIN_SAMPLE_SIZE,
  };
}
