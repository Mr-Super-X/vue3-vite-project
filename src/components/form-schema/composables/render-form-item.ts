/**
 * FormItem 包装渲染（含 name 或 formItem: true 的节点）
 *
 * - 外层包 el-form-item（label + prop + rules + onFocusout/onChange 跨字段触发）
 * - 内部渲染 Comp（v-model/on 事件 + 默认 props + node.props + async props + disabled + key）
 * - formItem 节点的 slots 转发给内部 Comp（如 el-upload 的 tip 槽位）
 * - 末尾 wrapWithElCol 应用 col 响应式断点
 *
 * 类型断言（`as never`）归因见 types/TYPE-CAST-AUDIT.md。
 */
import { h, type VNode } from 'vue'
import { ElFormItem, ElRow, ElCol, ElUpload } from 'element-plus'
import type { SchemaNode } from '../types'
import { buildVModelBindings } from './build-vmodel-bindings'
import { buildOnBindings } from './build-on-bindings'
import {
  buildSlotFn,
  buildUploadTipSlot,
  compileRules,
  getComponentDefaultProps,
  buildAsyncProps,
  buildUploadDefaultSlot,
  resolveComponentFor,
  wrapWithElCol,
  mergeRowResponsive,
} from './render-schema-node'
import type { RenderSchemaNodeOptions } from './render-schema-node'

/** renderWithFormItem —— FormItem 包装渲染（含 name 或 formItem:true 的节点） */
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

  // 跨字段校验调度分工：
  // - change 场景由 useCrossFieldTrigger 统一接管（v-model 变化即触发，享受 debounceValidation），
  //   此处不再挂 onChange —— 原生 change 冒泡 + onValueChange + debounce 三线并行使
  //   crossValidator 每键重复执行（实时模式 3 次/键）
  // - blur（失焦即校验）是 useCrossFieldTrigger 不覆盖的语义，由 focusout 监听承载
  // 字段内 async-validator 规则（required 等）由 el-form-item 内部 addValidateEvents 自动处理；
  // 这里只额外触发 crossValidator，避免手动 validateField 与内部 validate 产生状态竞争覆盖。
  const triggerFn = opts.triggerCrossFieldValidator

  let onFocusout: (() => Promise<void> | void) | undefined
  if (triggerFn && node.name) {
    const tf: NonNullable<typeof triggerFn> = triggerFn
    const fieldName = node.name
    // 监听器挂在 ElFormItem 根 div 上，而原生 blur 不冒泡（此前用 onBlur 永不触发）；
    // focusout 可冒泡，语义等价于"字段失焦"，schema 侧的 trigger 名仍按 'blur' 上报
    onFocusout = () => tf({ ...node, name: fieldName }, 'blur')
  }

  const eventBindings = {
    ...buildVModelBindings(node, opts.model, {
      layer1: opts.beforeChange,
      namespaceRules: opts.beforeChangeRules,
      makeCtx: opts.makeBeforeChangeCtx,
      formRef: opts.formRef,
      onValueChange: opts.onValueChange,
    }),
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
  // 转发 formItem.slots（特别是 label slot 用于自定义 label 内容）—— ElFormItem 的 label 是 slot 名称
  const formItemSlots: Record<string, (scope?: unknown) => unknown> = {}
  if (fi?.slots) {
    for (const [k, v] of Object.entries(fi.slots)) {
      // label slot 走 buildSlotFn 递归渲染 schema 节点；其他 slot 同样处理
      formItemSlots[k] = buildSlotFn(v as never, opts.render)
    }
  }
  const formItem = h(
    FormItemComp as never,
    {
      label: node.label,
      prop: node.name,
      // ⭐ 字段级 label 配置 override 顶层（el-form-item 与 el-form 共享 labelPosition/labelWidth）
      // 字段级未设置时 el-form-item 自动继承 el-form 顶层（element-plus 原生行为）
      ...(node.labelPosition !== undefined ? { labelPosition: node.labelPosition } : {}),
      ...(node.labelWidth !== undefined ? { labelWidth: node.labelWidth } : {}),
      // hidden 字段剥离 rules：隐藏必填项若参与校验会让 validate 恒 false，
      // 且 scrollToError 会滚动到 display:none 的元素（用户看不到任何错误）。
      // 保留 prop 注册（el-form-item 挂载时注册时机固定，动态增删 prop 不可靠），
      // rules 为空即恒通过。hidden ≠ ignore：值仍保留在 model 中会提交
      rules:
        node.hidden === true ? [] : (compileRules(node.rules, opts.rules, node.label) as never),
      ...(ext?.error ? { error: ext.error } : {}),
      ...(ext?.validateStatus ? { validateStatus: ext.validateStatus } : {}),
      ...(onFocusout ? { onFocusout } : {}),
      ...fiProps,
      // key 优先级：node.key（身份标识，数组行内为行对象身份前缀）> node.name（校验路径，含位置索引）
      // —— 若优先 name，数组删/移行后 fi-items[0].qty 漂移导致 form-item 重挂载
      ...(node.name || node.key ? { key: `fi-${node.key ?? node.name}` } : {}),
    } as never,
    // ⭐ 第 3 参：ElFormItem 的 slots 对象——合并 formItemSlots（用户自定义 label/error 等）
    // Comp 内部渲染（Input 组件）由 default slot 提供
    Comp
      ? {
          default: () => {
            const defaultSlot = buildUploadDefaultSlot(node, Comp, opts.render)
            const extraSlots: Record<string, (scope?: unknown) => unknown> = {}
            if (node.slots) {
              for (const [k, v] of Object.entries(node.slots)) {
                // default 插槽已由 buildUploadDefaultSlot 统一处理，避免重复/覆盖
                if (k === 'default') continue
                // Upload 的 string tip 自动包 el-upload__tip，获得 Element Plus 默认提示样式
                if (k === 'tip' && Comp === ElUpload) {
                  extraSlots[k] = buildUploadTipSlot(v, opts.render)
                } else {
                  extraSlots[k] = buildSlotFn(v, opts.render)
                }
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
          // ⭐ 合并 formItemSlots（用户自定义 formItem slots，如 label）到 ElFormItem 的 slots
          // formItemSlots 的 key（如 label/error）会覆盖 ElFormItem 默认同名 slot
          ...formItemSlots,
        }
      : Object.keys(formItemSlots).length > 0
        ? formItemSlots
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
