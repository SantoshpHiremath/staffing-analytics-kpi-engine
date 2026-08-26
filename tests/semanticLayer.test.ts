import { describe, it, expect } from "vitest";
import { getKpi, getKpiByDimension } from "../src/semanticLayer";
import { buildFixtureDataset } from "./fixtures";
import type { AccessScope } from "../src/types";

const OPEN_SCOPE: AccessScope = { allowedBusinessUnits: "*" };

describe("getKpi (semantic layer entry point)", () => {
  it("resolves each registered metric name to the correct projector", () => {
    const dataset = buildFixtureDataset();
    const fillRate = getKpi("fill_rate", dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    const timeToHire = getKpi("time_to_hire", dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    const turnover = getKpi("turnover_rate", dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    const costPerHire = getKpi("cost_per_hire", dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);

    expect(fillRate.metric).toBe("fill_rate");
    expect(timeToHire.metric).toBe("time_to_hire");
    expect(turnover.metric).toBe("turnover_rate");
    expect(costPerHire.metric).toBe("cost_per_hire");
  });

  it("throws a clear error for an unknown metric name rather than returning undefined", () => {
    const dataset = buildFixtureDataset();
    // @ts-expect-error deliberately passing an invalid metric name to test runtime behavior
    expect(() => getKpi("nonexistent_metric", dataset, {}, OPEN_SCOPE)).toThrow(/Unknown metric/);
  });

  it("applies default empty filter and unrestricted scope when omitted", () => {
    const dataset = buildFixtureDataset();
    const result = getKpi("fill_rate", dataset);
    // Should aggregate across ALL business units, not throw or return empty.
    expect(result.sampleSize).toBeGreaterThan(0);
  });
});

describe("getKpiByDimension", () => {
  it("returns one entry per distinct dimension value present in the (scoped) data", () => {
    const dataset = buildFixtureDataset();
    const byUnit = getKpiByDimension("fill_rate", "businessUnit", dataset, OPEN_SCOPE);
    const units = byUnit.map((b) => b.dimensionValue).sort();
    expect(units).toEqual(["Logistics", "Manufacturing"]);
  });

  it("returns results sorted by dimension value for stable UI rendering", () => {
    const dataset = buildFixtureDataset();
    const byRole = getKpiByDimension("fill_rate", "role", dataset, OPEN_SCOPE);
    const roles = byRole.map((b) => b.dimensionValue);
    const sorted = [...roles].sort();
    expect(roles).toEqual(sorted);
  });

  it("excludes null agencyId from the agency dimension breakdown (open requisitions have no agency yet)", () => {
    const dataset = buildFixtureDataset();
    const byAgency = getKpiByDimension("fill_rate", "agencyId", dataset, OPEN_SCOPE);
    // R5 has agencyId: null (still open) — must not produce a "null" or undefined dimension entry.
    expect(byAgency.every((b) => b.dimensionValue !== null && b.dimensionValue !== "null")).toBe(true);
  });
});
