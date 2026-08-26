import { describe, it, expect } from "vitest";
import { projectFillRate } from "../src/projectors/fillRate";
import { buildFixtureDataset } from "./fixtures";
import type { AccessScope } from "../src/types";

const OPEN_SCOPE: AccessScope = { allowedBusinessUnits: "*" };

describe("projectFillRate", () => {
  it("computes fill rate as filled / (filled + cancelled), excluding still-open requisitions", () => {
    const dataset = buildFixtureDataset();
    // Logistics: R1, R2, R3 filled; R4 cancelled; R5 open (excluded).
    // Terminal = 4 (R1,R2,R3,R4). Filled = 3. Rate = 75%.
    const result = projectFillRate(dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    expect(result.value).toBe(75);
    expect(result.sampleSize).toBe(4);
  });

  it("excludes open requisitions from the denominator (regression: including them would understate the rate)", () => {
    const dataset = buildFixtureDataset();
    const result = projectFillRate(dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    // If R5 (open) were wrongly included in the denominator: 3/5 = 60%, not 75%.
    expect(result.value).not.toBe(60);
    expect(result.value).toBe(75);
  });

  it("computes Manufacturing fill rate correctly (2 filled, 1 cancelled -> 66.7%)", () => {
    const dataset = buildFixtureDataset();
    const result = projectFillRate(dataset, { businessUnit: "Manufacturing" }, OPEN_SCOPE);
    expect(result.value).toBeCloseTo(66.7, 1);
    expect(result.sampleSize).toBe(3);
  });

  it("flags lowConfidence when sample size is below the threshold", () => {
    const dataset = buildFixtureDataset();
    const result = projectFillRate(dataset, { businessUnit: "Manufacturing" }, OPEN_SCOPE);
    expect(result.sampleSize).toBeLessThan(5);
    expect(result.lowConfidence).toBe(true);
  });

  it("returns 0 with lowConfidence when there are no terminal requisitions at all", () => {
    const dataset = buildFixtureDataset();
    const result = projectFillRate(dataset, { role: "Nonexistent Role" }, OPEN_SCOPE);
    expect(result.value).toBe(0);
    expect(result.sampleSize).toBe(0);
    expect(result.lowConfidence).toBe(true);
  });

  it("respects role and costCentre dimension filters simultaneously", () => {
    const dataset = buildFixtureDataset();
    const result = projectFillRate(dataset, { businessUnit: "Logistics", role: "Picker" }, OPEN_SCOPE);
    // Picker in Logistics: R1(filled), R2(filled), R4(cancelled). R3 is Sorter, excluded.
    expect(result.sampleSize).toBe(3);
    expect(result.value).toBeCloseTo(66.7, 1);
  });
});
