export const MAX_WEEKLY_HOURS = 168

export function isOver(allocated: number, weeklyHours: number): boolean {
  return allocated > weeklyHours
}

// loadPercent is only for drawing the bar. It caps at 100 and is 0 for zero
// capacity; whether a week is over is always decided by isOver.
export function loadPercent(allocated: number, weeklyHours: number): number {
  if (weeklyHours <= 0) return 0
  return Math.min(allocated / weeklyHours, 1) * 100
}

export function parseWeeklyHours(input: string): number | null {
  const hours = Number(input)
  if (input.trim() === '' || !Number.isFinite(hours)) return null
  if (hours < 0 || hours > MAX_WEEKLY_HOURS) return null
  return hours
}

export function formatHours(hours: number): string {
  return String(Math.round(hours * 100) / 100)
}
