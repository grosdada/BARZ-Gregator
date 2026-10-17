import test from "node:test";
import assert from "node:assert/strict";

import {
  calendarMonth,
  completedSpendJobs,
  groupSpendingJobs,
  jobsForSpendingPeriod,
  localDayKey,
  spendingTotals
} from "../public/spending.js";

const jobs = [
  { id: "a", status: "completed", estimatedCost: 0.25, currency: "USD",
    completedAt: "2026-09-10T10:00:00Z" },
  { id: "b", status: "completed", estimatedCost: 0.5, currency: "USD",
    updatedAt: "2026-09-10T12:00:00Z" },
  { id: "c", status: "completed", estimatedCost: 0.1, currency: "USD",
    completedAt: "2026-08-02T10:00:00Z" },
  { id: "failed", status: "failed", estimatedCost: 2, currency: "USD",
    updatedAt: "2026-09-10T12:00:00Z" },
  { id: "prepared", status: "awaiting_confirmation", estimatedCost: 3, currency: "USD",
    updatedAt: "2026-09-10T12:00:00Z" }
];

test("counts only completed generations as local spending", () => {
  assert.deepEqual(completedSpendJobs(jobs).map((job) => job.id), ["b", "a", "c"]);
  assert.equal(spendingTotals(completedSpendJobs(jobs)).get("USD"), 0.85);
});

test("filters and groups spending by day, month, and year", () => {
  const anchor = new Date(2026, 8, 10, 12);
  assert.deepEqual(jobsForSpendingPeriod(jobs, "day", anchor, "2026-09-10")
    .map((job) => job.id), ["b", "a"]);
  assert.deepEqual(jobsForSpendingPeriod(jobs, "month", anchor, "")
    .map((job) => job.id), ["b", "a"]);
  const yearly = jobsForSpendingPeriod(jobs, "year", anchor, "");
  assert.deepEqual(yearly.map((job) => job.id), ["b", "a", "c"]);
  assert.equal(groupSpendingJobs(yearly, "year").length, 2);
});

test("builds a Monday-first six-week calendar", () => {
  const days = calendarMonth(new Date(2026, 8, 10, 12));
  assert.equal(days.length, 42);
  assert.equal(days[0].date.getDay(), 1);
  assert.equal(days.filter((day) => day.inMonth).length, 30);
  assert.equal(localDayKey(days.find((day) => day.day === 10 && day.inMonth).date),
    "2026-09-10");
});
