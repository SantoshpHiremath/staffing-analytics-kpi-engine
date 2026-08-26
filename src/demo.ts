/**
 * demo.ts — run with `npx tsx src/demo.ts` (or `npm run demo`)
 * Prints each KPI overall, sliced by business unit, and demonstrates
 * access scoping actually restricting results.
 */

import { generateDataset } from "./generateData";
import { getKpi, getKpiByDimension, weightedAverage, findOrphanedFilledRequisitions } from "./semanticLayer";
import { AccessDeniedError } from "./types";

const dataset = generateDataset();

console.log("=".repeat(70));
console.log("STAFFING ANALYTICS KPI ENGINE — DEMO");
console.log("=".repeat(70));

console.log(`\nDataset: ${dataset.requisitions.length} requisitions, ${dataset.placements.length} placements, ${dataset.agencies.length} agencies\n`);

for (const metric of ["fill_rate", "time_to_hire", "turnover_rate", "cost_per_hire"] as const) {
  const overall = getKpi(metric, dataset);
  console.log(`${metric.toUpperCase()}: ${overall.value} ${overall.unit} (n=${overall.sampleSize}${overall.lowConfidence ? ", LOW CONFIDENCE" : ""})`);

  const byUnit = getKpiByDimension(metric, "businessUnit", dataset);
  for (const { dimensionValue, result } of byUnit) {
    console.log(`    ${dimensionValue}: ${result.value} ${result.unit} (n=${result.sampleSize})`);
  }

  if (metric === "time_to_hire") {
    const rolledUp = weightedAverage(byUnit.map((b) => b.result));
    const naiveAverage = byUnit.reduce((sum, b) => sum + b.result.value, 0) / byUnit.length;
    console.log(
      `    -> weighted rollup of the ${byUnit.length} slices above: ${Math.round(rolledUp * 10) / 10} days` +
        ` (naive average-of-averages would give ${Math.round(naiveAverage * 10) / 10} days` +
        ` — ${rolledUp.toFixed(1) === naiveAverage.toFixed(1) ? "happens to match here" : "genuinely different, confirming weighting matters"})`
    );
  }
  console.log();
}

console.log("-".repeat(70));
console.log("DATA-INTEGRITY CHECK: orphaned filled requisitions (filled + fee, no placement)");
console.log("-".repeat(70));
const orphans = findOrphanedFilledRequisitions(dataset);
console.log(orphans.length > 0 ? orphans : "none found");

console.log("\n" + "-".repeat(70));
console.log("ACCESS SCOPING DEMO");
console.log("-".repeat(70));
const scopedResult = getKpi("fill_rate", dataset, { businessUnit: "Logistics" }, { allowedBusinessUnits: ["Logistics"] });
console.log(`Caller scoped to ["Logistics"] asking for Logistics fill_rate: OK -> ${scopedResult.value}%`);

try {
  getKpi("fill_rate", dataset, { businessUnit: "Manufacturing" }, { allowedBusinessUnits: ["Logistics"] });
  console.log("ERROR: should have thrown AccessDeniedError");
} catch (e) {
  if (e instanceof AccessDeniedError) {
    console.log(`Caller scoped to ["Logistics"] asking for Manufacturing fill_rate: correctly denied -> "${e.message}"`);
  } else {
    throw e;
  }
}

console.log("\nDone.");
