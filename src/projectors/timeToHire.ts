/**
 * timeToHire.ts — KPI projector: Time-to-Hire
 * ---------------------------------------------
 * Time-to-hire = average number of days between a requisition opening
 * and being filled, for requisitions that were actually filled in the
 * requested period.
 *
 * This is a WEIGHTED average across dimension slices: if a caller asks
 * for "average time-to-hire by business unit" and then separately for
 * "the overall average," the overall figure must equal the sample-size-
 * weighted average of the per-unit figures, not a plain average of the
 * per-unit averages (which silently overweights business units with
 * fewer requisitions). This project computes the overall figure directly
 * from row-level data for exactly that reason, and a dedicated test
 * (`timeToHire.test.ts`) proves the naive average-of-averages would give
 * a different, wrong answer on the fixture data.
 */

import type { StaffingDataset, DimensionFilter, AccessScope, KpiResult } from "./../types";
import { assertFilterInScope, validateFilter } from "./../access";
import { requisitionMatches } from "./../filters";
import { MIN_SAMPLE_SIZE } from "./fillRate";

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return (end - start) / (1000 * 60 * 60 * 24);
}

export function projectTimeToHire(
  dataset: StaffingDataset,
  filter: DimensionFilter,
  scope: AccessScope
): KpiResult {
  validateFilter(filter);
  assertFilterInScope(filter, scope);

  const filled = dataset.requisitions.filter(
    (r) =>
      r.status === "filled" &&
      r.filledAt !== null &&
      requisitionMatches(r, filter, scope, "filledAt")
  );

  if (filled.length === 0) {
    return { metric: "time_to_hire", value: 0, unit: "days", sampleSize: 0, lowConfidence: true };
  }

  const totalDays = filled.reduce((sum, r) => sum + daysBetween(r.openedAt, r.filledAt as string), 0);
  const value = totalDays / filled.length;

  return {
    metric: "time_to_hire",
    value: Math.round(value * 10) / 10,
    unit: "days",
    sampleSize: filled.length,
    lowConfidence: filled.length < MIN_SAMPLE_SIZE,
  };
}

/**
 * Computes the sample-size-weighted average of several already-computed
 * KpiResults for the same metric — the correct way to "roll up" a
 * dimension-sliced set of time-to-hire results into one overall figure,
 * without re-querying the raw dataset. Exported specifically so the
 * weighted-vs-naive-average distinction is independently testable.
 */
export function weightedAverage(results: KpiResult[]): number {
  const totalWeight = results.reduce((sum, r) => sum + r.sampleSize, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = results.reduce((sum, r) => sum + r.value * r.sampleSize, 0);
  return weightedSum / totalWeight;
}
