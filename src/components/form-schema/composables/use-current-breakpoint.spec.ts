import { describe, it, expect } from 'vitest'
import { useCurrentBreakpoint } from './use-current-breakpoint'

describe('useCurrentBreakpoint()', () => {
  it('默认断点是 md(中位断点,SSR 安全)', () => {
    const bp = useCurrentBreakpoint()
    expect(bp.value).toBe('md')
  })

  it('返回 Ref 类型,外部可订阅', () => {
    const bp = useCurrentBreakpoint()
    expect(bp.value).toBeDefined()
    expect(['xs', 'sm', 'md', 'lg', 'xl']).toContain(bp.value)
  })
})
