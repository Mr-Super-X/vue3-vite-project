/**
 * TreeAdapter 单元测试（v3.5 PR1-B Task 1 + Task 2）—— 验证 TreeAdapter 接口契约
 * 与 elementPlusTreeAdapter / vxeTreeAdapter 双引擎实现。
 *
 * @group ProTable adapters 测试
 */
import { describe, it, expect, vi } from 'vitest'
import {
  createElementPlusTreeAdapter,
  createVxeTreeAdapter,
  type TreeAdapter,
} from './tree-adapter'

describe('TreeAdapter (elementPlusTreeAdapter)', () => {
  const adapter = createElementPlusTreeAdapter()

  it('getTreeConfig 返回 el-table treeProps 配置', () => {
    const cfg = adapter.getTreeConfig()
    expect(cfg).toHaveProperty('treeProps')
    // 占位符字段指向不存在的 __pro_table_flat__，避免 el-table 识别真实 children 字段重复渲染
    const tp = cfg['treeProps'] as { children: string; hasChildren: string }
    expect(tp.children).toBe('__pro_table_flat__')
    expect(tp.hasChildren).toBe('__pro_table_flat__')
  })

  it('onExpand / onCollapse / syncExpanded 在 el 下全部 noop', () => {
    // el-table 不需要主动通知：flatData 重算 + :data 引用变化自动重渲染
    // 这些方法调用不应抛错，也不应改变任何状态
    expect(() => adapter.onExpand('k1')).not.toThrow()
    expect(() => adapter.onCollapse('k1')).not.toThrow()
    expect(() => adapter.syncExpanded(['k1'], new Map())).not.toThrow()
  })

  it('getExpandedKeys 在 el 下返回空数组（由 useTreeData 内部 Set 主导）', () => {
    // el-table 不维护引擎侧展开状态：返回空数组由 useTreeData 内部 Set 主导
    expect(adapter.getExpandedKeys()).toEqual([])
  })

  it('hasChildren 基于 _hasChildren 字段判定', () => {
    expect(adapter.hasChildren({ _hasChildren: true })).toBe(true)
    expect(adapter.hasChildren({ _hasChildren: false })).toBe(false)
    expect(adapter.hasChildren({})).toBe(false)
  })

  it('满足 TreeAdapter 接口契约（duck typing 6 方法签名）', () => {
    const a: TreeAdapter = adapter
    expect(typeof a.getTreeConfig).toBe('function')
    expect(typeof a.onExpand).toBe('function')
    expect(typeof a.onCollapse).toBe('function')
    expect(typeof a.getExpandedKeys).toBe('function')
    expect(typeof a.syncExpanded).toBe('function')
    expect(typeof a.hasChildren).toBe('function')
  })
})

describe('TreeAdapter (vxeTreeAdapter)', () => {
  it('getTreeConfig 返回 vxe-table tree-config 协议', () => {
    const adapter = createVxeTreeAdapter(() => null)
    const cfg = adapter.getTreeConfig()
    expect(cfg).toHaveProperty('treeConfig')
    const tc = cfg['treeConfig'] as {
      childrenField: string
      hasChildren: string
      expandAll: boolean
      accordion: boolean
      trigger: string
    }
    expect(tc.childrenField).toBe('__pro_table_flat__')
    expect(tc.hasChildren).toBe('__pro_table_flat__')
    expect(tc.expandAll).toBe(false)
    expect(tc.accordion).toBe(false)
    // trigger: 'cell' 与 el-table 单元格点击展开语义一致（vxe 默认 'default' 图标点击）
    expect(tc.trigger).toBe('cell')
  })

  it('onExpand 调 vxe-table setTreeExpand(row, true)', () => {
    const setTreeExpand = vi.fn()
    const adapter = createVxeTreeAdapter(() => ({ setTreeExpand }))
    const row = { id: 'r1' }
    adapter.onExpand('r1', row)
    expect(setTreeExpand).toHaveBeenCalledWith(row, true)
  })

  it('onCollapse 调 vxe-table setTreeExpand(row, false)', () => {
    const setTreeExpand = vi.fn()
    const adapter = createVxeTreeAdapter(() => ({ setTreeExpand }))
    const row = { id: 'r1' }
    adapter.onCollapse('r1', row)
    expect(setTreeExpand).toHaveBeenCalledWith(row, false)
  })

  it('row 缺失时不调用 setTreeExpand（退化等待 syncExpanded 全量回灌）', () => {
    const setTreeExpand = vi.fn()
    const adapter = createVxeTreeAdapter(() => ({ setTreeExpand }))
    adapter.onExpand('r1', undefined)
    expect(setTreeExpand).not.toHaveBeenCalled()
  })

  it('vxe-table 实例为 null 时所有操作安全 noop', () => {
    const adapter = createVxeTreeAdapter(() => null)
    expect(() => adapter.onExpand('k1', { id: 'k1' })).not.toThrow()
    expect(() => adapter.onCollapse('k1', { id: 'k1' })).not.toThrow()
    expect(() => adapter.syncExpanded(['k1'], new Map())).not.toThrow()
  })

  it('syncExpanded 按 rowsByKey 逐行调用 setTreeExpand(true)', () => {
    const setTreeExpand = vi.fn()
    const adapter = createVxeTreeAdapter(() => ({ setTreeExpand }))
    const rowsByKey = new Map<string | number, Record<string, unknown>>([
      ['a', { id: 'a' }],
      ['b', { id: 'b' }],
    ])
    adapter.syncExpanded(['a', 'b', 'missing'], rowsByKey)
    expect(setTreeExpand).toHaveBeenCalledTimes(2)
    expect(setTreeExpand).toHaveBeenNthCalledWith(1, { id: 'a' }, true)
    expect(setTreeExpand).toHaveBeenNthCalledWith(2, { id: 'b' }, true)
  })

  it('getExpandedKeys 返回空数组（vxe 引擎侧展开状态由 useTreeData 主导）', () => {
    const adapter = createVxeTreeAdapter(() => null)
    expect(adapter.getExpandedKeys()).toEqual([])
  })

  it('hasChildren 基于 _hasChildren 字段判定（与 el 同源）', () => {
    const adapter = createVxeTreeAdapter(() => null)
    expect(adapter.hasChildren({ _hasChildren: true })).toBe(true)
    expect(adapter.hasChildren({})).toBe(false)
  })
})
