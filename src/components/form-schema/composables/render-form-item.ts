/**
 * FormItem 包装渲染（含 name 或 formItem: true 的节点）
 * - 外层包 el-form-item（label + prop + rules + onBlur/onChange 跨字段触发）
 * - 内部渲染 Comp（v-model/on 事件 + 默认 props + node.props + async props + disabled + key）
 * - formItem 节点的 slots 转发给内部 Comp（如 el-upload 的 tip 槽位）
 * - 末尾 wrapWithElCol 应用 col 响应式断点
 */
import { h, type VNode } from 'vue'
import { ElFormItem, ElRow, ElCol } from 'element-plus'
import type { SchemaNode } from '../types'
import { buildVModelBindings } from './build-vmodel-bindings'
import { buildOnBindings } from './build-on-bindings'
import {
  buildSlotFn,
  compileRules,
  getComponentDefaultProps,
  buildAsyncProps,
  renderChildren,
  resolveComponentFor,
  wrapWithElCol,
} from './render-schema-node'
import type { RenderSchemaNodeOptions } from './render-schema-node'

export function renderWithFormItem(
  node: SchemaNode,
  Comp: object | string | null,
  opts: RenderSchemaNodeOptions
): VNode | undefined {
  // 即使 Comp = null（未映射组件），仍渲染 formItem —— 内部 v-if="Comp" 跳过子节点
  // 保证 formItem 的 v-model/rules/onBlur 等 prop 路径不被打断
  const fi = typeof node.formItem === 'object' ? node.formItem : null
  const FormItemComp = fi?.component
    ? typeof fi.component === 'string'
      ? (resolveComponentFor(fi.component, opts.components) ?? ElFormItem)
      : fi.component
    : ElFormItem
  const fiProps = fi?.props ?? {}

  // 跨字段校验在 blur/change 时主动触发
  // 关键：onBlur/onChange handler 必须**同时**手动跑字段内 async-validator 校验
  // 因为覆盖了 el-form-item 内部 emit 的 onBlur 后,el-form 不会自动跑字段内规则
  //
  // 零开销优化：仅当 triggerCrossFieldValidator 存在时才挂 handler
  // ——否则 el-form-item 默认行为已自动跑字段内校验,无需覆盖
  const triggerFn = opts.triggerCrossFieldValidator
  const validateField = opts.validateField

  let onBlur: (() => Promise<void>) | undefined
  let onChange: (() => Promise<void>) | undefined
  if (triggerFn && node.name) {
    // 提取到 const 变量 —— TS narrow 在 async function 边界外不传递,需要显式 const
    const tf: NonNullable<typeof triggerFn> = triggerFn
    const vf = validateField
    const fieldName = node.name
    async function runValidate(trigger: 'blur' | 'change'): Promise<void> {
      // 1. 字段内 async-validator 校验
      if (vf) {
        try {
          await vf(fieldName)
        } catch {
          // silent — 校验失败时错误已写入 form-item
        }
      }
      // 2. 跨字段校验
      await tf(node, trigger)
    }
    onBlur = () => runValidate('blur')
    onChange = () => runValidate('change')
  }

  const eventBindings = {
    ...buildVModelBindings(node, opts.model, opts.beforeChange, opts.onValueChange),
    ...buildOnBindings(node, opts.model),
  }
  const asyncProps = buildAsyncProps(node)

  return h(
    FormItemComp as never,
    {
      label: node.label,
      prop: node.name,
      rules: compileRules(node.rules, opts.rules) as never,
      ...(onBlur ? { onBlur } : {}),
      ...(onChange ? { onChange } : {}),
      ...fiProps,
      ...(node.name || node.key ? { key: `fi-${node.name ?? node.key}` } : {}),
    } as never,
    Comp
      ? {
          default: () => {
            const defaultSlot = () => renderChildren(node.children, opts.render) as never
            const extraSlots: Record<string, (scope?: unknown) => unknown> = {}
            if (node.slots) {
              for (const [k, v] of Object.entries(node.slots)) {
                extraSlots[k] = buildSlotFn(v, opts.render)
              }
            }
            const inner = h(
              Comp as never,
              {
                ...eventBindings,
                ...getComponentDefaultProps(node, opts.componentProps),
                ...node.props,
                ...asyncProps,
                ...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
                ...(node.key !== undefined && { key: node.key }),
              } as never,
              { default: defaultSlot, ...extraSlots }
            )
            return wrapWithElCol(node, inner, opts.currentBreakpoint?.value)
          },
        }
      : undefined
  ) as never
}

/** 纯 row + column 布局（无 formItem 包装） */
export function renderWithRowColumn(node: SchemaNode, opts: RenderSchemaNodeOptions): VNode {
  const colSpan =
    node.col && typeof node.col === 'object'
      ? (node.col.span ?? 24)
      : node.column
        ? Math.floor(24 / node.column)
        : 24
  return h(
    ElRow as never,
    { ...node.row, ...(node.key !== undefined && { key: node.key }) } as never,
    {
      default: () =>
        h(
          ElCol as never,
          {
            span: colSpan,
            ...(node.col && typeof node.col === 'object' && node.col.responsive
              ? { responsive: node.col.responsive }
              : {}),
            ...(node.key !== undefined && { key: node.key }),
          } as never,
          {
            default: () => opts.render(node.children as never),
          }
        ),
    }
  ) as never
}
