import { describe, expect, it } from 'vitest'
import { isValidRange, shiftWeeks } from './dates'

describe('shiftWeeks', () => {
  it('moves both ends across a year boundary', () => {
    expect(shiftWeeks({ from: '2025-12-22', to: '2025-12-28' }, 1)).toEqual({
      from: '2025-12-29',
      to: '2026-01-04',
    })
    expect(shiftWeeks({ from: '2026-01-05', to: '2026-01-16' }, -1)).toEqual({
      from: '2025-12-29',
      to: '2026-01-09',
    })
  })
})

describe('isValidRange', () => {
  it('rejects empty dates and an end before the start', () => {
    expect(isValidRange({ from: '2026-01-05', to: '2026-01-05' })).toBe(true)
    expect(isValidRange({ from: '', to: '2026-01-05' })).toBe(false)
    expect(isValidRange({ from: '2026-01-16', to: '2026-01-05' })).toBe(false)
  })
})
