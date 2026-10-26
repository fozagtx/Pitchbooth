// SPDX-License-Identifier: MIT
export interface PracticeItem {
  label: string;
  date?: string;
  task: string;
}

const task = "Blank-board run, one take, then check your three fixes";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function practicePlan(from: Date): PracticeItem[] {
  return [
    { label: "Tonight", date: formatDate(from), task },
    { label: "Tomorrow", date: formatDate(addDays(from, 1)), task },
    { label: "In three days", date: formatDate(addDays(from, 3)), task },
    { label: "Day before", task },
  ];
}
