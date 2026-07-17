import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from './storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('set and get string', () => {
    storage.set('key', 'value')
    expect(storage.get('key')).toBe('value')
  })
  it('returns null for missing key', () => {
    expect(storage.get('missing')).toBe(null)
  })
  it('handles JSON object', () => {
    const obj = { name: 'test', count: 42 }
    storage.set('obj', obj)
    expect(storage.get('obj')).toEqual(obj)
  })
  it('remove deletes key', () => {
    storage.set('k', 'v')
    storage.remove('k')
    expect(storage.get('k')).toBe(null)
  })
  it('respects TTL expiration', async () => {
    storage.set('expiring', 'value', 50)
    expect(storage.get('expiring')).toBe('value')
    await new Promise((r) => setTimeout(r, 100))
    expect(storage.get('expiring')).toBe(null)
  })
})
