import { describe, it, expect } from 'vitest'
import { ArrayBuilder, xArray } from './builders'
import type { SchemaNode } from './types'

describe('xArray(name) / ArrayBuilder', () => {
  it('returns ArrayBuilder instance with name and kind set', () => {
    const node = xArray('items').build()
    expect(node.name).toBe('items')
    expect(node.kind).toBe('array')
  })

  it('.item(s) sets itemSchema (single SchemaNode)', () => {
    const itemSchema: SchemaNode = { component: 'Input', name: 'qty' }
    const node = xArray('items').item(itemSchema).build()
    expect(node.array?.itemSchema).toEqual(itemSchema)
  })

  it('.item(s) accepts an array of SchemaNode as itemSchema', () => {
    const itemSchema: SchemaNode[] = [
      { component: 'Input', name: 'a' },
      { component: 'Input', name: 'b' },
    ]
    const node = xArray('items').item(itemSchema).build()
    expect(node.array?.itemSchema).toEqual(itemSchema)
  })

  it('.initialLength / .minItems / .maxItems all set on array config', () => {
    const node = xArray('items').initialLength(2).minItems(1).maxItems(5).build()
    expect(node.array?.initialLength).toBe(2)
    expect(node.array?.minItems).toBe(1)
    expect(node.array?.maxItems).toBe(5)
  })

  it('.showActions accepts boolean or object', () => {
    expect(xArray('a').showActions(false).build().array?.showActions).toBe(false)
    expect(
      xArray('b').showActions({ add: true, remove: false }).build().array?.showActions
    ).toEqual({
      add: true,
      remove: false,
    })
  })

  it('.labels overrides default button texts', () => {
    const node = xArray('a').labels({ add: '新增', remove: '移除' }).build()
    expect(node.array?.labels).toEqual({ add: '新增', remove: '移除' })
  })

  it('.title sets array container title', () => {
    const node = xArray('a').title('订单明细').build()
    expect(node.array?.title).toBe('订单明细')
  })

  it('.label sets node.label (form field label)', () => {
    const node = xArray('a').label('订单明细').build()
    expect(node.label).toBe('订单明细')
  })

  it('.reaction sets node.reaction for reactive linkage', () => {
    const reaction = { hidden: (m: Record<string, unknown>) => Boolean(m.hide) }
    const node = xArray('a').reaction(reaction).build()
    expect(node.reaction).toBe(reaction)
  })

  it('all setter methods return this for chaining', () => {
    const b = xArray('items')
    expect(b.item({ component: 'Input' })).toBe(b)
    expect(b.initialLength(1)).toBe(b)
    expect(b.minItems(0)).toBe(b)
    expect(b.maxItems(10)).toBe(b)
    expect(b.showActions(true)).toBe(b)
    expect(b.labels({})).toBe(b)
    expect(b.title('t')).toBe(b)
    expect(b.label('l')).toBe(b)
    expect(b.reaction({})).toBe(b)
    expect(b.build()).toBeTypeOf('object')
  })

  it('build() returns SchemaNode with required shape', () => {
    const node = xArray('items')
      .item({ component: 'Input', name: 'sku' })
      .initialLength(3)
      .minItems(1)
      .maxItems(10)
      .title('订单明细')
      .build()
    expect(node.name).toBe('items')
    expect(node.kind).toBe('array')
    expect(node.array).toBeDefined()
    expect(node.array?.itemSchema).toEqual({ component: 'Input', name: 'sku' })
    expect(node.array?.initialLength).toBe(3)
    expect(node.array?.minItems).toBe(1)
    expect(node.array?.maxItems).toBe(10)
    expect(node.array?.title).toBe('订单明细')
  })

  it('ArrayBuilder can be instantiated directly (not via xArray)', () => {
    const b = new ArrayBuilder('foo')
    expect(b.node.name).toBe('foo')
    expect(b.build().kind).toBe('array')
  })

  it('subsequent .item() calls overwrite earlier itemSchema (last wins)', () => {
    const node = xArray('a')
      .item({ component: 'Input', name: 'first' })
      .item({ component: 'Select', name: 'second' })
      .build()
    expect((node.array?.itemSchema as SchemaNode).component).toBe('Select')
  })
})
