/**
 * access.ts
 * ---------
 * Enforces that a query is scoped to the data a caller is allowed to see,
 * independent of whatever dimension filter they pass in. This is the
 * "every query is scoped to the data a user is allowed to see" concern
 * named directly in the posting — modeled here as a dedicated,
 * unit-testable module rather than an inline check easy to forget in one
 * projector and not another.
 */

import type { AccessScope, DimensionFilter } from "./types";
import { AccessDeniedError, InvalidFilterError } from "./types";

/**
 * Validates that a filter's businessUnit (if present) is within the
 * caller's access scope, and returns an *effective* filter: if the
 * caller didn't request a specific business unit but is restricted to
 * a fixed set, the effective filter is narrowed to that set implicitly
 * by throwing on any downstream cross-unit aggregation attempt — see
 * `assertRowInScope` for the row-level enforcement this pairs with.
 *
 * Throws AccessDeniedError if the caller explicitly requests a business
 * unit outside their scope. This must run BEFORE any aggregation, so a
 * caller can never observe an error message that leaks aggregate data
 * about a unit they're not scoped to.
 */
export function assertFilterInScope(filter: DimensionFilter, scope: AccessScope): void {
  if (filter.businessUnit === undefined) return; // no explicit request — fine, row-level scoping still applies
  if (scope.allowedBusinessUnits === "*") return;
  if (!scope.allowedBusinessUnits.includes(filter.businessUnit)) {
    throw new AccessDeniedError(filter.businessUnit);
  }
}

/**
 * Row-level scoping: returns true if a given business unit is visible
 * to this caller. Used to filter the underlying record set BEFORE
 * aggregation, so a caller with no explicit businessUnit filter still
 * only ever sees data for units they're scoped to (rather than relying
 * solely on the filter-level check above, which only catches an
 * explicit out-of-scope request).
 */
export function isBusinessUnitInScope(businessUnit: string, scope: AccessScope): boolean {
  if (scope.allowedBusinessUnits === "*") return true;
  return scope.allowedBusinessUnits.includes(businessUnit);
}

/** Basic sanity checks on a filter shared by every projector. */
export function validateFilter(filter: DimensionFilter): void {
  if (filter.periodStart && filter.periodEnd && filter.periodStart > filter.periodEnd) {
    throw new InvalidFilterError(
      `periodStart (${filter.periodStart}) must not be after periodEnd (${filter.periodEnd})`
    );
  }
}
