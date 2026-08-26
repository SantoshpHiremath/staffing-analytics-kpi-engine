import { describe, it, expect } from "vitest";
import { generateDataset } from "../src/generateData";
import { findOrphanedFilledRequisitions } from "../src/projectors/costPerHire";

describe("generateDataset", () => {
  it("is deterministic for a given seed", () => {
    const a = generateDataset(200, 7);
    const b = generateDataset(200, 7);
    expect(a).toEqual(b);
  });

  it("produces a different dataset for a different seed", () => {
    const a = generateDataset(200, 7);
    const b = generateDataset(200, 8);
    expect(a).not.toEqual(b);
  });

  it("produces a mix of filled, cancelled, and open requisitions (not degenerate)", () => {
    const dataset = generateDataset(400, 42);
    const statuses = new Set(dataset.requisitions.map((r) => r.status));
    expect(statuses.has("filled")).toBe(true);
    expect(statuses.has("cancelled")).toBe(true);
    expect(statuses.has("open")).toBe(true);
  });

  it("every filled requisition has a non-null agencyFeeEur, and every non-filled requisition has a null fee", () => {
    const dataset = generateDataset(400, 42);
    for (const r of dataset.requisitions) {
      if (r.status === "filled") {
        expect(r.agencyFeeEur).not.toBeNull();
      } else {
        expect(r.agencyFeeEur).toBeNull();
      }
    }
  });

  it("contains at least one deliberately orphaned filled requisition, exercising the join-integrity check", () => {
    const dataset = generateDataset(400, 42);
    const orphans = findOrphanedFilledRequisitions(dataset);
    expect(orphans.length).toBeGreaterThan(0);
  });

  it("every placement references a requisitionId that actually exists in the requisitions array", () => {
    const dataset = generateDataset(400, 42);
    const requisitionIds = new Set(dataset.requisitions.map((r) => r.requisitionId));
    for (const p of dataset.placements) {
      expect(requisitionIds.has(p.requisitionId)).toBe(true);
    }
  });
});
