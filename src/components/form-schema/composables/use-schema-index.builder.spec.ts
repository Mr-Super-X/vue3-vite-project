/**
 * useSchemaIndex.builder 单元测试
 *
 * 覆盖：
 * - buildIndex: 基本 schema → byName + fieldNames + allNames
 * - buildIndex: ignore 字段排除（fieldNames 不含，allNames 含）
 * - buildIndex: cross rules 提取（含 deps + trigger）
 * - buildIndex: trigger='manual' 不进 reverseIndex
 * - buildIndex: array.itemSchema 递归
 * - buildIndex: formItem.slots 递归
 * - buildIndex: name 缺失时 fallback 到 key
 * - buildIndex: dependsOnMap 合并（同 target 多 rule 合并 deps 去重）
 */
import { describe, expect, it } from 'vitest'
import { buildIndex } from './use-schema-index.builder'
import type { SchemaNode } from '../types'

describe('buildIndex / 基本', () => {
  it('空 schema → 空索引', () => {
    const idx = buildIndex(undefined)
    expect(idx.byName.size).toBe(0)
    expect(idx.fieldNames).toEqual([])
    expect(idx.allNames).toEqual([])
  })

  it('单节点 schema → byName + fieldNames 含 name', () => {
    const schema: SchemaNode = { component: 'Input', name: 'email' }
    const idx = buildIndex(schema)
    expect(idx.byName.get('email')).toBe(schema)
    expect(idx.fieldNames).toEqual(['email'])
    expect(idx.allNames).toEqual(['email'])
  })

  it('数组 schema → 全部入索引', () => {
    const schema: SchemaNode[] = [
      { component: 'Input', name: 'a' },
      { component: 'Input', name: 'b' },
    ]
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toEqual(['a', 'b'])
  })

  it('字符串 children 节点 → 跳过（不报错）', () => {
    const schema: SchemaNode = { component: 'Card', children: '文本内容' }
    const idx = buildIndex(schema)
    expect(idx.byName.size).toBe(0)
  })

  it('name 缺失 → fallback 到 key（string 化）', () => {
    const schema: SchemaNode = { component: 'Input', key: 'fieldA' }
    const idx = buildIndex(schema)
    expect(idx.byName.has('fieldA')).toBe(true)
    expect(idx.fieldNames).toEqual(['fieldA'])
  })

  it('name 和 key 都缺失 → 不入索引', () => {
    const schema: SchemaNode = { component: 'Input' }
    const idx = buildIndex(schema)
    expect(idx.byName.size).toBe(0)
  })
})

describe('buildIndex / ignore 字段', () => {
  it('ignore=true → fieldNames 不含，allNames 含', () => {
    const schema: SchemaNode[] = [
      { component: 'Input', name: 'a' },
      { component: 'Input', name: 'b', ignore: true },
    ]
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toEqual(['a'])
    expect(idx.allNames).toEqual(['a', 'b'])
  })

  it('同名节点（一个 ignore 一个不 ignore）→ fieldNames 含一次', () => {
    const schema: SchemaNode[] = [
      { component: 'Input', name: 'dup', ignore: true },
      { component: 'Input', name: 'dup' },
    ]
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toEqual(['dup'])
    expect(idx.allNames).toEqual(['dup', 'dup'])
  })
})

describe('buildIndex / cross rules', () => {
  it('crossValidator + dependsOn → crossRules + dependsOnMap + reverseIndex 都填充', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'passwordConfirm',
      rules: [
        {
          crossValidator: () => true,
          dependsOn: ['password'],
          trigger: 'blur',
        },
      ],
    }
    const idx = buildIndex(schema)
    expect(idx.crossRules.get('passwordConfirm')).toHaveLength(1)
    expect(idx.crossRules.get('passwordConfirm')?.[0]?.deps).toEqual(['password'])
    expect(idx.dependsOnMap.get('passwordConfirm')).toEqual(['password'])
    expect(idx.reverseIndex.get('password')).toEqual(['passwordConfirm'])
  })

  it('trigger="manual" → 不进 reverseIndex（仅 validateForm 跑）', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'manualField',
      rules: [{ crossValidator: () => true, dependsOn: ['x'], trigger: 'manual' }],
    }
    const idx = buildIndex(schema)
    expect(idx.crossRules.get('manualField')).toHaveLength(1)
    expect(idx.reverseIndex.has('x')).toBe(false)
  })

  it('dependsOn 是字符串（非数组）→ 包成单元素数组', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'target',
      rules: [{ crossValidator: () => true, dependsOn: 'single' as never }],
    }
    const idx = buildIndex(schema)
    expect(idx.crossRules.get('target')?.[0]?.deps).toEqual(['single'])
  })

  it('dependsOn 空数组 → 该 rule 跳过（不写 crossRules）', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'target',
      rules: [{ crossValidator: () => true, dependsOn: [] }],
    }
    const idx = buildIndex(schema)
    expect(idx.crossRules.has('target')).toBe(false)
  })

  it('同一 target 多条 cross rule → deps 合并去重', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'target',
      rules: [
        { crossValidator: () => true, dependsOn: ['a', 'b'], trigger: 'blur' },
        { crossValidator: () => true, dependsOn: ['b', 'c'], trigger: 'change' },
      ],
    }
    const idx = buildIndex(schema)
    expect(idx.dependsOnMap.get('target')).toEqual(['a', 'b', 'c'])
    expect(idx.reverseIndex.get('a')).toEqual(['target'])
    expect(idx.reverseIndex.get('b')).toEqual(['target'])
    expect(idx.reverseIndex.get('c')).toEqual(['target'])
  })

  it('crossValidator 缺失或 dependsOn 缺失 → 该 rule 跳过', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'target',
      rules: [
        { trigger: 'blur' } as never, // 缺 crossValidator + dependsOn
        { crossValidator: () => true } as never, // 缺 dependsOn
        { dependsOn: ['x'] } as never, // 缺 crossValidator
      ],
    }
    const idx = buildIndex(schema)
    expect(idx.crossRules.has('target')).toBe(false)
  })
})

describe('buildIndex / 递归覆盖', () => {
  it('递归 children', () => {
    const schema: SchemaNode = {
      component: 'Card',
      children: [
        { component: 'Input', name: 'inner' },
        { component: 'Input', name: 'deep', children: { component: 'Input', name: 'deepest' } },
      ],
    }
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toContain('inner')
    expect(idx.fieldNames).toContain('deep')
    expect(idx.fieldNames).toContain('deepest')
  })

  it('递归 array.itemSchema', () => {
    const schema: SchemaNode = {
      component: 'div',
      kind: 'array',
      name: 'items',
      array: {
        itemSchema: { component: 'Input', name: 'qty' },
      },
    }
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toContain('items')
    expect(idx.fieldNames).toContain('qty')
  })

  it('递归 formItem.slots（SchemaNode 形态）', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'email',
      formItem: {
        slots: {
          label: { component: 'span', name: 'customLabel' },
        },
      },
    }
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toContain('email')
    expect(idx.fieldNames).toContain('customLabel')
  })

  it('递归 formItem.slots（SchemaNode[] 形态）', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'email',
      formItem: {
        slots: {
          label: [
            { component: 'span', name: 'a' },
            { component: 'span', name: 'b' },
          ],
        },
      },
    }
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toContain('a')
    expect(idx.fieldNames).toContain('b')
  })

  it('formItem.slots 含字符串 / 函数 → 不递归（启发式排除）', () => {
    const schema: SchemaNode = {
      component: 'Input',
      name: 'email',
      formItem: {
        slots: {
          label: '纯文本 label',
          error: () => 'error slot' as never,
        },
      },
    }
    expect(() => buildIndex(schema)).not.toThrow()
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toEqual(['email'])
  })
})

describe('buildIndex / DFS 顺序', () => {
  it('fieldNames 按 DFS 顺序（先父后子）', () => {
    const schema: SchemaNode = {
      component: 'Form',
      name: 'parent',
      children: [
        { component: 'Input', name: 'child1' },
        { component: 'Input', name: 'child2' },
      ],
    }
    const idx = buildIndex(schema)
    expect(idx.fieldNames).toEqual(['parent', 'child1', 'child2'])
  })
})
