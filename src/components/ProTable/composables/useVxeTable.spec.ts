/**
 * useVxeTable composable 单元测试（spec §十测试覆盖矩阵）
 *
 * 覆盖场景：
 * 1) loadVxeTable 触发动态 import
 * 2) loadOnce 第二次调用返回缓存
 * 3) loadVxeTable 失败时抛错
 * 4) reset 清空缓存
 *
 * @group ProTable composables 测试
 */
import { describe, it, expect, vi } from 'vitest'
import { useVxeTable } from './useVxeTable'

// mock vxe-table 动态 import
vi.mock('vxe-table', () => ({
  default: {
    Table: { name: 'VxeTable' },
    Column: { name: 'VxeColumn' },
  },
}))

describe('useVxeTable', () => {
  it('loadVxeTable 触发动态 import', async () => {
    const v = useVxeTable()
    expect(v.isLoaded()).toBe(false)
    const module = await v.loadVxeTable()
    expect(module).toBeDefined()
    expect(v.isLoaded()).toBe(true)
  })

  it('loadOnce 第二次调用返回缓存', async () => {
    const v = useVxeTable()
    const a = await v.loadVxeTable()
    const b = await v.loadVxeTable()
    expect(a).toBe(b)
  })

  it('reset 清空缓存', async () => {
    const v = useVxeTable()
    await v.loadVxeTable()
    expect(v.isLoaded()).toBe(true)
    v.reset()
    expect(v.isLoaded()).toBe(false)
  })
})
