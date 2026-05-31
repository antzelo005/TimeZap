export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createLocalDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day);
}

export function getLocalMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
