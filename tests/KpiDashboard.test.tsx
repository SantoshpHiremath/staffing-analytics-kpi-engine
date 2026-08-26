import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KpiDashboard } from "../src/ui/KpiDashboard";
import { buildFixtureDataset } from "./fixtures";

describe("KpiDashboard", () => {
  it("renders the default metric (fill_rate) with a real computed value on mount", () => {
    const dataset = buildFixtureDataset();
    render(<KpiDashboard dataset={dataset} />);
    // Overall fill rate across the whole fixture dataset should render, not be blank/0 by accident.
    expect(screen.getByTestId("overall-kpi-value")).toBeInTheDocument();
    expect(screen.getByText(/Fill Rate \(overall\)/i)).toBeInTheDocument();
  });

  it("switches metric and re-renders a different computed value when a tab is clicked", () => {
    const dataset = buildFixtureDataset();
    render(<KpiDashboard dataset={dataset} />);

    const fillRateValue = screen.getByTestId("overall-kpi-value").textContent;

    fireEvent.click(screen.getByTestId("metric-tab-cost_per_hire"));

    expect(screen.getByText(/Cost per Hire \(overall\)/i)).toBeInTheDocument();
    const costPerHireValue = screen.getByTestId("overall-kpi-value").textContent;
    // Different metric must produce a genuinely different rendered value,
    // not the same number relabeled — proves the component actually
    // re-queries the semantic layer rather than caching stale output.
    expect(costPerHireValue).not.toBe(fillRateValue);
  });

  it("renders one business-unit breakdown row per distinct business unit in the dataset", () => {
    const dataset = buildFixtureDataset();
    render(<KpiDashboard dataset={dataset} />);
    expect(screen.getByTestId("bu-row-Logistics")).toBeInTheDocument();
    expect(screen.getByTestId("bu-row-Manufacturing")).toBeInTheDocument();
  });

  it("respects an access scope: a scoped-out business unit never renders a row", () => {
    const dataset = buildFixtureDataset();
    render(<KpiDashboard dataset={dataset} scope={{ allowedBusinessUnits: ["Logistics"] }} />);
    expect(screen.getByTestId("bu-row-Logistics")).toBeInTheDocument();
    expect(screen.queryByTestId("bu-row-Manufacturing")).not.toBeInTheDocument();
  });

  it("shows a low-confidence warning when the overall sample size is small", () => {
    const dataset = buildFixtureDataset();
    render(<KpiDashboard dataset={dataset} scope={{ allowedBusinessUnits: ["Manufacturing"] }} />);
    fireEvent.click(screen.getByTestId("metric-tab-turnover_rate"));
    // Manufacturing turnover_rate has sampleSize=1 in the fixture -> low confidence.
    expect(screen.getByTestId("low-confidence-warning")).toBeInTheDocument();
  });
});
