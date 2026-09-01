/**
 * Schema 节点渲染调度器 —— P2-B 拆分后主文件
 *
 * 原 528 行单文件包含：组件解析 + 规则编译 + 栅格包装 + 插槽构造 + 主调度 + 类型定义
 * 拆分后（本文件 ~180 行）：
 *   - 组件解析：./resolve-component.ts（EL_COMPONENT_MAP + resolveComponentFor + isElUpload）
 *   - 规则编译：./compile-rules.ts（warnUnknownRule + compileRules）
 *   - 栅格包装：./wrap-with-elcol.ts（wrapWithElCol + pickBreakpointConfig + mergeCol/RowResponsive）
 *   - 插槽构造：./build-slots.ts（renderChildren + buildSlotFn + buildUploadDefaultSlot + buildUploadTipSlot + getComponentDefaultProps + buildAsyncProps）
 *   - 主调度：本文件（useRenderSchemaNode + RenderSchemaNodeOptions）
 *
 * 所有工具函数通过 re-export 保留对外 API，调用方零改动：
 *   - render-form-item.ts / render-array-node.ts / render-visual-container.ts 等
 *   - render-schema-node.spec.ts（测试用）
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 类型断言归因（OPT-3）
 * 本文件 `as never` 集中在 h(ElCol, ...)调用处与 SchemaNode.children 多态分支。
 * - h() 类型 cast：vue + element-plus 类型元组缺陷，见 render-array-node.ts 头部
 * - `buildSlotFn(...)() as never` / `renderChildren(...) as never`：SchemaNode.children
 *   是 `SchemaNode | SchemaNode[] | string | undefined` 多态，调用方经 schema 配置
 *   后类型 narrow 失败（业务上不可能误用，schema 校验在 XFormDevBanner 阶段拦）
 * - `pickBreakpointConfig(responsive as never, current)`：ColConfig.responsive
 *   已是 NonNullable<...> 但 vue 3.5 的 key narrowing 在 Conditional 上不完整
 * 不要在没有充分理由时移除这些 cast
 * ────────────────────────────────────────────────────────────────────────────
 */
import { h, type VNode, type ComponentPublicInstance, type Ref } from 'vue'

import type { SchemaNode, XFormProps } from '../types'
// ColConfig / RowConfig / SchemaSlot 类型仅在新拆分文件内使用；此处 re-export 仅保留
// API 类型暴露位（外部消费方可能从本文件 import 类型）。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ColConfig, RowConfig, SchemaSlot } from '../types'

import { resolveComponentFor } from './resolve-component'
// compileRules / mergeColResponsive / mergeRowResponsive / renderChildren /
// buildSlotFn / buildUploadTipSlot 仅作为 re-export 暴露 API，本文件不直接使用。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { compileRules } from './compile-rules'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { mergeColResponsive, mergeRowResponsive } from './wrap-with-elcol'
import { wrapWithElCol } from './wrap-with-elcol'
// renderChildren / buildSlotFn / buildUploadTipSlot 仅作为 re-export 暴露 API
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { renderChildren } from './build-slots'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { buildSlotFn } from './build-slots'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { buildUploadTipSlot } from './build-slots'
import { buildUploadDefaultSlot, getComponentDefaultProps, buildAsyncProps } from './build-slots'

import { buildVModelBindings } from './build-vmodel-bindings'
import { buildOnBindings } from './build-on-bindings'
import { renderArrayNode } from './render-array-node'
import { renderVisualContainer } from './render-visual-container'
import { renderWithFormItem, renderWithRowColumn } from './render-form-item'
import { resolvePermission, renderViewPlaceholder } from './use-field-permission'
import { validateSchemaProps } from './validate-component-props'

type RenderFn = (
  node: SchemaNode | SchemaNode[] | string | undefined | null
) => VNode | string | VNode[] | undefined

// ────────────────────────────────────────────────────────────────────────────
// Re-exports —— 保留旧 API 兼容（render-form-item / render-array-node 等调用方零改动）
// ────────────────────────────────────────────────────────────────────────────

export {
  EL_COMPONENT_MAP,
  resolveComponentFor,
  isElUpload,
  isPictureCardUpload,
  isDragUpload,
} from './resolve-component'

export { compileRules } from './compile-rules'

export {
  wrapWithElCol,
  pickBreakpointConfig,
  mergeColResponsive,
  mergeRowResponsive,
} from './wrap-with-elcol'

export {
  renderChildren,
  buildSlotFn,
  buildUploadDefaultSlot,
  buildUploadTipSlot,
  getComponentDefaultProps,
  buildAsyncProps,
} from './build-slots'

// ────────────────────────────────────────────────────────────────────────────
// RenderSchemaNodeOptions —— 主调度入参类型
// ────────────────────────────────────────────────────────────────────────────

export interface RenderSchemaNodeOptions {
  model: XFormProps['model']
  components: XFormProps['components']
  beforeChange: XFormProps['beforeChange']
  rules: XFormProps['rules']
  componentProps?: XFormProps['componentProps']
  render: RenderFn
  /** ArrayNode 命令式操作（来自 XFormExpose） */
  arrayActions?: {
    addItem: (name: string, init?: Record<string, unknown>) => void
    removeItem: (name: string, index: number) => void
    moveItem: (name: string, from: number, to: number) => void
  }
  /** 字段事件触发跨字段校验 */
  triggerCrossFieldValidator?: (
    node: SchemaNode,
    eventType: 'blur' | 'change'
  ) => Promise<void> | void
  /**
   * 触发 el-form 字段内 async-validator 校验（onBlur/onChange handler 需要手动调用）
   * 为什么需要：覆盖 el-form-item 内部 emit 的 onBlur 后,el-form 不会自动跑字段内规则
   * XForm 必须**显式**调用此函数才能保证字段内 min/max/required 等规则生效
   */
  validateField?: (name: string) => Promise<void>
  /** v-model 值写入后主动触发 */
  onValueChange?: (node: SchemaNode, newValue: unknown) => void
  /** 当前响应式断点 */
  currentBreakpoint?: Ref<'xs' | 'sm' | 'md' | 'lg' | 'xl'>
  /**
   * 权限码 → 状态 映射（阶段 2.3）
   * 业务可注入 useAuth().hasPerm 实现的 resolver：
   *   'user.edit' → hasPerm('user.edit') ? 'edit' : 'hidden'
   * 默认 identity（字符串字面量直接返回）
   */
  permissionResolver?: (perm: string) => 'view' | 'edit' | 'hidden'
  /**
   * 整体只读（顶层 schema readonly 字段解析结果，由 XForm 注入）：
   * 返回 true 时未 hidden 的字段一律按 view 态纯文本展示（hidden 优先级仍最高）
   */
  globalReadonly?: () => boolean
  /**
   * 阶段 3.1：外部字段错误状态（由 XForm.vue 注入）
   * 走 el-form-item 的 props.error + props.validateStatus 官方路径触发红字
   * （避免直接修改 elForm.fields[i] 的隐患）
   * key: 字段名;value: { error: string; validateStatus: '' | 'validating' | 'success' | 'error' }
   */
  externalErrors?: () => Record<
    string,
    { error: string; validateStatus: '' | 'validating' | 'success' | 'error' }
  >
}

// ────────────────────────────────────────────────────────────────────────────
// 主调度入口 —— 5 类分支委托给子模块
// ────────────────────────────────────────────────────────────────────────────

/** 主调度入口 —— 4 类分支委托给子模块 */
export function useRenderSchemaNode(opts: RenderSchemaNodeOptions) {
  function renderToComponentInner(node: SchemaNode): VNode | string | VNode[] | undefined {
    // 阶段 2.3：权限 gate（位于最前面，所有渲染分支前）
    // - hidden:不渲染,直接返回 undefined（DOM 中不出现）
    // - view:渲染为纯文本占位,跳过 formItem 包装与校验
    // - edit:正常走原有分支
    const permission = resolvePermission(node, {
      model: () => opts.model ?? {},
      ...(opts.permissionResolver ? { permissionResolver: opts.permissionResolver } : {}),
    })
    if (permission === 'hidden') return undefined
    // 整体只读（顶层 schema readonly）：未 hidden 的字段一律按 view 态展示（P2-1）
    const readonly = opts.globalReadonly?.() === true
    if ((permission === 'view' || readonly) && node.name) {
      // view 态:渲染 label + 纯文本占位（不包 formItem,不走校验）
      return h(
        'div',
        {
          key: `view-${node.name}`,
          class: 'x-form-view-field',
          'data-permission': 'view',
        } as never,
        {
          default: () =>
            [
              node.label
                ? h('label', { class: 'x-form-view-field__label' } as never, {
                    default: () => `${node.label}：`,
                  })
                : null,
              h('span', { class: 'x-form-view-field__value' } as never, {
                default: () => renderViewPlaceholder(node, opts.model),
              }),
            ].filter(Boolean) as never,
        }
      ) as VNode
    }

    // 1) 数组节点独立分支
    if (node.kind === 'array') {
      return renderArrayNode(node, opts)
    }
    // OPT-B：dev mode props 白名单校验（用户传错字段名时 console.warn + OSD 提示）
    // validate 仅遍历 string component + EL_COMPONENT_MAP 命中的字段；用户自定义组件自动跳过
    validateSchemaProps(node)
    const Comp =
      typeof node.component === 'string'
        ? resolveComponentFor(node.component, opts.components)
        : node.component
    const eventBindings = {
      ...buildVModelBindings(node, opts.model, opts.beforeChange, opts.onValueChange),
      ...buildOnBindings(node, opts.model),
    }
    const asyncProps = buildAsyncProps(node)
    // 2) 视觉容器（Card 等带 row/column，无 name）
    if (Comp && (node.slots || node.children !== undefined) && !node.name) {
      return renderVisualContainer(node, Comp as object, opts, asyncProps)
    }
    // 3) FormItem 包装（含 name 或 formItem: true）
    const wrapWithFormItem =
      (node.name !== undefined && node.formItem !== false) || node.formItem === true
    if (wrapWithFormItem) {
      const result = renderWithFormItem(node, Comp as object, opts)
      if (result) return result
    }
    // 4) 纯 row+column 布局（无 formItem）
    if (node.row || node.column !== undefined) {
      return renderWithRowColumn(node, opts)
    }
    // 5) 默认分支：直接渲染 Comp
    if (!Comp) return undefined
    return wrapWithElCol(
      node,
      h(
        Comp as never,
        {
          ...eventBindings,
          ...getComponentDefaultProps(node, opts.componentProps),
          ...node.props,
          ...asyncProps,
          ...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
          ...(node.key !== undefined && { key: node.key }),
        } as never,
        { default: buildUploadDefaultSlot(node, Comp, opts.render) as never }
      ) as VNode,
      opts.currentBreakpoint?.value
    )
  }
  return renderToComponentInner
}

export type { ComponentPublicInstance }
