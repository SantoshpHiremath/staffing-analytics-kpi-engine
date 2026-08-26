import { describe, it, expect } from "vitest";
import { projectCostPerHire, findOrphanedFilledRequisitions } from "../src/projectors/costPerHire";
import { buildFixtureDataset } from "./fixtures";
import type { AccessScope } from "../src/types";

const OPEN_SCOPE: AccessScope = { allowedBusinessUnits: "*" };

describe("projectCostPerHire", () => {
  it("computes total fee / count of joined hires for a scoped slice", () => {
    const dataset = buildFixtureDataset();
    // Logistics filled+fee: R1 (1000), R2 (2000), R3 (1500), all with matching placements.
    // Total = 4500, count = 3, avg = 1500.
    const result = projectCostPerHire(dataset, { businessUnit: "Logistics" }, OPEN_SCOPE);
    expect(result.value).toBe(1500);
    expect(result.sampleSize).toBe(3);
  });

  it("excludes an orphaned filled requisition (fee present, but no matching placement record)", () => {
    const dataset = buildFixtureDataset();
    // Manufacturing filled+fee: R6 (3000, has placement P4), R7 (2500, NO placement — orphan).
    // Correct behavior: only R6 counts. avg = 3000, n = 1.
    const result = projectCostPerHire(dataset, { businessUnit: "Manufacturing" }, OPEN_SCOPE);
    expect(result.value).toBe(3000);
    expect(result.sampleSize).toBe(1);
  });

  it("regression: naively averaging over ALL filled+fee requisitions without the join would give a different, wrong answer", () => {
    const dataset = buildFixtureDataset();
    const correct = projectCostPerHire(dataset, { businessUnit: "Manufacturing" }, OPEN_SCOPE);
    // The wrong, unjoined calculation would be (3000 + 2500) / 2 = 2750.
    const naiveWrongAverage = (3000 + 2500) / 2;
    expect(correct.value).not.toBe(naiveWrongAverage);
    expect(correct.value).toBe(3000);
  });

  it("does not treat a null agencyFeeEur as zero cost", () => {
    const dataset = buildFixtureDataset();
    // R8 (Manufacturing, cancelled) has agencyFeeEur: null and status "cancelled" —
    // must not appear in either numerator or denominator, and must not
    // drag cost-per-hire toward 0.
    const result = projectCostPerHire(dataset, { businessUnit: "Manufacturing" }, OPEN_SCOPE);
    expect(result.value).toBeGreaterThan(0);
    expect(result.sampleSize).toBe(1); // not 2 or 3 — R7 (orphan) and R8 (cancelled/null fee) both excluded
  });
});

describe("findOrphanedFilledRequisitions", () => {
  it("identifies exactly the filled+fee requisitions with no matching placement", () => {
    const dataset = buildFixtureDataset();
    const orphans = findOrphanedFilledRequisitions(dataset);
    expect(orphans).toEqual(["R7"]);
  });

  it("returns an empty array when every filled requisition has a matching placement", () => {
    const dataset = buildFixtureDataset();
    // Remove the orphan requisition entirely to construct a clean dataset.
    const clean = { ...dataset, requisitions: dataset.requisitions.filter((r) => r.requisitionId !== "R7") };
    expect(findOrphanedFilledRequisitions(clean)).toEqual([]);
  });
});
