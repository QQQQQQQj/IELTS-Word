/**
 * Local-calendar helpers. All persisted timestamps are epoch milliseconds;
 * date keys are local-time `YYYY-MM-DD` strings derived via these helpers
 * only, so day boundaries always follow the device timezone.
 */

export function dateKeyOf(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).getTime()
}

export function startOfNextLocalDay(timestamp: number): number {
  const date = new Date(timestamp)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
    0,
  ).getTime()
}

export function isSameLocalDay(first: number, second: number): boolean {
  return dateKeyOf(first) === dateKeyOf(second)
}

/** Whole local calendar days between two moments (b - a). */
export function localDayDifference(first: number, second: number): number {
  const dayMs = 24 * 60 * 60 * 1000
  return Math.round((startOfLocalDay(second) - startOfLocalDay(first)) / dayMs)
}
