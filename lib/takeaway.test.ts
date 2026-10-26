// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { practicePlan } from "./takeaway";

describe("practice plan", () => {
  it("schedules same-day, next-day, and three-day practice across month-end", () => {
    const plan = practicePlan(new Date(2025, 11, 30, 10, 15));
    const task = "Blank-board run, one take, then check your three fixes";

    expect(plan).toEqual([
      { label: "Tonight", date: "2025-12-30", task },
      { label: "Tomorrow", date: "2025-12-31", task },
      { label: "In three days", date: "2026-01-02", task },
      { label: "Day before", task },
    ]);
  });
});
