import { describe, expect, it } from 'vitest'
import { isOver, parseWeeklyHours } from './capacity'

describe('isOver', () => {
  it('is strict: exactly at capacity is not over', () => {
    expect(isOver(40, 40)).toBe(false)
    expect(isOver(45, 40)).toBe(true)
  })

  it('treats any allocation against zero capacity as over', () => {
    expect(isOver(20, 0)).toBe(true)
    expect(isOver(0, 0)).toBe(false)
  })
})

describe('parseWeeklyHours', () => {
  it('accepts 0 and rejects blanks, text and out-of-range values', () => {
    expect(parseWeeklyHours('0')).toBe(0)
    expect(parseWeeklyHours('37.5')).toBe(37.5)
    expect(parseWeeklyHours('')).toBeNull()
    expect(parseWeeklyHours('abc')).toBeNull()
    expect(parseWeeklyHours('-1')).toBeNull()
    expect(parseWeeklyHours('169')).toBeNull()
  })
})
