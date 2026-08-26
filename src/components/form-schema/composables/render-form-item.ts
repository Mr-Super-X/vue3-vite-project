/**
 * FormItem 包装渲染（含 name 或 formItem: true 的节点）
 * - 外层包 el-form-item（label + prop + rules + onFocusout/onChange 跨字段触发）
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
  mergeRowResponsive,
} from './render-schema-node'
import type { RenderSchemaNodeOptions } from './render-schema-node'

export function renderWithFormItem(
  node: SchemaNode,
  Comp: object | string | null,
  opts: RenderSchemaNodeOptions
): VNode | undefined {
  // 即使 Comp = null（未映射组件），仍渲染 formItem —— 内部 v-if="Comp" 跳过子节点
  // 保证 formItem 的 v-model/rules/onFocusout 等 prop 路径不被打断
  const fi = typeof node.formItem === 'object' ? node.formItem : null
  const FormItemComp = fi?.component
    ? typeof fi.component === 'string'
      ? (resolveComponentFor(fi.component, opts.components) ?? ElFormItem)
      : fi.component
    : ElFormItem
  const fiProps = fi?.props ?? {}

  // 跨字段校验在 blur/change 时主动触发
  // 字段内 async-validator 规则（required 等）由 el-form-item 内部 addValidateEvents 自动处理；
  // 这里只额外触发 crossValidator，避免手动 validateField 与内部 validate 产生状态竞争覆盖。
  const triggerFn = opts.triggerCrossFieldValidator

  let onFocusout: (() => Promise<void>) | undefined
  let onChange: (() => Promise<void>) | undefined
  if (triggerFn && node.name) {
    const tf: NonNullable<typeof triggerFn> = triggerFn
    const fieldName = node.name
    async function runCrossValidator(trigger: 'blur' | 'change'): Promise<void> {
      await tf({ ...node, name: fieldName }, trigger)
    }
    // 监听器挂在 ElFormItem 根 div 上，而原生 blur 不冒泡（此前用 onBlur 永不触发）；
    // focusout 可冒泡，语义等价于"字段失焦"，schema 侧的 trigger 名仍按 'blur' 上报
    onFocusout = () => runCrossValidator('blur')
    onChange = () => runCrossValidator('change')
  }

  const eventBindings = {
    ...buildVModelBindings(node, opts.model, opts.beforeChange, opts.onValueChange),
    ...buildOnBindings(node, opts.model),
  }
  const asyncProps = buildAsyncProps(node)

  // 阶段 3.1：走 element-plus 官方 API 路径
  // 通过 props.error + props.validateStatus 触发 el-form-item 红字
  // （不直接修改 elForm.fields[i] —— 避免与 element-plus 内部状态机冲突）
  const externalErrors = opts.externalErrors?.()
  const ext = node.name && externalErrors ? externalErrors[node.name] : null

  // 阶段 2.4 修复(嵌套顺序):
  // 正确嵌套: ElRow > ElCol > ElFormItem > Comp
  const formItem = h(
    FormItemComp as never,
    {
      label: node.label,
      prop: node.name,
      rules: compileRules(node.rules, opts.rules) as never,
      ...(ext?.error ? { error: ext.error } : {}),
      ...(ext?.validateStatus ? { validateStatus: ext.validateStatus } : {}),
      ...(onFocusout ? { onFocusout } : {}),
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
            return h(
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
          },
        }
      : undefined
  ) as VNode
  // wrapWithElCol(ElCol) 包 formItem —— 正确嵌套顺序
  return wrapWithElCol(node, formItem, opts.currentBreakpoint?.value)
}

/** 纯 row + column 布局（无 formItem 包装） */
export function renderWithRowColumn(node: SchemaNode, opts: RenderSchemaNodeOptions): VNode {
  const colSpan =
    node.col && typeof node.col === 'object'
      ? (node.col.span ?? 24)
      : node.column
        ? Math.floor(24 / node.column)
        : 24
  // 阶段 2.4:row.responsive 拍平 —— 当前断点的 gutter/type/align/justify 覆盖基础配置
  const mergedRow = mergeRowResponsive(node.row, opts.currentBreakpoint?.value)
  return h(
    ElRow as never,
    { ...mergedRow, ...(node.key !== undefined && { key: node.key }) } as never,
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
