/**
 * useVirtualScroll 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useVirtualScroll } from './useVirtualScroll'

describe('useVirtualScroll', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('virtualized=true 启用', () => {
    const result = useVirtualScroll({
      props: { virtualized: true } as never,
      engine: ref('element-plus' as const),
      enableRowEdit: false,
    })
    expect(result.enabled.value).toBe(true)
  })

  it('virtualized=false 不启用', () => {
    const result = useVirtualScroll({
      props: { virtualized: false } as never,
      engine: ref('element-plus' as const),
      enableRowEdit: false,
    })
    expect(result.enabled.value).toBe(false)
  })

  it('virtualized=true + enableRowEdit=true 时 warn', () => {
    useVirtualScroll({
      props: { virtualized: true } as never,
      engine: ref('element-plus' as const),
      enableRowEdit: true,
    })
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('虚拟滚动启用时行内编辑不可用')
    )
  })

  it('element-plus 引擎 tableProps 含 rowHeight + height', () => {
    const result = useVirtualScroll({
      props: { virtualized: { rowHeight: 60 } } as never,
      engine: ref('element-plus' as const),
      enableRowEdit: false,
    })
    expect(result.tableProps.value).toMatchObject({
      rowHeight: 60,
      height: 500,
    })
  })

  it('vxe-table 引擎 tableProps 含 scroll-y', () => {
    const result = useVirtualScroll({
      props: { virtualized: true } as never,
      engine: ref('vxe-table' as const),
      enableRowEdit: false,
    })
    expect(result.tableProps.value).toHaveProperty('scroll-y')
  })

  it('使用默认值 rowHeight=48 overscan=10', () => {
    const result = useVirtualScroll({
      props: { virtualized: true } as never,
      engine: ref('element-plus' as const),
      enableRowEdit: false,
    })
    expect(result.config.value).toEqual({})
    expect(result.tableProps.value).toMatchObject({ rowHeight: 48 })
  })
})
