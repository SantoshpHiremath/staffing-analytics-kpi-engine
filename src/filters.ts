/**
 * filters.ts
 * ----------
 * Shared dimension-filtering logic used by every KPI projector, so
 * "does this record match the requested slice + access scope" is
 * defined once and tested once, rather than reimplemented (and
 * potentially inconsistently) per metric.
 */

import type { DimensionFilter, AccessScope, Requisition, Placement } from "./types";
import { isBusinessUnitInScope } from "./access";

function inPeriod(dateIso: string | null, filter: DimensionFilter): boolean {
  if (dateIso === null) return false;
  if (filter.periodStart && dateIso < filter.periodStart) return false;
  if (filter.periodEnd && dateIso > filter.periodEnd) return false;
  return true;
}

/**
 * Matches a Requisition against a dimension filter + access scope.
 * `dateField` selects which date drives the period filter, since
 * different KPIs care about different lifecycle dates (opened vs filled).
 */
export function requisitionMatches(
  req: Requisition,
  filter: DimensionFilter,
  scope: AccessScope,
  dateField: "openedAt" | "filledAt"
): boolean {
  if (!isBusinessUnitInScope(req.businessUnit, scope)) return false;
  if (filter.businessUnit && req.businessUnit !== filter.businessUnit) return false;
  if (filter.costCentre && req.costCentre !== filter.costCentre) return false;
  if (filter.role && req.role !== filter.role) return false;
  if (filter.agencyId && req.agencyId !== filter.agencyId) return false;
  if (filter.periodStart || filter.periodEnd) {
    return inPeriod(req[dateField], filter);
  }
  return true;
}

export function placementMatches(
  p: Placement,
  filter: DimensionFilter,
  scope: AccessScope,
  dateField: "startedAt" | "endedAt"
): boolean {
  if (!isBusinessUnitInScope(p.businessUnit, scope)) return false;
  if (filter.businessUnit && p.businessUnit !== filter.businessUnit) return false;
  if (filter.costCentre && p.costCentre !== filter.costCentre) return false;
  if (filter.role && p.role !== filter.role) return false;
  if (filter.agencyId && p.agencyId !== filter.agencyId) return false;
  if (filter.periodStart || filter.periodEnd) {
    return inPeriod(p[dateField], filter);
  }
  return true;
}
