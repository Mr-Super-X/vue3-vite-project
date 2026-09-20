/**
 * TreeAdapter 单元测试（v3.5 PR1-B Task 1）—— 验证 TreeAdapter 接口契约与 elementPlusTreeAdapter 实现。
 *
 * vxeTreeAdapter 适配器在 Task 2 追加。
 *
 * @group ProTable adapters 测试
 */
import { describe, it, expect } from 'vitest'
import { createElementPlusTreeAdapter, type TreeAdapter } from './tree-adapter'

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
