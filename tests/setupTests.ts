import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library does not auto-clean between tests outside of a
// framework with built-in afterEach hooks (e.g. Jest's global config) —
// without this, each render() leaves its DOM mounted for the next test,
// causing "multiple elements found" failures. Caught by actually running
// the suite, not assumed from React Testing Library's docs.
afterEach(() => {
  cleanup();
});
