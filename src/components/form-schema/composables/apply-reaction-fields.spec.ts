import { describe, it, expect } from 'vitest'
import type { SchemaNode } from '../types'
import { applyReactionFields } from './apply-reaction-fields'

describe('applyReactionFields(node, reaction, model)', () => {
  it('字面量直接写入 node[key]', () => {
    const node: SchemaNode = {} as SchemaNode
    applyReactionFields(node, { label: '新标签' }, {})
    expect(node.label).toBe('新标签')
  })

  it('字符串函数表达式求值后写入 node[key]', () => {
    const node: SchemaNode = {} as SchemaNode
    applyReactionFields(node, { label: '{{ (m) => m.x ? "A" : "B" }}' }, { x: true })
    expect(node.label).toBe('A')
  })

  it('函数 reaction 求值后写入 node[key](P0 label 用法兼容)', () => {
    const node: SchemaNode = {} as SchemaNode
    applyReactionFields(
      node,
      { label: (m: Record<string, unknown>) => ((m.x as number) > 0 ? 'positive' : 'zero') },
      { x: 5 }
    )
    expect(node.label).toBe('positive')
  })

  it('元字段 strategy / delay 不写入 node(避免序列化时带元数据)', () => {
    const node: SchemaNode = {} as SchemaNode
    applyReactionFields(
      node,
      {
        strategy: 'debounce',
        delay: 300,
        label: '实际字段',
      },
      {}
    )
    expect(node.label).toBe('实际字段')
    // 元字段不应写入 node —— schema JSON 序列化时不应带元数据
    expect((node as Record<string, unknown>).strategy).toBeUndefined()
    expect((node as Record<string, unknown>).delay).toBeUndefined()
  })

  it('函数 reaction 副作用:写 model + 返回值赋给 node[key]', () => {
    const node: SchemaNode = {} as SchemaNode
    const m: Record<string, unknown> = { count: 0 }
    applyReactionFields(
      node,
      {
        searchResults: (model: Record<string, unknown>) => {
          // 副作用:写 model
          model.searchResults = ['Apple', 'Banana']
          // 返回值也会赋给 node.searchResults(冗余但保持兼容)
          return model.searchResults
        },
      },
      m
    )
    // 函数副作用生效
    expect(m.searchResults).toEqual(['Apple', 'Banana'])
    // 返回值也赋给 node(保持 P0 兼容)
    expect((node as Record<string, unknown>).searchResults).toEqual(['Apple', 'Banana'])
  })
})
