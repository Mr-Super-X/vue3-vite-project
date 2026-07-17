import { describe, it, expect } from 'vitest'
import { formatDate, formatMoney, truncate } from './format'

describe('formatDate', () => {
  it('formats ISO date to YYYY-MM-DD', () => {
    expect(formatDate('2026-07-17T10:00:00Z')).toBe('2026-07-17')
  })
  it('returns "-" for invalid input', () => {
    expect(formatDate('invalid')).toBe('-')
  })
  it('handles Date object', () => {
    expect(formatDate(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01')
  })
})

describe('formatMoney', () => {
  it('formats number with thousand separators', () => {
    expect(formatMoney(1234567.5)).toBe('1,234,567.50')
  })
  it('returns "0.00" for zero', () => {
    expect(formatMoney(0)).toBe('0.00')
  })
})

describe('truncate', () => {
  it('truncates long string with ellipsis', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...')
  })
  it('returns original if shorter than limit', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })
})