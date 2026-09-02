/**
 * useXFormComposer —— XForm 顶层编排（composition root）
 *
 * P0 拆分后：
 *   - dev 校验 + 表达式扫描 + debug hook + model 缺失 warn → ./use-dev-runtime.ts
 *   - defaultValue 填充 + ElForm 初始值同步 → ./apply-default-values.ts
 *   - XFormExpose 19 方法聚合 → ./use-xform-expose.ts
 *   - 本文件保留 11 个 composable 装配 + optsEpoch 同步 + renderToComponent + renderOpts
 *
 * 行为 100% 等价拆分前，所有 watch / onMounted / onScopeDispose 时序均保持不变。
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 类型断言归因（OPT-3）
 * - `computed(() => props.components) as never` / `computed(() => props.model ?? {}) as never`：
 *   useSchemaRenderer formData 字段类型内部签名不接受 Record<string, unknown>，
 *   实际运行时是 model 对象。composable 间类型契约小幅偏离。
 * - `setExpressionFunctions(fns as never)`：白名单函数注册入参故意宽松。
 * - `renderToComponent` 返回值 `as never`：VNode | string | VNode[] | undefined 多态对外统一。
 * - 不要在没有充分理由时移除这些 cast。
 * ────────────────────────────────────────────────────────────────────────────
 */
import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref, type VNode } from 'vue'

import { useSchemaRenderer } from './use-schema-renderer'
import { useSchemaIndex } from './use-schema-index'
import { useFormErrorBus } from './use-form-error-bus'
import { useCurrentBreakpoint } from './use-current-breakpoint'
import { withHidden } from './with-hidden'
import { applyDirectives } from './apply-directives'
import { useFormInstance, type FieldErrorState } from './use-form-instance'
import { useCrossFieldTrigger } from './use-cross-field-trigger'
import { useFormDirty } from './use-form-dirty'
import { useServerError } from './use-server-error'
import { useFormValidation } from './use-form-validation'
import { makeDefaultBeforeChangeCtx } from './build-vmodel-bindings'
import { useTopLevelFields } from './use-top-level-fields'
import { resolveFunctionExpression, setExpressionFunctions } from './use-expression'
import { useDevRuntime } from './use-dev-runtime'
import { useApplyDefaults } from './apply-default-values'
import { useXFormExpose } from './use-xform-expose'
import {
  useRenderSchemaNode,
  mergeRowResponsive,
  type RenderSchemaNodeOptions,
} from './render-schema-node'
import { DEFAULT_COMPONENT_PROPS } from '../element-plus-adapter'
import type { RuleItem, RowConfig, SchemaNode, XFormExpose, XFormProps } from '../types'

// ────────────────────────────────────────────────────────────────────────────
// 公共类型
// ────────────────────────────────────────────────────────────────────────────

type RenderFn = (
  node: SchemaNode | SchemaNode[] | string | undefined | null
) => VNode | string | VNode[] | undefined

export interface UseXFormComposerOptions {
  props: XFormProps
}

export interface UseXFormComposerReturn {
  /** BEM namespace —— XForm 模板根 class */
  bem: ReturnType<typeof createNamespace>
  /** el-form template ref —— XForm 模板使用 */
  elFormRef: Ref<ReturnType<typeof useFormInstance>['elFormRef']['value']>
  /** 字段渲染函数 —— 传给 SchemaField */
  renderToComponent: RenderFn
  /** 字段错误状态 ref —— XForm 模板用 keys 建立响应式依赖 */
  fieldErrors: Ref<Record<string, FieldErrorState>>
  /** 顶层节点列表（XForm 模板 v-for） */
  topLevelNodes: ComputedRef<SchemaNode[]>
  topLevelRow: ComputedRef<RowConfig | undefined>
  topLevelColumn: ComputedRef<number | undefined>
  topLevelColSpan: ComputedRef<number>
  topLevelDisabled: ComputedRef<boolean>
  topLevelLabelWidth: ComputedRef<string | number>
  topLevelLabelPosition: ComputedRef<'left' | 'right' | 'top'>
  topLevelScrollToError: ComputedRef<boolean>
  topLevelScrollIntoViewOptions: ComputedRef<boolean | ScrollIntoViewOptions>
  /** 合并后的组件默认 props —— XForm 模板无需直接读，仅 composer 内部透传 */
  mergedComponentProps: ComputedRef<Record<string, Record<string, unknown>>>
  /** 校验 schema 静态校验错误（仅 dev 显示在 XFormDebugBanner） */
  validateErrors: Ref<Array<{ keyPath: (string | number)[]; message: string }>>
  /** 表达式沙箱黑名单命中（仅 dev） */
  forbiddenErrors: Ref<string[]>
  /** 是否显示 debug banner（dev = true，prod = false） */
  showDebugBanner: Ref<boolean>
  /** XFormExpose 完整 API —— XForm 通过 defineExpose 透传给 ref */
  exposed: XFormExpose
  /** DEV-only 调试钩子 —— XForm 在 setup 末尾调一次挂 window.__xform_debug */
  installDevDebugHook: () => void
  /** OPT-7：错误事件总线 —— XForm 模板挂载 XFormErrorToast 消费 */
  errorBus: ReturnType<typeof import('./use-form-error-bus').useFormErrorBus>
}

// ────────────────────────────────────────────────────────────────────────────
// 顶层编排
// ────────────────────────────────────────────────────────────────────────────

export function useXFormComposer(options: UseXFormComposerOptions): UseXFormComposerReturn {
  const { props } = options
  const bem = createNamespace('x-form')

  // OPT-7：错误事件总线（user-facing 反馈，dev 弹 OSD，prod 静默）
  // 显式 deps 传递 —— composable 内 provide/inject 在 setup 嵌套中静默失效
  const errorBus = useFormErrorBus()

  // 阶段 3.1：外部字段错误状态（走 element-plus 官方 props.error + props.validateStatus 路径）
  const fieldErrors = ref<Record<string, FieldErrorState>>({})

  // P2-1：响应式断点检测 —— viewport 变化时响应式 ColConfig 自动拍平
  const currentBreakpoint = useCurrentBreakpoint()

  const { reactiveSchema, triggerRender } = useSchemaRenderer({
    schema: computed(() => props.schema),
    components: computed(() => props.components) as never,
    formData: computed(() => props.model ?? {}) as never,
  })

  // 阶段 4.x：schema 元数据中央索引 —— 替代每次遍历 O(n) 的 getNames/collectCrossRuleFields
  const schemaIndex = useSchemaIndex(() => reactiveSchema.value)

  const {
    elFormRef,
    getRef,
    clearValidate,
    resetFields,
    setInitialValues,
    validateField,
    scrollToField,
    validateFormWithZod,
    addItem,
    removeItem,
    moveItem,
    setFieldError,
    setFieldValidating,
  } = useFormInstance(
    () => props.model,
    () => props.zodSchema,
    fieldErrors, // 阶段 3.1：传入外部错误状态 ref，setFieldError 走 props 路径
    errorBus
  )

  // 阶段 2.2：defaultValue 全环境填充 + ElForm 初始值同步（P0 抽离到 apply-default-values）
  useApplyDefaults(props, setInitialValues)

  const {
    debounceValidation: topLevelDebounceMs,
    nodes: topLevelNodes,
    row: topLevelRow,
    column: topLevelColumn,
    colSpan: topLevelColSpan,
    disabled: topLevelDisabled,
    readonly: topLevelReadonly,
    labelWidth: topLevelLabelWidth,
    labelPosition: topLevelLabelPosition,
    scrollToError: topLevelScrollToError,
    scrollIntoViewOptions: topLevelScrollIntoViewOptions,
  } = useTopLevelFields({
    reactiveSchema: computed(() => reactiveSchema.value),
    model: computed(() => props.model),
    currentBreakpoint,
    fieldErrors,
    resolveFunctionExpression,
    // mergeRowResponsive 真实签名第二参数是 specific union；useTopLevelFields deps 接受 string —— wrap 一层
    mergeRowResponsive: (row, bp) =>
      mergeRowResponsive(row, bp as 'xs' | 'sm' | 'md' | 'lg' | 'xl'),
  })

  const crossFieldTrigger = useCrossFieldTrigger({
    crossRules: () => {
      const out: Array<{ target: string; deps: string[]; rule: RuleItem }> = []
      for (const list of schemaIndex.crossRules.value.values()) {
        for (const e of list) out.push({ target: e.target, deps: e.deps, rule: e.rule })
      }
      return out
    },
    model: () => props.model,
    setFieldError: (name, message) => setFieldError(name, message),
    clearValidate: (names: string[]) => clearValidate(names),
    defaultDebounceMs: () => topLevelDebounceMs.value,
  })

  // 阶段 2.2：dirty 状态追踪
  const formDirty = useFormDirty({
    model: () => props.model,
    fieldNames: () => schemaIndex.fieldNames.value,
  })
  // 立即拍基线
  formDirty.resetDirty()

  // 阶段 3.1：fieldErrors 变化时强制 reactiveSchema 引用变化
  watch(fieldErrors, () => triggerRender(), { deep: true })

  // 阶段 2.1：服务端错误适配器
  const serverError = useServerError({
    setFieldError: (name, message) => setFieldError(name, message),
    clearValidate,
    knownFields: () => schemaIndex.allNames.value,
  })

  // 校验编排
  const { validateForm, validateDetail, triggerCrossFieldValidator } = useFormValidation({
    reactiveSchema: computed(() => reactiveSchema.value),
    model: computed(() => props.model),
    rules: computed(() => props.rules),
    elFormRef,
    setFieldError: (name, message) => setFieldError(name, message),
    scrollToField,
    topLevelScrollToError,
    crossFieldTrigger,
    errorBus,
  })

  // 合并内置默认 props 与用户传入配置
  const mergedComponentProps = computed(() => ({
    ...DEFAULT_COMPONENT_PROPS,
    ...props.componentProps,
  }))

  // P0 抽离：dev 校验 + 表达式扫描 + debug hook
  const { validateErrors, forbiddenErrors, showDebugBanner, installDevDebugHook } = useDevRuntime({
    props,
    errorBus,
    setFieldError: (name, message) => setFieldError(name, message),
    fieldErrors,
  })

  /** 节点渲染（外层：hidden / directives 包装） */
  function renderToComponent(
    node: SchemaNode | SchemaNode[] | string | undefined | null
  ): VNode | string | VNode[] | undefined {
    // 订阅 optsEpoch：B4 watch 在 props 引用换代时 bump 它，字段 effect 随之失效重渲
    void optsEpoch.value
    if (node === null || node === undefined) return undefined
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(renderToComponent) as VNode[]
    if (node.ignore) return undefined
    if (node.hidden) {
      const inner = renderInner(node)
      if (inner && typeof inner !== 'string' && !Array.isArray(inner)) return withHidden(inner)
    }
    const result = renderInner(node)
    if (!result || typeof result === 'string' || Array.isArray(result)) return result as never
    return applyDirectives(result, node.directives)
  }

  const renderOpts: RenderSchemaNodeOptions = {
    model: props.model,
    components: props.components,
    beforeChange: props.beforeChange,
    beforeChangeRules: props.beforeChangeRules,
    // ctx 工厂：makeBeforeChangeCtx 是函数，render 时才执行（闭包内访问的 exposed 在 useXFormComposer 末尾才构造）
    // 用 getter 函数延迟解析 formRef 引用 —— render 时 exposed 已存在
    makeBeforeChangeCtx: (node) =>
      makeDefaultBeforeChangeCtx(
        node,
        (props.model ?? {}) as Record<string, unknown>,
        // getter 闭包：render 时调用拿到 exposed
        () => exposed
      ),
    rules: props.rules,
    componentProps: mergedComponentProps.value,
    render: renderToComponent,
    // 阶段 3.1：把 fieldErrors 状态透传给 renderWithFormItem
    externalErrors: () => fieldErrors.value,
    arrayActions: {
      addItem: (name: string, init?: Record<string, unknown>) => addItem(name, init),
      removeItem: (name: string, index: number) => removeItem(name, index),
      moveItem: (name: string, from: number, to: number) => moveItem(name, from, to),
    },
    // 字段事件触发 cross rules
    triggerCrossFieldValidator: (node, eventType) => triggerCrossFieldValidator(node, eventType),
    // 触发 el-form 字段内 async-validator 校验
    validateField: async (name: string) => {
      try {
        await elFormRef.value?.validateField?.(name)
      } catch {
        /* silent — 校验失败时错误已写入 form-item */
      }
    },
    // v-model 值变化时的跨字段调度唯一入口
    onValueChange: (node, _newValue) => {
      if (node.name) {
        // 顺序关键：delay=0（实时模式）下 crossValidator 同步执行，
        // 若先 trigger 后 clearValidate，刚写入的错误会被立即清除，导致 UI 不标红。
        clearValidate([node.name])
        crossFieldTrigger.trigger(node.name)
      }
    },
    // P2-1：响应式断点感知
    currentBreakpoint: currentBreakpoint,
    // P2-1：整体只读开关
    globalReadonly: () => topLevelReadonly.value,
  }

  // P2-2：白名单函数表注册（模块级，scope 销毁时清空避免跨实例污染）
  watch(
    () => props.expressionFunctions,
    (fns) => setExpressionFunctions(fns as never),
    { immediate: true }
  )
  onScopeDispose(() => setExpressionFunctions(undefined))

  const renderInner = useRenderSchemaNode(renderOpts)

  // B4 修复：renderOpts 在 setup 期捕获 props 快照，父级替换引用后渲染绑定静默断裂
  /** opts 换代计数器 —— 父级替换 props 引用时 bump，让所有 SchemaField 的 render effect 失效重渲 */
  const optsEpoch = ref(0)

  watch(
    () => [
      props.model,
      props.components,
      props.rules,
      props.beforeChange,
      mergedComponentProps.value,
    ],
    () => {
      renderOpts.model = props.model
      renderOpts.components = props.components
      renderOpts.rules = props.rules
      renderOpts.beforeChange = props.beforeChange
      renderOpts.componentProps = mergedComponentProps.value
      optsEpoch.value++ // props 引用换代
    }
  )

  // getNames 现在直接查 schemaIndex 索引（O(1)），保留函数签名与原行为一致
  function getNames(includesIgnore = false): string[] {
    return [...schemaIndex.getFieldNames(includesIgnore)]
  }

  // P0 抽离：exposed 19 方法聚合
  const exposed: XFormExpose = useXFormExpose({
    getRef,
    clearValidate,
    resetFields,
    validateField,
    scrollToField,
    validateFormWithZod,
    setFieldError,
    setFieldValidating,
    addItem,
    removeItem,
    moveItem,
    validateForm,
    validateDetail,
    getNames,
    isDirty: formDirty.isDirty,
    getDirtyFields: formDirty.getDirtyFields,
    isTouched: formDirty.isTouched,
    resetDirty: formDirty.resetDirty,
    validateFromServer: serverError.validateFromServer,
  })

  return {
    bem,
    elFormRef,
    renderToComponent,
    fieldErrors,
    topLevelNodes,
    topLevelRow,
    topLevelColumn,
    topLevelColSpan,
    topLevelDisabled,
    topLevelLabelWidth,
    topLevelLabelPosition,
    topLevelScrollToError,
    topLevelScrollIntoViewOptions,
    mergedComponentProps,
    validateErrors,
    forbiddenErrors,
    showDebugBanner,
    exposed,
    installDevDebugHook,
    errorBus,
  }
}
