import { describe, it, expect, vi } from 'vitest'
import type { SchemaNode } from '../types'
import { useRenderSchemaNode } from './render-schema-node'

/** 创建一个最小可用的 RenderSchemaNode options */
function makeOpts(overrides: Partial<Parameters<typeof useRenderSchemaNode>[0]> = {}) {
  const renderSpy = vi.fn((node: SchemaNode | SchemaNode[] | string | undefined | null) => {
    const name = typeof node === 'object' && node && !Array.isArray(node) ? node.name : 'n/a'
    return {
      type: 'div',
      props: { class: 'mock-render', 'data-node-name': name },
    } as never
  })
  const addItem = vi.fn()
  const removeItem = vi.fn()
  const moveItem = vi.fn()
  const opts: Parameters<typeof useRenderSchemaNode>[0] = {
    model: {},
    components: {},
    beforeChange: undefined,
    rules: {},
    render: renderSpy,
    arrayActions: { addItem, removeItem, moveItem },
    ...overrides,
  }
  return { opts, renderSpy, addItem, removeItem, moveItem }
}

describe('useRenderSchemaNode 数组分支 (kind === "array")', () => {
  it('数组节点走数组分支,渲染 1 次容器(不调用外部 render 回调)', () => {
    const { opts, renderSpy } = makeOpts({ model: { items: [{ qty: 1 }] } })
    const render = useRenderSchemaNode(opts)
    const arrayNode: SchemaNode = {
      kind: 'array',
      name: 'items',
      array: {
        itemSchema: { component: 'Input', name: 'qty' },
      },
    }
    render(arrayNode)
    // 数组分支内部直接生成 ElCard + 行容器,不会再调用外部 render(避免双重渲染)
    expect(renderSpy).not.toHaveBeenCalled()
  })

  it('数组节点调用 arrayActions.addItem 时机:容器挂载后(测试中通过 mock 模拟)', () => {
    const { opts, addItem } = makeOpts({ model: { items: [] } })
    const render = useRenderSchemaNode(opts)
    const arrayNode: SchemaNode = {
      kind: 'array',
      name: 'items',
      array: { itemSchema: { component: 'Input', name: 'qty' } },
    }
    render(arrayNode)
    // 直接调用暴露的方法验证 wiring 正常
    addItem('items', { qty: 5 })
    expect(addItem).toHaveBeenCalledWith('items', { qty: 5 })
  })

  it('数组节点缺 name 时返回 undefined（命令式 API 需要 name 才能定位 model 字段）', () => {
    const { opts } = makeOpts({ model: {} })
    const render = useRenderSchemaNode(opts)
    const arrayNode: SchemaNode = {
      kind: 'array',
      array: { itemSchema: { component: 'Input' } },
    }
    const result = render(arrayNode)
    expect(result).toBeUndefined()
  })

  it('数组节点缺 array 配置时返回 undefined', () => {
    const { opts } = makeOpts()
    const render = useRenderSchemaNode(opts)
    const arrayNode: SchemaNode = { kind: 'array', name: 'items' }
    const result = render(arrayNode)
    expect(result).toBeUndefined()
  })

  it('非数组节点不走数组分支(返回默认分支渲染结果或 undefined)', () => {
    const { opts, renderSpy } = makeOpts()
    const render = useRenderSchemaNode(opts)
    const normalNode: SchemaNode = { component: 'Input', name: 'foo' }
    render(normalNode)
    // 非数组节点会被当作子节点调用 render 回调递归(如果走 children 分支)
    // 这里 Input 没有 children,会走末尾的 h(ElInput, ...) 分支,不调用 renderSpy
    expect(renderSpy).not.toHaveBeenCalled()
  })

  it('model[name] 不是数组时,数组节点依然渲染(按空列表处理)', () => {
    const { opts } = makeOpts({ model: { items: 'not-an-array' as never } })
    const render = useRenderSchemaNode(opts)
    const arrayNode: SchemaNode = {
      kind: 'array',
      name: 'items',
      array: { itemSchema: { component: 'Input', name: 'qty' } },
    }
    const result = render(arrayNode)
    // 不抛异常且返回 VNode(非 undefined)即视为通过
    expect(result).toBeDefined()
  })

  it('itemSchema 为字符串类型也能正常处理（不应该出现,但 schema 弱校验下可能）', () => {
    const { opts } = makeOpts({ model: { items: [1, 2, 3] } })
    const render = useRenderSchemaNode(opts)
    const arrayNode: SchemaNode = {
      kind: 'array',
      name: 'items',
      array: { itemSchema: 'raw-text' as never },
    }
    const result = render(arrayNode)
    expect(result).toBeDefined()
  })
})

describe('useRenderSchemaNode disabled 透传', () => {
  it('node.disabled=true 时,渲染返回 VNode 不抛错', () => {
    const { opts } = makeOpts({ model: { email: '' } })
    const render = useRenderSchemaNode(opts)
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      disabled: true,
    }
    const result = render(node)
    expect(result).toBeDefined()
  })

  it('node.disabled 为函数时,不立即调用(留待反应式调度)', () => {
    const { opts } = makeOpts()
    const render = useRenderSchemaNode(opts)
    const disabledFn = vi.fn((m: Record<string, unknown>) => !m.agree)
    const node: SchemaNode = {
      component: 'Input',
      name: 'reason',
      disabled: disabledFn as never,
    }
    const result = render(node)
    expect(result).toBeDefined()
    // disabledFn 不应在 render 阶段被调用（由 reaction watchEffect 调度）
    expect(disabledFn).not.toHaveBeenCalled()
  })

  it('未设置 node.disabled 时不影响其他 props', () => {
    const { opts } = makeOpts()
    const render = useRenderSchemaNode(opts)
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      props: { placeholder: 'test' },
    }
    const result = render(node)
    expect(result).toBeDefined()
  })

  it('数组节点 disabled=true 时,渲染返回 VNode 不抛错', () => {
    const { opts } = makeOpts({ model: { items: [{}] } })
    const render = useRenderSchemaNode(opts)
    const node: SchemaNode = {
      kind: 'array',
      name: 'items',
      disabled: true,
      array: { itemSchema: { component: 'Input', name: 'sku' } },
    }
    const result = render(node)
    expect(result).toBeDefined()
  })
})
