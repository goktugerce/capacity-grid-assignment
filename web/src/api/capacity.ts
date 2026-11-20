import type { CapacityFilters, CapacityPage, DateRange, PersonAllocations } from '../types'

const UNREACHABLE = 'the server is not responding'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    if (init?.signal?.aborted) throw err
    throw new Error(UNREACHABLE)
  }
  if (res.ok) return res.json()
  if (res.status >= 502) throw new Error(UNREACHABLE)

  const body: unknown = await res.json().catch(() => null)
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    throw new Error(body.error)
  }
  throw new Error(`request failed (${res.status})`)
}

export function fetchCapacity(
  range: DateRange,
  filters: CapacityFilters,
  offset: number,
  signal?: AbortSignal,
): Promise<CapacityPage> {
  const query = new URLSearchParams({
    from: range.from,
    to: range.to,
    q: filters.search,
    sort: filters.nameDescending ? '-name' : 'name',
    over: String(filters.overOnly),
    offset: String(offset),
  })
  return request(`/api/capacity?${query}`, { signal })
}

export function fetchPersonAllocations(
  personId: number,
  range: DateRange,
  signal?: AbortSignal,
): Promise<PersonAllocations> {
  const query = new URLSearchParams({ from: range.from, to: range.to })
  return request(`/api/people/${personId}/allocations?${query}`, { signal })
}

export function saveWeeklyHours(
  id: number,
  weeklyHours: number,
): Promise<{ id: number; weeklyHours: number }> {
  return request(`/api/people/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weeklyHours }),
  })
}
