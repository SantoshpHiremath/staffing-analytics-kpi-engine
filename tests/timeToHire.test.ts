import { describe, it, expect } from "vitest";
import { projectTimeToHire, weightedAverage } from "../src/projectors/timeToHire";
import { getKpiByDimension } from "../src/semanticLayer";
import { buildFixtureDataset } from "./fixtures";
import type { AccessScope } from "../src/types";

const OPEN_SCOPE: AccessScope = { allowedBusinessUnits: "*" };

describe("projectTimeToHire", () => {
  it("computes the average days-to-fill across filled requisitions only", () => {
    const dataset = buildFixtureDataset();
    // Logistics filled: R1 (10 days), R2 (20 days), R3 (5 days) -> avg = 35/3 = 11.67
    const result = projectTimeToHire(dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    expect(result.value).toBeCloseTo(11.7, 1);
    expect(result.sampleSize).toBe(3);
  });

  it("excludes cancelled and open requisitions (they have no filledAt)", () => {
    const dataset = buildFixtureDataset();
    const result = projectTimeToHire(dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    // Only 3 filled requisitions counted, not 5 total.
    expect(result.sampleSize).toBe(3);
  });

  it("computes Manufacturing time-to-hire correctly (R6: 30 days, R7: 15 days -> avg 22.5)", () => {
    const dataset = buildFixtureDataset();
    const result = projectTimeToHire(dataset, { businessUnit: "Manufacturing" }, OPEN_SCOPE);
    expect(result.value).toBeCloseTo(22.5, 1);
    expect(result.sampleSize).toBe(2);
  });
});

describe("weightedAverage (weighted vs naive average-of-averages)", () => {
  it("computes a sample-size-weighted rollup, which differs from a naive average when sample sizes differ", () => {
    const dataset = buildFixtureDataset();
    const byUnit = getKpiByDimension("time_to_hire", "businessUnit", dataset, OPEN_SCOPE);

    // Logistics: 11.67 days (n=3). Manufacturing: 22.5 days (n=2).
    const weighted = weightedAverage(byUnit.map((b) => b.result));
    const naive = byUnit.reduce((sum, b) => sum + b.result.value, 0) / byUnit.length;

    // Weighted: (11.7*3 + 22.5*2) / 5 = (35.1 + 45) / 5 = 16.02
    // Naive:    (11.7 + 22.5) / 2 = 17.1
    expect(weighted).toBeCloseTo(16.02, 1);
    expect(naive).toBeCloseTo(17.1, 1);
    // The core regression this test guards: these must NOT be equal
    // whenever sample sizes differ across slices, proving the weighting
    // actually changes the answer rather than being a no-op.
    expect(Math.abs(weighted - naive)).toBeGreaterThan(0.5);
  });

  it("returns 0 for an empty result set rather than dividing by zero", () => {
    expect(weightedAverage([])).toBe(0);
  });

  it("matches the single value when only one slice has any sample", () => {
    const single = weightedAverage([{ metric: "time_to_hire", value: 10, unit: "days", sampleSize: 4, lowConfidence: true }]);
    expect(single).toBe(10);
  });
});
