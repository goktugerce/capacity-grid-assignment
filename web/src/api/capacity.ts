import type { CapacityPage } from '../types'

async function readError(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null)
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return `request failed (${res.status})`
}

export async function fetchCapacity(
  from: string,
  to: string,
  offset: number,
  signal?: AbortSignal,
): Promise<CapacityPage> {
  const query = new URLSearchParams({ from, to, offset: String(offset) })
  const res = await fetch(`/api/capacity?${query}`, { signal })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function saveWeeklyHours(
  id: number,
  weeklyHours: number,
): Promise<{ id: number; weeklyHours: number }> {
  const res = await fetch(`/api/people/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weeklyHours }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}
