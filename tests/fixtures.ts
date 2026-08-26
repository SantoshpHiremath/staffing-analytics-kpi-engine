/**
 * fixtures.ts — small, hand-built (not generated) datasets for
 * deterministic unit tests where exact expected values are computed by
 * hand in the test itself, rather than trusting generateData.ts's output.
 */

import type { StaffingDataset, Requisition, Placement, Agency } from "../src/types";

export function buildFixtureDataset(): StaffingDataset {
  const agencies: Agency[] = [
    { agencyId: "AG-01", name: "Agency One" },
    { agencyId: "AG-02", name: "Agency Two" },
  ];

  const requisitions: Requisition[] = [
    // Logistics: 3 filled, 1 cancelled, 1 open
    { requisitionId: "R1", businessUnit: "Logistics", costCentre: "CC-100", role: "Picker", agencyId: "AG-01", openedAt: "2025-01-01", filledAt: "2025-01-11", status: "filled", agencyFeeEur: 1000 },
    { requisitionId: "R2", businessUnit: "Logistics", costCentre: "CC-100", role: "Picker", agencyId: "AG-01", openedAt: "2025-01-01", filledAt: "2025-01-21", status: "filled", agencyFeeEur: 2000 },
    { requisitionId: "R3", businessUnit: "Logistics", costCentre: "CC-100", role: "Sorter", agencyId: "AG-02", openedAt: "2025-02-01", filledAt: "2025-02-06", status: "filled", agencyFeeEur: 1500 },
    { requisitionId: "R4", businessUnit: "Logistics", costCentre: "CC-100", role: "Picker", agencyId: "AG-01", openedAt: "2025-01-01", filledAt: null, status: "cancelled", agencyFeeEur: null },
    { requisitionId: "R5", businessUnit: "Logistics", costCentre: "CC-100", role: "Picker", agencyId: null, openedAt: "2025-03-01", filledAt: null, status: "open", agencyFeeEur: null },
    // Manufacturing: 1 filled, 1 filled with NO placement (orphan), 1 cancelled
    { requisitionId: "R6", businessUnit: "Manufacturing", costCentre: "CC-200", role: "Line Worker", agencyId: "AG-02", openedAt: "2025-01-01", filledAt: "2025-01-31", status: "filled", agencyFeeEur: 3000 },
    { requisitionId: "R7", businessUnit: "Manufacturing", costCentre: "CC-200", role: "Line Worker", agencyId: "AG-02", openedAt: "2025-01-01", filledAt: "2025-01-16", status: "filled", agencyFeeEur: 2500 }, // orphan: no placement below
    { requisitionId: "R8", businessUnit: "Manufacturing", costCentre: "CC-200", role: "Line Worker", agencyId: "AG-02", openedAt: "2025-01-01", filledAt: null, status: "cancelled", agencyFeeEur: null },
  ];

  const placements: Placement[] = [
    // R1: ended on time, not early -> not turnover
    { placementId: "P1", requisitionId: "R1", agencyId: "AG-01", businessUnit: "Logistics", costCentre: "CC-100", role: "Picker", startedAt: "2025-01-11", endedAt: "2025-02-10", plannedDurationDays: 30, terminatedEarly: false },
    // R2: ended early -> turnover
    { placementId: "P2", requisitionId: "R2", agencyId: "AG-01", businessUnit: "Logistics", costCentre: "CC-100", role: "Picker", startedAt: "2025-01-21", endedAt: "2025-01-31", plannedDurationDays: 30, terminatedEarly: true },
    // R3: still active (endedAt null) -> excluded from turnover denominator
    { placementId: "P3", requisitionId: "R3", agencyId: "AG-02", businessUnit: "Logistics", costCentre: "CC-100", role: "Sorter", startedAt: "2025-02-06", endedAt: null, plannedDurationDays: 60, terminatedEarly: false },
    // R6: ended early -> turnover
    { placementId: "P4", requisitionId: "R6", agencyId: "AG-02", businessUnit: "Manufacturing", costCentre: "CC-200", role: "Line Worker", startedAt: "2025-01-31", endedAt: "2025-02-10", plannedDurationDays: 90, terminatedEarly: true },
    // R7 deliberately has NO matching placement (orphan case for cross-grain join test)
  ];

  return { requisitions, placements, agencies };
}
