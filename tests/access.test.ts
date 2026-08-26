import { describe, it, expect } from "vitest";
import { projectFillRate } from "../src/projectors/fillRate";
import { getKpiByDimension } from "../src/semanticLayer";
import { assertFilterInScope, isBusinessUnitInScope, validateFilter } from "../src/access";
import { buildFixtureDataset } from "./fixtures";
import { AccessDeniedError, InvalidFilterError } from "../src/types";
import type { AccessScope } from "../src/types";

describe("access scoping", () => {
  it("allows a query for a business unit within the caller's scope", () => {
    const dataset = buildFixtureDataset();
    const scope: AccessScope = { allowedBusinessUnits: ["Logistics"] };
    const result = projectFillRate(dataset, { businessUnit: "Logistics" }, scope);
    expect(result.sampleSize).toBeGreaterThan(0);
  });

  it("throws AccessDeniedError for an explicit out-of-scope business unit request", () => {
    const dataset = buildFixtureDataset();
    const scope: AccessScope = { allowedBusinessUnits: ["Logistics"] };
    expect(() => projectFillRate(dataset, { businessUnit: "Manufacturing" }, scope)).toThrow(AccessDeniedError);
  });

  it("row-level scoping: a query with NO explicit businessUnit filter still excludes out-of-scope rows, not just rejects an explicit request", () => {
    const dataset = buildFixtureDataset();
    const fullScope: AccessScope = { allowedBusinessUnits: "*" };
    const restrictedScope: AccessScope = { allowedBusinessUnits: ["Logistics"] };

    const unrestricted = projectFillRate(dataset, {}, fullScope);
    const restricted = projectFillRate(dataset, {}, restrictedScope);

    // Restricted caller should see fewer (or equal, never more) terminal
    // requisitions than an unrestricted caller, because Manufacturing
    // rows must be silently excluded, not just blocked when named explicitly.
    expect(restricted.sampleSize).toBeLessThan(unrestricted.sampleSize);
  });

  it("'*' scope grants access to every business unit", () => {
    const scope: AccessScope = { allowedBusinessUnits: "*" };
    expect(isBusinessUnitInScope("AnyRandomUnit", scope)).toBe(true);
  });

  it("assertFilterInScope does not throw when no businessUnit filter is given, regardless of scope", () => {
    const scope: AccessScope = { allowedBusinessUnits: ["Logistics"] };
    expect(() => assertFilterInScope({}, scope)).not.toThrow();
  });

  it("getKpiByDimension only returns dimension values the caller is scoped to see", () => {
    const dataset = buildFixtureDataset();
    const scope: AccessScope = { allowedBusinessUnits: ["Logistics"] };
    const byUnit = getKpiByDimension("fill_rate", "businessUnit", dataset, scope);
    // Only Logistics-scoped rows are visible, so the dimension-value
    // list itself must not include Manufacturing.
    for (const { dimensionValue } of byUnit) {
      expect(dimensionValue).not.toBe("Manufacturing");
    }
  });
});

describe("validateFilter", () => {
  it("rejects a period where periodStart is after periodEnd", () => {
    expect(() => validateFilter({ periodStart: "2025-06-01", periodEnd: "2025-01-01" })).toThrow(InvalidFilterError);
  });

  it("accepts a valid period range", () => {
    expect(() => validateFilter({ periodStart: "2025-01-01", periodEnd: "2025-06-01" })).not.toThrow();
  });

  it("accepts a filter with no period at all", () => {
    expect(() => validateFilter({ businessUnit: "Logistics" })).not.toThrow();
  });
});
