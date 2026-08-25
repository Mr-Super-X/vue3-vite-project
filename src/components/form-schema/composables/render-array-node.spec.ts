/**
 * renderArrayNode / rewriteNamePath 单元测试
 * 覆盖：
 * - 子节点 name 路径前缀化（prefix.sep.name）
 * - 数组/字符串/null/undefined 输入
 * - 嵌套 children / formItem.slots / slots
 * - name 缺失时保持空
 */
import { describe, it, expect } from 'vitest'
import type { SchemaNode } from '../types'
import { rewriteNamePath } from './render-array-node'

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
