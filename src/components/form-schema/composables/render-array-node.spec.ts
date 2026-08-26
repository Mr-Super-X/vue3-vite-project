/**
 * renderArrayNode / rewriteNamePath 单元测试
 * 覆盖：
 * - 子节点 name 路径前缀化（prefix.sep.name）
 * - 数组/字符串/null/undefined 输入
 * - 嵌套 children / formItem.slots / slots
 * - name 缺失时保持空
 */
import { describe, it, expect } from 'vitest'
import { h, type VNode } from 'vue'
import type { SchemaNode } from '../types'
import { rewriteNamePath, renderArrayNode } from './render-array-node'

describe('rewriteNamePath / 基本', () => {
  it('单节点 name 前缀化', () => {
    const input: SchemaNode = { name: 'qty', component: 'Input' }
    const out = rewriteNamePath(input, 'items[0]', '.') as SchemaNode
    expect(out.name).toBe('items[0].qty')
    // 不修改原对象
    expect(input.name).toBe('qty')
  })

  it('自定义 sep 字符', () => {
    const input: SchemaNode = { name: 'qty', component: 'Input' }
    const out = rewriteNamePath(input, 'items[0]', '_') as SchemaNode
    expect(out.name).toBe('items[0]_qty')
  })

  it('name 缺失 → 保持空', () => {
    const input: SchemaNode = { component: 'Input' }
    const out = rewriteNamePath(input, 'items[0]', '.') as SchemaNode
    expect(out.name).toBeUndefined()
  })

  it('null / undefined → 原样返回', () => {
    expect(rewriteNamePath(undefined, 'p', '.')).toBeUndefined()
    // 源码类型签名不允许 null，但运行时支持 —— 显式断言
    expect(rewriteNamePath(null as never, 'p', '.')).toBeNull()
  })

  it('string 节点 → 原样返回', () => {
    expect(rewriteNamePath('hello', 'p', '.')).toBe('hello')
  })
})

describe('rewriteNamePath / 数组', () => {
  it('数组每个元素 name 都被前缀化', () => {
    const input: SchemaNode[] = [
      { name: 'a', component: 'Input' },
      { name: 'b', component: 'Input' },
    ]
    const out = rewriteNamePath(input, 'items[0]', '.') as SchemaNode[]
    expect(out).toHaveLength(2)
    expect(out[0]?.name).toBe('items[0].a')
    expect(out[1]?.name).toBe('items[0].b')
  })

  it('空数组 → 空数组', () => {
    const out = rewriteNamePath([], 'p', '.')
    expect(out).toEqual([])
  })
})

describe('rewriteNamePath / 嵌套 children', () => {
  it('嵌套 children 也会被递归前缀化', () => {
    const input: SchemaNode = {
      name: 'group',
      component: 'Card',
      children: [
        { name: 'inner', component: 'Input' },
        {
          name: 'nested',
          component: 'Input',
          children: [{ name: 'deep', component: 'Input' }],
        },
      ],
    }
    const out = rewriteNamePath(input, 'items[0]', '.') as SchemaNode
    const children = out.children as SchemaNode[]
    expect(children[0]?.name).toBe('items[0].inner')
    expect((children[1]?.children as SchemaNode[])[0]?.name).toBe('items[0].deep')
  })

  it('formItem.slots 也会被递归', () => {
    const input: SchemaNode = {
      name: 'root',
      formItem: {
        slots: {
          default: {
            name: 'inSlot',
            component: 'Input',
          },
        },
      },
    }
    const out = rewriteNamePath(input, 'items[0]', '.') as SchemaNode
    const slot = (out.formItem as { slots: { default: SchemaNode } }).slots.default
    expect(slot.name).toBe('items[0].inSlot')
  })
})

describe('rewriteNamePath / 属性保持', () => {
  it('保留其他属性（component、rules 等）', () => {
    const input: SchemaNode = {
      name: 'qty',
      component: 'Input',
      rules: [{ required: true, message: 'err' }],
    }
    const out = rewriteNamePath(input, 'items[0]', '.') as SchemaNode
    expect(out.component).toBe('Input')
    expect(out.rules).toEqual([{ required: true, message: 'err' }])
  })

  it('不修改原节点对象（深拷贝）', () => {
    const input: SchemaNode = { name: 'qty', component: 'Input' }
    const out = rewriteNamePath(input, 'items[0]', '.') as SchemaNode
    expect(input.name).toBe('qty')
    expect(out).not.toBe(input)
  })
})

describe('renderArrayNode / 行 key 稳定性（H8 回归）', () => {
  function makeOpts(model: Record<string, unknown>) {
    return {
      model,
      render: () => h('div'),
      arrayActions: {
        addItem: () => {},
        removeItem: () => {},
        moveItem: () => {},
      },
    } as never
  }

  function collectKeys(vnode: VNode | undefined, prefix: string): unknown[] {
    // 结构无关的遍历：native 元素与组件的 children 规范化形态不同（数组 / slot 对象），
    // 递归收集所有指定前缀的 key，避免依赖具体嵌套层级
    const keys: unknown[] = []
    const walk = (v: unknown): void => {
      if (!v || typeof v !== 'object') return
      if (Array.isArray(v)) {
        v.forEach(walk)
        return
      }
      const o = v as VNode
      if (typeof o.key === 'string' && o.key.startsWith(prefix)) keys.push(o.key)
      const ch = (o as unknown as Record<string, unknown>).children
      if (Array.isArray(ch)) ch.forEach(walk)
      else if (ch && typeof ch === 'object') {
        for (const slot of Object.values(ch)) {
          walk(typeof slot === 'function' ? (slot as () => unknown)() : slot)
        }
      }
    }
    walk(vnode)
    return keys
  }

  const rowKeys = (v: VNode | undefined): unknown[] => collectKeys(v, 'array-items-')

  const makeNode = (): SchemaNode =>
    ({
      name: 'items',
      kind: 'array',
      array: { itemSchema: { name: 'qty', component: 'Input' } },
    }) as SchemaNode

  it('删除首行后剩余行保持原 key（按行对象身份而非 index）', () => {
    const rowA = { qty: 1 }
    const rowB = { qty: 2 }
    const rowC = { qty: 3 }
    const model: Record<string, unknown> = { items: [rowA, rowB, rowC] }
    const before = rowKeys(renderArrayNode(makeNode(), makeOpts(model)))
    expect(before).toHaveLength(3)
    // 删除首行：rowB/rowC 的 index 从 1,2 变为 0,1 —— index key 会全部重挂载，对象身份 key 不变
    ;(model.items as unknown[]).splice(0, 1)
    const after = rowKeys(renderArrayNode(makeNode(), makeOpts(model)))
    expect(after).toEqual([before[1], before[2]])
  })

  it('移动行后 key 随行对象走（不随位置走）', () => {
    const rowA = { qty: 1 }
    const rowB = { qty: 2 }
    const model: Record<string, unknown> = { items: [rowA, rowB] }
    const before = rowKeys(renderArrayNode(makeNode(), makeOpts(model)))
    ;(model.items as unknown[]).reverse()
    const after = rowKeys(renderArrayNode(makeNode(), makeOpts(model)))
    expect(after).toEqual([before[1], before[0]])
  })

  it('删除首行后行内节点获得身份派生 key（keyPrefix 注入 itemSchema 子树）', () => {
    // renderArrayNode 的 render 回调收到的节点：name 是位置路径，key 是行身份路径
    const rowA = { qty: 1 }
    const rowB = { qty: 2 }
    const model: Record<string, unknown> = { items: [rowA, rowB] }
    const seen: Array<{ name: string | undefined; key: string | number | undefined }> = []
    const opts = {
      model,
      render: (n: SchemaNode) => {
        seen.push({ name: n.name, key: n.key })
        return h('div')
      },
      arrayActions: { addItem: () => {}, removeItem: () => {}, moveItem: () => {} },
    } as never
    // 行渲染在 slot 函数里是惰性的，先走一遍 key 收集强制求值
    rowKeys(renderArrayNode(makeNode(), opts))
    expect(seen[0]).toEqual({
      name: 'items[0].qty',
      key: expect.stringMatching(/^items#r\d+\.qty$/),
    })
    expect(seen[1]).toEqual({
      name: 'items[1].qty',
      key: expect.stringMatching(/^items#r\d+\.qty$/),
    })
    expect(seen[0]!.key).not.toBe(seen[1]!.key)
  })

  it('rewriteNamePath 的 keyPrefix 派生稳定 key，用户显式 key 优先', () => {
    const input: SchemaNode = {
      name: 'qty',
      component: 'Input',
      children: [{ name: 'sub', component: 'Input', key: 'user-key' } as SchemaNode],
    }
    const out = rewriteNamePath(input, 'items[0]', '.', 'items#r9') as SchemaNode
    expect(out.name).toBe('items[0].qty')
    expect(out.key).toBe('items#r9.qty')
    const child = (out.children as SchemaNode[])[0]!
    expect(child.name).toBe('items[0].sub')
    expect(child.key).toBe('user-key') // 用户显式 key 不被覆盖
  })

  it('rewriteNamePath 不传 keyPrefix 时不设置 key（向后兼容）', () => {
    const out = rewriteNamePath({ name: 'qty', component: 'Input' }, 'items[0]', '.') as SchemaNode
    expect(out.name).toBe('items[0].qty')
    expect(out.key).toBeUndefined()
  })
})
