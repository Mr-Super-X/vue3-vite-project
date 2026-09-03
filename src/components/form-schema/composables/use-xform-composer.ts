/**
 * useXFormComposer —— XForm 顶层编排（composition root）
 *
 * 负责装配 11 个 composable + optsEpoch 同步 + renderToComponent + renderOpts。
 * 子编排已抽离：dev 校验→./use-dev-runtime、defaultValue→./apply-default-values、
 * XFormExpose→./use-xform-expose。
 *
 * 类型断言（`as never`）归因见 types/TYPE-CAST-AUDIT.md。
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

/**
 * useXFormComposer 入参 —— 仅 props 一项（XForm setup 时调用）
 */
export interface UseXFormComposerOptions {
  props: XFormProps
}

/**
 * useXFormComposer 返回值 —— XForm 模板全部依赖项（顶层编排对外契约）
 *
 * - bem / elFormRef / renderToComponent: 模板根 class / el-form ref / 节点渲染闭包
 * - fieldErrors: 模板 :data-field-errors 显式绑定以建立响应式依赖（详见 XForm.vue 模板注释）
 * - topLevelXxx: 顶层 schema 字段派生的 computed（labelPosition / disabled / scrollToError 等）
 * - exposed / installDevDebugHook / errorBus: defineExpose 透传 / dev console hook / OSD 错误总线
 */
export interface UseXFormComposerReturn {
  /** XForm 模板根 class */
  bem: ReturnType<typeof createNamespace>
  /** XForm 模板绑定：<ElForm ref="elFormRef"> */
  elFormRef: Ref<ReturnType<typeof useFormInstance>['elFormRef']['value']>
  /** 传给 SchemaField 的渲染闭包 */
  renderToComponent: RenderFn
  /** 模板 :data-field-errors 显式绑定以建立响应式依赖（详见模板注释） */
  fieldErrors: Ref<Record<string, FieldErrorState>>
  /** XForm 模板 v-for 数据源 */
  topLevelNodes: ComputedRef<SchemaNode[]>
  topLevelRow: ComputedRef<RowConfig | undefined>
  topLevelColumn: ComputedRef<number | undefined>
  topLevelColSpan: ComputedRef<number>
  topLevelDisabled: ComputedRef<boolean>
  topLevelLabelWidth: ComputedRef<string | number>
  topLevelLabelPosition: ComputedRef<'left' | 'right' | 'top'>
  topLevelScrollToError: ComputedRef<boolean>
  topLevelScrollIntoViewOptions: ComputedRef<boolean | ScrollIntoViewOptions>
  mergedComponentProps: ComputedRef<Record<string, Record<string, unknown>>>
  /** 仅 dev 显示在 XFormDebugBanner */
  validateErrors: Ref<Array<{ keyPath: (string | number)[]; message: string }>>
  /** 仅 dev：表达式沙箱黑名单命中 */
  forbiddenErrors: Ref<string[]>
  /** dev = true / prod = false */
  showDebugBanner: Ref<boolean>
  /** XForm 通过 defineExpose 透传给 ref */
  exposed: XFormExpose
  /** XForm setup 末尾调一次，挂 window.__xform_debug */
  installDevDebugHook: () => void
  /** XForm 模板挂载 XFormErrorToast 消费 */
  errorBus: ReturnType<typeof import('./use-form-error-bus').useFormErrorBus>
}

// ────────────────────────────────────────────────────────────────────────────
// 顶层编排
// ────────────────────────────────────────────────────────────────────────────

/** useXFormComposer —— XForm 顶层编排（composition root） */
export function useXFormComposer(options: UseXFormComposerOptions): UseXFormComposerReturn {
  const { props } = options
  const bem = createNamespace('x-form')

  // 显式 deps 传递 —— composable 内 provide/inject 在 setup 嵌套中静默失效
  const errorBus = useFormErrorBus()

  // 走 element-plus 官方 props.error + props.validateStatus 路径触发红字
  const fieldErrors = ref<Record<string, FieldErrorState>>({})

  // viewport 变化时响应式 ColConfig 自动拍平
  const currentBreakpoint = useCurrentBreakpoint()

  const { reactiveSchema, triggerRender } = useSchemaRenderer({
    schema: computed(() => props.schema),
    components: computed(() => props.components) as never,
    formData: computed(() => props.model ?? {}) as never,
  })

  // schema 元数据中央索引 —— 替代每次遍历 O(n) 的 getNames/collectCrossRuleFields
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
    fieldErrors,
    errorBus
  )

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
    // useTopLevelFields deps 接受 string；mergeRowResponsive 真实签名是 specific union —— wrap 一层
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

  const formDirty = useFormDirty({
    model: () => props.model,
    fieldNames: () => schemaIndex.fieldNames.value,
  })
  // 立即拍基线
  formDirty.resetDirty()

  // fieldErrors 变化时强制 reactiveSchema 引用变化
  watch(fieldErrors, () => triggerRender(), { deep: true })

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

  const mergedComponentProps = computed(() => ({
    ...DEFAULT_COMPONENT_PROPS,
    ...props.componentProps,
  }))

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
    // getter 闭包延迟解析 exposed —— 闭包内访问的 exposed 在本函数末尾才构造
    makeBeforeChangeCtx: (node) =>
      makeDefaultBeforeChangeCtx(
        node,
        (props.model ?? {}) as Record<string, unknown>,
        () => exposed
      ),
    rules: props.rules,
    componentProps: mergedComponentProps.value,
    render: renderToComponent,
    externalErrors: () => fieldErrors.value,
    arrayActions: {
      addItem: (name: string, init?: Record<string, unknown>) => addItem(name, init),
      removeItem: (name: string, index: number) => removeItem(name, index),
      moveItem: (name: string, from: number, to: number) => moveItem(name, from, to),
    },
    triggerCrossFieldValidator: (node, eventType) => triggerCrossFieldValidator(node, eventType),
    validateField: async (name: string) => {
      try {
        await elFormRef.value?.validateField?.(name)
      } catch (err: unknown) {
        // 对齐 validateForm 错误流:走 errorBus, dev/qa 可通过 OSD 看到, prod 仅 console.error 留痕
        // 错误已写入 form-item 但用户主动调用 validateField 仍需看到全量细节
        errorBus.report({
          severity: 'error',
          code: 'EL_FORM_VALIDATE_FIELD_FAILED',
          message: `字段 ${name} 校验失败`,
          source: 'useXFormComposer.validateField',
          force: true, // 主动调用场景,跳过去重
          ...(err instanceof Error
            ? { details: [{ field: name, value: undefined, message: err.message }] }
            : {}),
        })
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
    currentBreakpoint: currentBreakpoint,
    globalReadonly: () => topLevelReadonly.value,
  }

  // 白名单函数表注册（模块级，scope 销毁时清空避免跨实例污染）
  watch(
    () => props.expressionFunctions,
    (fns) => setExpressionFunctions(fns as never),
    { immediate: true }
  )
  onScopeDispose(() => setExpressionFunctions(undefined))

  const renderInner = useRenderSchemaNode(renderOpts)

  // opts 换代计数器 —— 父级替换 props 引用时 bump，让所有 SchemaField 的 render effect 失效重渲
  // B4 修复背景：renderOpts 在 setup 期捕获 props 快照，父级替换引用后渲染绑定静默断裂
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

  function getNames(includesIgnore = false): string[] {
    return [...schemaIndex.getFieldNames(includesIgnore)]
  }

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
