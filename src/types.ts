/**
 * types.ts
 * --------
 * Core domain types for the staffing-analytics KPI engine.
 *
 * This models the same shape of problem as an external-workforce
 * management platform's analytics module: individual staffing
 * "placements" (an agency filling a role for a business unit) are the
 * raw fact-grain records, and KPIs (fill rate, time-to-hire, turnover,
 * cost-per-hire) are aggregations over those records, sliceable by
 * dimension (agency, business unit, role, cost centre, time period).
 */

export type RequisitionStatus = "open" | "filled" | "cancelled";

/** A single staffing requisition: a role a business unit asked to fill. */
export interface Requisition {
  requisitionId: string;
  businessUnit: string;
  costCentre: string;
  role: string;
  agencyId: string | null; // null until assigned to an agency
  openedAt: string; // ISO date
  filledAt: string | null; // ISO date, null if not yet filled/cancelled
  status: RequisitionStatus;
  agencyFeeEur: number | null; // cost paid to the agency, null until filled
}

/** A single worker placement resulting from a filled requisition. */
export interface Placement {
  placementId: string;
  requisitionId: string;
  agencyId: string;
  businessUnit: string;
  costCentre: string;
  role: string;
  startedAt: string; // ISO date
  endedAt: string | null; // ISO date, null if still active
  plannedDurationDays: number; // contracted length
  terminatedEarly: boolean; // true if endedAt < plannedDuration and not a natural contract end
}

export interface Agency {
  agencyId: string;
  name: string;
}

/** The full raw dataset a KPI projector reads from. */
export interface StaffingDataset {
  requisitions: Requisition[];
  placements: Placement[];
  agencies: Agency[];
}

/** Dimensions a KPI can be sliced by. All optional; omitted = no filter on that dimension. */
export interface DimensionFilter {
  businessUnit?: string;
  costCentre?: string;
  role?: string;
  agencyId?: string;
  periodStart?: string; // ISO date, inclusive
  periodEnd?: string; // ISO date, inclusive
}

/** Access scope: restricts which business units/cost centres a caller may query, independent of any filter they pass in. */
export interface AccessScope {
  /** Business units this caller is allowed to see. `"*"` means unrestricted. */
  allowedBusinessUnits: string[] | "*";
}

export interface KpiResult {
  metric: string;
  value: number;
  unit: string;
  sampleSize: number;
  /** True if sampleSize was too small for the value to be meaningful (see MIN_SAMPLE_SIZE). */
  lowConfidence: boolean;
}

export class AccessDeniedError extends Error {
  constructor(businessUnit: string) {
    super(`Access denied: caller is not scoped to business unit "${businessUnit}"`);
    this.name = "AccessDeniedError";
  }
}

export class InvalidFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFilterError";
  }
}
