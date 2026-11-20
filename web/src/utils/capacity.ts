export const MAX_WEEKLY_HOURS = 168

export function isOver(allocated: number, weeklyHours: number): boolean {
  return allocated > weeklyHours
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
