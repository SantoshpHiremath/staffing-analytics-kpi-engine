/**
 * generateData.ts
 * ---------------
 * Synthetic staffing dataset generator, modeled on the shape of an
 * external-workforce-management platform (business units request roles,
 * agencies fill them, workers get placed). NOT real data from any
 * company — a seeded PRNG so results are reproducible, with deliberate,
 * realistic messiness: some requisitions are cancelled or still open
 * (not every requisition is a clean fill), and one requisition is
 * deliberately left without a matching placement record, to exercise
 * the cross-grain-join integrity check in costPerHire.ts.
 */

import type { Agency, Requisition, Placement, StaffingDataset } from "./types";

// Simple seeded PRNG (mulberry32) for reproducibility without a dependency.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUSINESS_UNITS = ["Logistics", "Manufacturing", "Retail Ops", "Warehousing"];
const COST_CENTRES: Record<string, string[]> = {
  Logistics: ["CC-100", "CC-101"],
  Manufacturing: ["CC-200", "CC-201"],
  "Retail Ops": ["CC-300"],
  Warehousing: ["CC-400", "CC-401"],
};
const ROLES = ["Forklift Operator", "Line Worker", "Picker/Packer", "Shift Supervisor", "Sorter"];

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

function pick<T>(rng: () => number, arr: T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) {
    throw new Error("pick() called with an empty array");
  }
  return item;
}

export function generateDataset(
  requisitionCount = 400,
  seed = 42
): StaffingDataset {
  const rng = mulberry32(seed);

  const agencies: Agency[] = Array.from({ length: 6 }, (_, i) => ({
    agencyId: `AG-${String(i + 1).padStart(2, "0")}`,
    name: `Agency ${i + 1}`,
  }));

  const requisitions: Requisition[] = [];
  const placements: Placement[] = [];

  for (let i = 0; i < requisitionCount; i++) {
    const businessUnit = pick(rng, BUSINESS_UNITS);
    const costCentresForUnit = COST_CENTRES[businessUnit];
    if (!costCentresForUnit) {
      throw new Error(`No cost centres configured for business unit "${businessUnit}"`);
    }
    const costCentre = pick(rng, costCentresForUnit);
    const role = pick(rng, ROLES);
    const agency = pick(rng, agencies);

    const openedAt = addDays("2025-01-01", Math.floor(rng() * 500));

    // Outcome distribution: 70% filled, 15% cancelled, 15% still open.
    // Cancellation/open likelihood is intentionally NOT correlated with
    // any feature here (this project's scope is correct aggregation
    // and access-scoping, not predictive signal, so a directionless
    // synthetic outcome is the right choice here).
    const outcomeRoll = rng();
    let status: Requisition["status"];
    let filledAt: string | null = null;
    let agencyFeeEur: number | null = null;

    if (outcomeRoll < 0.7) {
      status = "filled";
      const timeToHireDays = 5 + rng() * 40; // 5-45 days
      filledAt = addDays(openedAt, timeToHireDays);
      agencyFeeEur = Math.round((800 + rng() * 2200) * 100) / 100; // 800-3000 EUR
    } else if (outcomeRoll < 0.85) {
      status = "cancelled";
    } else {
      status = "open";
    }

    const requisitionId = `REQ-${String(i + 1).padStart(5, "0")}`;

    requisitions.push({
      requisitionId,
      businessUnit,
      costCentre,
      role,
      agencyId: status === "open" ? null : agency.agencyId,
      openedAt,
      filledAt,
      status,
      agencyFeeEur,
    });

    // Every filled requisition gets a placement, EXCEPT one deliberately
    // orphaned case (the 3rd filled requisition encountered) — models a
    // real data-integrity gap (e.g. a placement record that failed to
    // sync) so findOrphanedFilledRequisitions() has something real to find.
    if (status === "filled") {
      const isDeliberateOrphan = requisitions.filter((r) => r.status === "filled").length === 3;
      if (!isDeliberateOrphan) {
        const plannedDurationDays = pick(rng, [30, 60, 90, 180]);
        const terminatedEarly = rng() < 0.18; // ~18% early-termination rate
        const actualDurationDays = terminatedEarly
          ? Math.round(plannedDurationDays * (0.2 + rng() * 0.6))
          : plannedDurationDays;
        const stillActive = rng() < 0.1; // ~10% of placements are still ongoing

        placements.push({
          placementId: `PLC-${String(i + 1).padStart(5, "0")}`,
          requisitionId,
          agencyId: agency.agencyId,
          businessUnit,
          costCentre,
          role,
          startedAt: filledAt as string,
          endedAt: stillActive ? null : addDays(filledAt as string, actualDurationDays),
          plannedDurationDays,
          terminatedEarly: stillActive ? false : terminatedEarly,
        });
      }
    }
  }

  return { requisitions, placements, agencies };
}
