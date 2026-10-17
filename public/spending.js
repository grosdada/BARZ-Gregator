function validDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

export function spendingDate(job) {
  if (job?.status !== "completed") return null;
  return validDate(job.completedAt || job.updatedAt || job.createdAt);
}

export function localDayKey(value) {
  const date = validDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function completedSpendJobs(jobs) {
  return (jobs || []).filter((job) => (
    spendingDate(job) && Number.isFinite(Number(job.estimatedCost))
  )).sort((a, b) => spendingDate(b) - spendingDate(a));
}

export function jobsForSpendingPeriod(jobs, mode, anchor, selectedDay) {
  const anchorDate = validDate(anchor) || new Date();
  return completedSpendJobs(jobs).filter((job) => {
    const date = spendingDate(job);
    if (mode === "day") return localDayKey(date) === selectedDay;
    if (mode === "year") return date.getFullYear() === anchorDate.getFullYear();
    return date.getFullYear() === anchorDate.getFullYear() &&
      date.getMonth() === anchorDate.getMonth();
  });
}

export function groupSpendingJobs(jobs, mode) {
  const format = mode === "year"
    ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" })
    : new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const groups = new Map();
  for (const job of jobs) {
    const date = spendingDate(job);
    const key = mode === "year"
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : localDayKey(date);
    if (!groups.has(key)) groups.set(key, { key, label: format.format(date), jobs: [] });
    groups.get(key).jobs.push(job);
  }
  return [...groups.values()];
}

export function spendingTotals(jobs) {
  const totals = new Map();
  for (const job of jobs) {
    const currency = job.currency || job.pricing?.currency || "USD";
    totals.set(currency, (totals.get(currency) || 0) + Number(job.estimatedCost));
  }
  return totals;
}

export function calendarMonth(anchor) {
  const anchorDate = validDate(anchor) || new Date();
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: localDayKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === anchorDate.getMonth()
    };
  });
}
