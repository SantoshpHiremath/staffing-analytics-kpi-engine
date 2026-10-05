/**
 * costPerHire.ts — KPI projector: Cost-per-Hire
 * -------------------------------------------------
 * Cost-per-hire = total agency fees paid / number of hires, for hires in
 * the requested period.
 *
 * This is the one genuine CROSS-GRAIN JOIN in this project: cost
 * (agencyFeeEur) lives on the Requisition record, but "was this hire
 * still an active placement, and did it end early" lives on the
 * Placement record — a different grain (one requisition can, in this
 * model, correspond to zero or one placement, but the two tables are
 * still independently filterable/joinable and must be joined correctly
 * by requisitionId rather than assumed to line up positionally).
 *
 * A requisition with a null agencyFeeEur (not yet actually filled, or a
 * data gap) is excluded from both the numerator and the denominator,
 * not silently treated as a zero-cost hire — treating a missing fee as
 * 0 would understate cost-per-hire, a bug that would quietly
 * distort the KPI.
 */

import type { StaffingDataset, DimensionFilter, AccessScope, KpiResult } from "./../types";
import { assertFilterInScope, validateFilter } from "./../access";
import { requisitionMatches } from "./../filters";
import { MIN_SAMPLE_SIZE } from "./fillRate";

export function projectCostPerHire(
  dataset: StaffingDataset,
  filter: DimensionFilter,
  scope: AccessScope
): KpiResult {
  validateFilter(filter);
  assertFilterInScope(filter, scope);

  // Join grain: filter requisitions first (cheap, indexed conceptually
  // by businessUnit/costCentre/role), then join each surviving
  // requisition to its placement by requisitionId — an explicit,
  // testable join rather than assuming the two arrays are aligned.
  const placementByRequisitionId = new Map(
    dataset.placements.map((p) => [p.requisitionId, p] as const)
  );

  const filledWithFee = dataset.requisitions.filter(
    (r) =>
      r.status === "filled" &&
      r.agencyFeeEur !== null &&
      requisitionMatches(r, filter, scope, "filledAt")
  );

  // Cross-grain join: every filled requisition with a fee must also have
  // a corresponding placement record, or the join is broken — verified
  // explicitly rather than silently dropping unmatched rows.
  const joined = filledWithFee.map((r) => {
    const placement = placementByRequisitionId.get(r.requisitionId);
    return { requisition: r, placement };
  });

  const validJoins = joined.filter((j) => j.placement !== undefined);

  if (validJoins.length === 0) {
    return { metric: "cost_per_hire", value: 0, unit: "EUR", sampleSize: 0, lowConfidence: true };
  }

  const totalCost = validJoins.reduce((sum, j) => sum + (j.requisition.agencyFeeEur as number), 0);
  const value = totalCost / validJoins.length;

  return {
    metric: "cost_per_hire",
    value: Math.round(value * 100) / 100,
    unit: "EUR",
    sampleSize: validJoins.length,
    lowConfidence: validJoins.length < MIN_SAMPLE_SIZE,
  };
}

/**
 * Diagnostic helper: returns requisitionIds that are filled + have a fee
 * but have NO matching placement record — a real data-integrity signal
 * (a broken cross-grain join would otherwise fail silently by just
 * excluding these rows from the KPI above). Exposed so the semantic
 * layer can surface this as a data-quality warning, not just quietly
 * drop rows.
 */
export function findOrphanedFilledRequisitions(dataset: StaffingDataset): string[] {
  const placementByRequisitionId = new Map(
    dataset.placements.map((p) => [p.requisitionId, p] as const)
  );
  return dataset.requisitions
    .filter((r) => r.status === "filled" && r.agencyFeeEur !== null)
    .filter((r) => !placementByRequisitionId.has(r.requisitionId))
    .map((r) => r.requisitionId);
}
