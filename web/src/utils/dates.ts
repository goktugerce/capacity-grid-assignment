import type { DateRange } from '../types'

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function shiftWeeks({ from, to }: DateRange, weeks: number): DateRange {
  return { from: addDays(from, weeks * 7), to: addDays(to, weeks * 7) }
}

export function isValidRange({ from, to }: DateRange): boolean {
  return from !== '' && to !== '' && from <= to
}
