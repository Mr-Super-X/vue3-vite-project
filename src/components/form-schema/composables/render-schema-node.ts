/**
 * Schema 节点渲染调度器 —— 5 类分支委托给子模块
 *
 * 拆分子模块：组件解析→./resolve-component、规则编译→./compile-rules、
 * 栅格包装→./wrap-with-elcol、插槽构造→./build-slots、主调度→本文件。
 * 所有工具函数通过 re-export 保留对外 API，调用方零改动。
 *
 * 类型断言（`as never`）归因见 types/TYPE-CAST-AUDIT.md。
 */
import { h, type VNode, type ComponentPublicInstance, type Ref } from 'vue'

import type {
  BeforeChangeCtx,
  BeforeChangeRule,
  SchemaNode,
  XFormExpose,
  XFormProps,
} from '../types'

import { resolveComponentFor } from './resolve-component'
import { wrapWithElCol } from './wrap-with-elcol'
import { buildAsyncProps, buildUploadDefaultSlot, getComponentDefaultProps } from './build-slots'

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

/**
 * RenderSchemaNodeOptions —— render-schema-node 主调度入参
 *
 * 5 类分支（数组 / 视觉容器 / FormItem / row+column / 默认）共享的 ctx：
 * model / components / beforeChange / rules / render / formRef / permissionResolver / globalReadonly 等
 *
 * @see ./render-form-item.ts / render-array-node.ts / render-visual-container.ts 等子模块接收此 options
 */
export interface RenderSchemaNodeOptions {
  model: XFormProps['model']
  components: XFormProps['components']
  beforeChange: XFormProps['beforeChange']
  beforeChangeRules?: BeforeChangeRule[] | undefined
  /** ctx 工厂（每字段独立 ctx 实例） */
  makeBeforeChangeCtx?: ((node: SchemaNode) => BeforeChangeCtx) | undefined
  /** XFormExpose：ctx.setFieldError 调用 */
  formRef?: XFormExpose | undefined
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

/** 主调度入口 —— 5 类渲染分支委托给子函数（行为 100% 等价原内联实现，P1-3 重构） */
export function useRenderSchemaNode(opts: RenderSchemaNodeOptions) {
  // ──────────────────────────────────────────────────────────────────────
  // 5 类渲染分支函数（按顺序尝试，第一个返回非 undefined 的胜出）
  // 每个函数职责单一 + 行为等价原内联 if-else 块；主函数只剩调度逻辑
  // ──────────────────────────────────────────────────────────────────────

  /** view 态占位（permission: 'view' 或顶层 readonly）—— 纯文本不包 formItem 不走校验 */
  function renderViewField(node: SchemaNode): VNode {
    return h(
      'div',
      {
        key: `view-${node.name}`,
        class: 'x-form-view-field',
        'data-permission': 'view',
      } as Record<string, unknown>,
      {
        default: () =>
          [
            node.label
              ? h('label', { class: 'x-form-view-field__label' } as Record<string, unknown>, {
                  default: () => `${node.label}：`,
                })
              : null,
            h('span', { class: 'x-form-view-field__value' } as Record<string, unknown>, {
              default: () => renderViewPlaceholder(node, opts.model),
            }),
          ].filter(Boolean) as never,
      }
    ) as VNode
  }

  /** 共享上下文准备（dev mode 白名单校验 + 组件解析 + 事件绑定 + async props） */
  function resolveNodeContext(node: SchemaNode): {
    Comp: ReturnType<typeof resolveComponentFor>
    eventBindings: Record<string, unknown>
    asyncProps: Record<string, unknown>
  } {
    // dev mode 白名单校验（用户传错字段名时 console.warn + OSD 提示）
    // 仅遍历 string component + EL_COMPONENT_MAP 命中的字段；用户自定义组件自动跳过
    validateSchemaProps(node)
    const Comp =
      typeof node.component === 'string'
        ? resolveComponentFor(node.component, opts.components)
        : node.component
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
    return { Comp, eventBindings, asyncProps }
  }

  /** 分支 2：视觉容器（Card 等带 row/column，无 name） */
  function renderVisualBranch(
    node: SchemaNode,
    Comp: ReturnType<typeof resolveComponentFor>,
    asyncProps: Record<string, unknown>
  ): VNode | string | VNode[] | undefined {
    if (!Comp || (!node.slots && node.children === undefined) || node.name) return undefined
    return renderVisualContainer(node, Comp as object, opts, asyncProps)
  }

  /** 分支 3：FormItem 包装（含 name 或 formItem: true）—— 有 fall-through（result 为空时继续） */
  function renderFormItemBranch(
    node: SchemaNode,
    Comp: ReturnType<typeof resolveComponentFor>
  ): VNode | string | VNode[] | undefined {
    const shouldWrap =
      (node.name !== undefined && node.formItem !== false) || node.formItem === true
    if (!shouldWrap) return undefined
    return renderWithFormItem(node, Comp as object, opts) ?? undefined
  }

  /** 分支 4：纯 row+column 布局（无 formItem） */
  function renderRowColumnBranch(node: SchemaNode): VNode | string | VNode[] | undefined {
    if (node.row === undefined && node.column === undefined) return undefined
    return renderWithRowColumn(node, opts)
  }

  /** 分支 5：默认——直接渲染 Comp + wrapWithElCol */
  function renderDefaultBranch(
    node: SchemaNode,
    Comp: ReturnType<typeof resolveComponentFor>,
    eventBindings: Record<string, unknown>,
    asyncProps: Record<string, unknown>
  ): VNode | string | VNode[] | undefined {
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
        } as Record<string, unknown>,
        { default: buildUploadDefaultSlot(node, Comp, opts.render) as never }
      ) as VNode,
      opts.currentBreakpoint?.value
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // 主调度：权限 gate + view 态提前 return；下方 5 分支按顺序尝试
  // ──────────────────────────────────────────────────────────────────────

  function renderToComponentInner(node: SchemaNode): VNode | string | VNode[] | undefined {
    // 权限 gate（位于最前面，所有渲染分支前）
    // - hidden: 不渲染，DOM 中不出现
    // - view: 纯文本占位，跳过 formItem 包装与校验
    // - edit: 正常走原有分支
    const permission = resolvePermission(node, {
      model: () => opts.model ?? {},
      ...(opts.permissionResolver ? { permissionResolver: opts.permissionResolver } : {}),
    })
    if (permission === 'hidden') return undefined
    // 顶层 schema readonly：未 hidden 的字段一律按 view 态展示
    const readonly = opts.globalReadonly?.() === true
    if ((permission === 'view' || readonly) && node.name) {
      return renderViewField(node)
    }

    // 数组节点独立分支：进入即截断，即使 renderArrayNode 返回 undefined
    if (node.kind === 'array') return renderArrayNode(node, opts)

    // 共享上下文准备（dev mode 白名单校验 + Comp + eventBindings + asyncProps）
    const { Comp, eventBindings, asyncProps } = resolveNodeContext(node)

    // 2) 视觉容器（Card 等带 row/column，无 name）
    const visualResult = renderVisualBranch(node, Comp, asyncProps)
    if (visualResult !== undefined) return visualResult

    // 3) FormItem 包装（含 name 或 formItem: true）—— 有 fall-through
    const formItemResult = renderFormItemBranch(node, Comp)
    if (formItemResult !== undefined) return formItemResult

    // 4) 纯 row+column 布局（无 formItem）
    const rowColumnResult = renderRowColumnBranch(node)
    if (rowColumnResult !== undefined) return rowColumnResult

    // 5) 默认分支：直接渲染 Comp
    return renderDefaultBranch(node, Comp, eventBindings, asyncProps)
  }
  return renderToComponentInner
}

export type { ComponentPublicInstance }
