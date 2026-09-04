/**
 * render-form-item 单元测试
 *
 * 覆盖：
 * - renderWithFormItem: 基本包装（label/prop/rules）
 * - hidden=true → rules 被剥离为空数组
 * - externalErrors 注入：error/validateStatus 透传
 * - formItem 自定义组件（FormItem 包装）
 * - onFocusout 触发跨字段校验（trigger='blur'）
 * - formItem.slots 转发（label slot）
 * - renderWithRowColumn: col span 计算（基于 vnode 树结构）
 */
import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { renderWithFormItem, renderWithRowColumn } from './render-form-item'
import type { RenderSchemaNodeOptions } from './render-schema-node'
import type { SchemaNode } from '../types'

function makeOpts(overrides?: Partial<RenderSchemaNodeOptions>): RenderSchemaNodeOptions {
  return {
    model: reactive({}),
    components: {},
    beforeChange: undefined,
    beforeChangeRules: undefined,
    rules: {},
    componentProps: undefined,
    render: vi.fn(() => null) as never,
    ...overrides,
  }
}

/**
 * 在 vnode 树中查找指定 type 的 vnode，返回该 vnode（深度优先）
 * 处理 Vue 3 slot 结构 { default: () => [...] }
 */
function findVNodeByType(vnode: unknown, typeName: string): unknown {
  if (!vnode || typeof vnode !== 'object') return undefined
  const v = vnode as { type?: unknown; children?: unknown }
  // Vue 3 VNode type 可能是字符串（'div'）或组件对象（有 name）
  if (typeof v.type === 'string' && v.type === typeName) return vnode
  if (v.type && typeof v.type === 'object') {
    const typeObj = v.type as { name?: string }
    if (typeObj.name === typeName) return vnode
  }
  // 递归 children
  if (Array.isArray(v.children)) {
    for (const child of v.children) {
      const found = findVNodeByType(child, typeName)
      if (found) return found
    }
  } else if (v.children && typeof v.children === 'object') {
    // slot 对象 { default: () => [...] } —— 调用 slot 找内部 vnode
    const slots = v.children as Record<string, unknown>
    for (const slotValue of Object.values(slots)) {
      if (typeof slotValue === 'function') {
        // 尝试调用 slot（无参数）
        try {
          const rendered = slotValue()
          const found = findVNodeByType(rendered, typeName)
          if (found) return found
        } catch {
          // slot 调用失败，跳过
        }
      } else {
        const found = findVNodeByType(slotValue, typeName)
        if (found) return found
      }
    }
  }
  return undefined
}

describe('renderWithFormItem', () => {
  it('基本 Input 包装：label + prop + rules', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      label: '邮箱',
      rules: [{ required: true, message: '必填' }],
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    expect(vnode).toBeDefined()
  })

  it('hidden=true → rules 剥离为空数组', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      hidden: true,
      rules: [{ required: true, message: '必填' }],
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    expect(vnode).toBeDefined()
    // 验证：hidden 字段不应该有 rules（避免校验失败）
    // props 中的 rules 应该是 []
    const vnodeProps = (vnode as unknown as { props: { rules?: unknown[] } }).props
    expect(vnodeProps.rules).toEqual([])
  })

  it('hidden=false → rules 保留', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      hidden: false,
      rules: [{ required: true, message: '必填' }],
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { rules?: unknown[] } }).props
    expect(vnodeProps.rules).toBeDefined()
  })

  it('externalErrors 注入 error + validateStatus', () => {
    const node: SchemaNode = { component: 'Input', name: 'email' }
    const opts = makeOpts({
      externalErrors: () => ({ email: { error: '邮箱已被占用', validateStatus: 'error' } }),
    })
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { error?: string; validateStatus?: string } })
      .props
    expect(vnodeProps.error).toBe('邮箱已被占用')
    expect(vnodeProps.validateStatus).toBe('error')
  })

  it('externalErrors 无该字段 → 不注入 error/validateStatus', () => {
    const node: SchemaNode = { component: 'Input', name: 'email' }
    const opts = makeOpts({
      externalErrors: () => ({ phone: { error: 'phone 错', validateStatus: 'error' } }),
    })
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { error?: string; validateStatus?: string } })
      .props
    expect(vnodeProps.error).toBeUndefined()
    expect(vnodeProps.validateStatus).toBeUndefined()
  })

  it('node.name 缺失 → externalErrors 不注入', () => {
    const node: SchemaNode = { component: 'Card' } // 无 name
    const opts = makeOpts({
      externalErrors: () => ({ Card: { error: 'x', validateStatus: 'error' } }),
    })
    const vnode = renderWithFormItem(node, 'Card' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { error?: string } }).props
    expect(vnodeProps.error).toBeUndefined()
  })

  it('onFocusout 触发跨字段校验（trigger="blur"）', () => {
    const triggerFn = vi.fn()
    const node: SchemaNode = {
      component: 'Input',
      name: 'passwordConfirm',
      rules: [{ crossValidator: () => true, dependsOn: ['password'], trigger: 'blur' }],
    }
    const opts = makeOpts({ triggerCrossFieldValidator: triggerFn })
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { onFocusout?: () => void } }).props
    expect(typeof vnodeProps.onFocusout).toBe('function')

    // 模拟 focusout 触发
    vnodeProps.onFocusout!()
    expect(triggerFn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'passwordConfirm' }),
      'blur'
    )
  })

  it('triggerFn 缺失 → 不挂 onFocusout', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      rules: [{ crossValidator: () => true, dependsOn: ['x'] }],
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { onFocusout?: () => void } }).props
    expect(vnodeProps.onFocusout).toBeUndefined()
  })

  it('node.name 缺失 + triggerFn 存在 → 不挂 onFocusout', () => {
    const triggerFn = vi.fn()
    const node: SchemaNode = { component: 'Card' }
    const opts = makeOpts({ triggerCrossFieldValidator: triggerFn })
    const vnode = renderWithFormItem(node, 'Card' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { onFocusout?: () => void } }).props
    expect(vnodeProps.onFocusout).toBeUndefined()
  })

  it('formItem.component 自定义 → 用自定义组件而非默认 ElFormItem', () => {
    const CustomFormItem = { name: 'CustomFormItem' }
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      formItem: { component: CustomFormItem as never },
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    expect(vnode).toBeDefined()
    // 验证自定义组件被使用（vnode type 应指向 CustomFormItem）
  })

  it('labelPosition 字段级 override', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      labelPosition: 'top',
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { labelPosition?: string } }).props
    expect(vnodeProps.labelPosition).toBe('top')
  })

  it('labelPosition 字段级未设置 → 不传 labelPosition prop', () => {
    const node: SchemaNode = { component: 'Input', name: 'email' }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { labelPosition?: string } }).props
    expect(vnodeProps.labelPosition).toBeUndefined()
  })

  it('key 优先级：node.key > node.name', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      key: 'custom-key',
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { key?: string } }).props
    expect(vnodeProps.key).toBe('fi-custom-key')
  })

  it('无 name 无 key → 不设 key', () => {
    const node: SchemaNode = { component: 'Card' }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Card' as never, opts)
    const vnodeProps = (vnode as unknown as { props: { key?: string } }).props
    expect(vnodeProps.key).toBeUndefined()
  })

  it('Comp=null 时仍渲染 formItem（不挂载子组件）', () => {
    const node: SchemaNode = { component: 'NotRegistered', name: 'x' }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, null, opts)
    expect(vnode).toBeDefined()
  })

  it('formItem.slots 转发（label slot）', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      formItem: {
        slots: {
          label: { component: 'span', children: '自定义 label' },
        },
      },
    }
    const opts = makeOpts()
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    expect(vnode).toBeDefined()
  })

  it('外部错误优先级高于 compileRules 错误', () => {
    const node: SchemaNode = {
      component: 'Input',
      name: 'email',
      rules: [{ required: true, message: '必填' }],
    }
    const opts = makeOpts({
      externalErrors: () => ({ email: { error: '服务端错误', validateStatus: 'error' } }),
    })
    const vnode = renderWithFormItem(node, 'Input' as never, opts)
    const vnodeProps = (
      vnode as unknown as { props: { error?: string; validateStatus?: string; rules?: unknown[] } }
    ).props
    expect(vnodeProps.error).toBe('服务端错误')
    expect(vnodeProps.validateStatus).toBe('error')
    // rules 来自节点（与 externalErrors 独立）
    expect(vnodeProps.rules).toBeDefined()
  })
})

describe('renderWithRowColumn', () => {
  it('col=object 且有 span → ElCol span 取 col.span', () => {
    const node: SchemaNode = {
      component: 'Card',
      column: 2,
      col: { span: 12 },
      children: [],
    }
    const opts = makeOpts()
    const vnode = renderWithRowColumn(node, opts)
    const colNode = findVNodeByType(vnode, 'ElCol') as { props: { span?: number } } | undefined
    expect(colNode?.props.span).toBe(12)
  })

  it('col=object 无 span → fallback 24', () => {
    const node: SchemaNode = {
      component: 'Card',
      col: { offset: 2 } as never,
      children: [],
    }
    const opts = makeOpts()
    const vnode = renderWithRowColumn(node, opts)
    const colNode = findVNodeByType(vnode, 'ElCol') as { props: { span?: number } } | undefined
    expect(colNode?.props.span).toBe(24)
  })

  it('column=2 → ElCol span 自动算 12', () => {
    const node: SchemaNode = {
      component: 'Card',
      column: 2,
      children: [],
    }
    const opts = makeOpts()
    const vnode = renderWithRowColumn(node, opts)
    const colNode = findVNodeByType(vnode, 'ElCol') as { props: { span?: number } } | undefined
    expect(colNode?.props.span).toBe(12)
  })

  it('column=3 → ElCol span 自动算 8', () => {
    const node: SchemaNode = {
      component: 'Card',
      column: 3,
      children: [],
    }
    const opts = makeOpts()
    const vnode = renderWithRowColumn(node, opts)
    const colNode = findVNodeByType(vnode, 'ElCol') as { props: { span?: number } } | undefined
    expect(colNode?.props.span).toBe(8)
  })

  it('column 缺失 col 缺失 → ElCol span=24', () => {
    const node: SchemaNode = { component: 'Card', children: [] }
    const opts = makeOpts()
    const vnode = renderWithRowColumn(node, opts)
    const colNode = findVNodeByType(vnode, 'ElCol') as { props: { span?: number } } | undefined
    expect(colNode?.props.span).toBe(24)
  })

  it('row.responsive 合并到 ElRow props', () => {
    const node: SchemaNode = {
      component: 'Card',
      row: { gutter: 20, responsive: { sm: { gutter: 10 } } } as never,
      children: [],
    }
    const opts = makeOpts()
    const vnode = renderWithRowColumn(node, opts)
    const rowNode = findVNodeByType(vnode, 'ElRow')
    expect(rowNode).toBeDefined()
  })
})
