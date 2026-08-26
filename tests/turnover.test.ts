import { describe, it, expect } from "vitest";
import { projectTurnoverRate } from "../src/projectors/turnover";
import { buildFixtureDataset } from "./fixtures";
import type { AccessScope } from "../src/types";

const OPEN_SCOPE: AccessScope = { allowedBusinessUnits: "*" };

describe("projectTurnoverRate", () => {
  it("computes turnover as terminatedEarly / ended placements, excluding still-active placements", () => {
    const dataset = buildFixtureDataset();
    // Logistics placements: P1 (ended, not early), P2 (ended, early), P3 (still active -> excluded).
    // Ended = 2 (P1, P2). Early = 1 (P2). Rate = 50%.
    const result = projectTurnoverRate(dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    expect(result.value).toBe(50);
    expect(result.sampleSize).toBe(2);
  });

  it("regression: including the still-active placement would wrongly lower the rate to 33.3%", () => {
    const dataset = buildFixtureDataset();
    const result = projectTurnoverRate(dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    expect(result.value).not.toBeCloseTo(33.3, 1);
    expect(result.value).toBe(50);
  });

  it("computes Manufacturing turnover correctly (1 ended, 1 early -> 100%)", () => {
    const dataset = buildFixtureDataset();
    const result = projectTurnoverRate(dataset, { businessUnit: "Manufacturing" }, OPEN_SCOPE);
    expect(result.value).toBe(100);
    expect(result.sampleSize).toBe(1);
    expect(result.lowConfidence).toBe(true);
  });

  it("returns 0 with lowConfidence when there are no ended placements", () => {
    const dataset = buildFixtureDataset();
    const result = projectTurnoverRate(dataset, { role: "Nonexistent" }, OPEN_SCOPE);
    expect(result.value).toBe(0);
    expect(result.sampleSize).toBe(0);
    expect(result.lowConfidence).toBe(true);
  });
});
