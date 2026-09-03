/**
 * useXFormComposer —— XForm 顶层编排（composition root）
 *
 * 负责装配 11 个 composable + 渲染根闭包（renderToComponent）。
 * 子编排已抽离：渲染根→./use-render-root、dev 校验→./use-dev-runtime、
 * defaultValue→./apply-default-values、XFormExpose→./use-xform-expose。
 *
 * 类型断言（`as never`）归因见 types/TYPE-CAST-AUDIT.md。
 */
import { computed, onScopeDispose, watch, type ComputedRef, type Ref } from 'vue'

import { useSchemaRenderer } from './use-schema-renderer'
import { useSchemaIndex } from './use-schema-index'
import { useFormErrorBus } from './use-form-error-bus'
import { useCurrentBreakpoint } from './use-current-breakpoint'
import { useFormInstance, type FieldErrorState } from './use-form-instance'
import { useCrossFieldTrigger } from './use-cross-field-trigger'
import { useFormDirty } from './use-form-dirty'
import { useServerError } from './use-server-error'
import { useFormValidation } from './use-form-validation'
import { useTopLevelFields } from './use-top-level-fields'
import { resolveFunctionExpression, setExpressionFunctions } from './use-expression'
import { useDevRuntime } from './use-dev-runtime'
import { useApplyDefaults } from './apply-default-values'
import { useXFormExpose } from './use-xform-expose'
import { useRenderRoot, type RenderFn } from './use-render-root'
import { mergeRowResponsive } from './render-schema-node'
import { DEFAULT_COMPONENT_PROPS } from '../element-plus-adapter'
import type { RuleItem, RowConfig, SchemaNode, XFormExpose, XFormProps } from '../types'

// ────────────────────────────────────────────────────────────────────────────
// 公共类型
// ────────────────────────────────────────────────────────────────────────────

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

  // viewport 变化时响应式 ColConfig 自动拍平
  const currentBreakpoint = useCurrentBreakpoint()

  const { reactiveSchema, triggerRender } = useSchemaRenderer({
    schema: computed(() => props.schema),
    components: computed(() => props.components) as never,
    formData: computed(() => props.model ?? {}) as never,
    // 阶段 P2-3：reactionBudget 透传（默认 50 向后兼容）
    ...(props.reactionBudget !== undefined ? { reactionBudget: props.reactionBudget } : {}),
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
    externalErrors: fieldErrors,
  } = useFormInstance(
    () => props.model,
    () => props.zodSchema,
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
    setFieldError,
    clearValidate,
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
    setFieldError,
    clearValidate,
    knownFields: () => schemaIndex.allNames.value,
  })

  // 校验编排
  const { validateForm, validateDetail, triggerCrossFieldValidator } = useFormValidation({
    reactiveSchema: computed(() => reactiveSchema.value),
    model: computed(() => props.model),
    rules: computed(() => props.rules),
    elFormRef,
    setFieldError,
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
    setFieldError,
    fieldErrors,
  })

  /** 节点渲染（外层：hidden / directives 包装） —— 由 useRenderRoot 维护 */
  const { renderToComponent } = useRenderRoot({
    props,
    fieldErrors,
    getExposed: () => exposed,
    clearValidate,
    elFormRef,
    errorBus,
    crossFieldTrigger,
    triggerCrossFieldValidator,
    arrayActions: { addItem, removeItem, moveItem },
    currentBreakpoint,
    topLevelReadonly,
    mergedComponentProps,
  })

  // 白名单函数表注册（模块级，scope 销毁时清空避免跨实例污染）
  watch(
    () => props.expressionFunctions,
    (fns) => setExpressionFunctions(fns as never),
    { immediate: true }
  )
  onScopeDispose(() => setExpressionFunctions(undefined))

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
