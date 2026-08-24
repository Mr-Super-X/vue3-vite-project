<script setup lang="ts">
import { computed, ref, watch, type VNode } from 'vue'
import { get, set } from 'lodash-es'
import { useSchemaRenderer } from './composables/use-schema-renderer'
import { useCurrentBreakpoint } from './composables/use-current-breakpoint'
import { validate, runCrossFieldValidation } from './composables/use-validate'
import { scanForForbidden } from './composables/use-scan-forbidden'
import { withHidden } from './composables/with-hidden'
import { applyDirectives } from './composables/apply-directives'
import { useFormInstance } from './composables/use-form-instance'
import { useCrossFieldTrigger } from './composables/use-cross-field-trigger'
import { useFormDirty } from './composables/use-form-dirty'
import { useServerError } from './composables/use-server-error'
import { useRenderSchemaNode } from './composables/render-schema-node'
import { matchTrigger } from './composables/match-trigger'
import { DEFAULT_COMPONENT_MAP, DEFAULT_COMPONENT_PROPS } from './element-plus-adapter'
import { mergeRowResponsive } from './composables/render-schema-node'
import XFormDebugBanner from './XFormDebugBanner.vue'
import type { ValidateResult } from './types'
import 'element-plus/dist/index.css'
import './styles/element-form-overwrite.scss'
import { ElConfigProvider, ElForm, ElRow, ElCol } from 'element-plus'
import type { SchemaNode, XFormProps, XFormExpose, RuleItem } from './types'

const props = defineProps<XFormProps>()
const bem = createNamespace('x-form')

// 阶段 1.2：model 缺时 dev mode 警告（提醒用户补传 reactive model）
// 仅 DEV 触发，prod tree-shake 后零运行时开销
if (import.meta.env.DEV) {
  if (props.model === undefined) {
    console.warn(
      '[XForm] model prop 未传入。校验、默认值填充、reaction、dirty 追踪均不会生效。' +
        '请传入 reactive() 包装的对象：const form = reactive({...})'
    )
  }
}

// Dev-only 错误状态（暴露给 XFormDebugBanner）
const validateErrors = ref<Array<{ keyPath: (string | number)[]; message: string }>>([])
const forbiddenErrors = ref<string[]>([])
const showDebugBanner = ref(import.meta.env.DEV)

/** 应用 schema 节点 defaultValue 到 model（仅在 model 字段未定义时填充） */
function applyDefaults(
  node: SchemaNode | SchemaNode[] | string | undefined,
  model: Record<string, unknown> | undefined
) {
  if (!model) return
  if (typeof node === 'string' || node === undefined || node === null) return
  if (Array.isArray(node)) {
    node.forEach((n) => applyDefaults(n, model))
    return
  }
  if (
    node.name !== undefined &&
    node.defaultValue !== undefined &&
    get(model, node.name) === undefined
  ) {
    set(model, node.name, node.defaultValue)
  }
  if (node.children) applyDefaults(node.children, model)
}

if (showDebugBanner.value) {
  watch(
    () => props.schema,
    (val) => {
      const normalized = Array.isArray(val) ? ({ children: val } as SchemaNode) : val
      applyDefaults(normalized, props.model)
      // 阶段 1.3：组件名校验 —— 短名 + ElXxx 全名 + userComponents 三类必须命中其一
      const { isValid, errors } = validate(normalized, {
        knownComponents: {
          builtin: new Set(Object.keys(DEFAULT_COMPONENT_MAP)),
          user: new Set(Object.keys(props.components ?? {})),
        },
      })
      validateErrors.value = isValid ? [] : errors
      if (!isValid) console.error('[XForm] schema validation failed:', errors)
      const forbidden = scanForForbidden(normalized)
      forbiddenErrors.value = forbidden
      if (forbidden.length > 0) {
        console.error('[XForm][SECURITY] forbidden identifiers in expressions:', forbidden)
      }
    },
    { immediate: true, deep: true }
  )
}

const { reactiveSchema } = useSchemaRenderer({
  schema: computed(() => props.schema),
  components: computed(() => props.components) as never,
  formData: computed(() => props.model ?? {}) as never,
})

const {
  elFormRef,
  getRef,
  clearValidate,
  resetFields,
  scrollToField,
  validateFormWithZod,
  addItem,
  removeItem,
  moveItem,
  setFieldError,
  setFieldValidating,
} = useFormInstance(
  () => props.model,
  () => props.zodSchema
)

// 阶段 1.1：反向跨字段实时校验 —— 任一字段变化 → 找出依赖它的 cross rules → 重跑写错误到目标字段
// 关键修复：通过 el-form.clearValidate([prop]) 走官方清错流程，避开 element-plus 2.x shallowRef 陷阱
useCrossFieldTrigger({
  schema: () => props.schema,
  model: () => props.model,
  setFieldError: (name, message) => setFieldError(name, message),
  clearValidate: (names: string[]) => elFormRef.value?.clearValidate?.(names),
})

// 阶段 2.2：dirty 状态追踪
// fieldNames 由 XForm 内置的 getNames() 提供（已遍历 schema 收集所有 name + key）
const formDirty = useFormDirty({
  model: () => props.model,
  fieldNames: () => getNames(false), // 排除 ignore 字段
})
// 立即拍基线（model 加载完成即开始追踪，避免"未拍基线 = 全字段 dirty"假象）
formDirty.resetDirty()

// 阶段 2.1：服务端错误适配器
const serverError = useServerError({
  setFieldError: (name, message) => setFieldError(name, message),
  clearValidate: (names) => elFormRef.value?.clearValidate?.(names),
  knownFields: () => getNames(true), // 包含 ignore 字段（hidden 字段也可能有后端错误）
})

/**
 * XForm 校验入口：先跑 el-form 字段内规则（失败直接 false），成功后跑跨字段校验
 * - 跨字段校验失败时把错误写入对应 form-item（用户在 UI 看到）
 * - 跨字段校验支持异步：crossValidator 返回 Promise<true | string> 时会自动 await
 * - 跨字段失败同时 console.error 列出所有错误 keyPath + message,便于调试
 * - el-form 未挂载时降级只跑跨字段校验（开发场景）
 */
async function validateForm(): Promise<boolean> {
  const m = props.model
  if (!m) return true
  const ef = elFormRef.value
  if (!ef?.validate) {
    const result = await runCrossFieldValidation(props.schema, m)
    applyCrossErrors(result)
    return result.isValid
  }
  // 等待 el-form 字段内规则校验完成（element-plus 2.x validate 接受 callback）
  const efValidate = ef.validate
  if (!efValidate) {
    const result = await runCrossFieldValidation(props.schema, m)
    applyCrossErrors(result)
    return result.isValid
  }
  const elValid = await new Promise<boolean>((resolve) => {
    const maybePromise = efValidate((v: boolean) => resolve(v))
    // 处理 el-form 2.x 即使传 callback 仍 reject errorsMap 的情况(避免 unhandled rejection)
    Promise.resolve(maybePromise).catch(() => resolve(false))
  })
  if (!elValid) return false
  // 跑跨字段校验（可能含异步 crossValidator）
  const result = await runCrossFieldValidation(props.schema, m)
  applyCrossErrors(result)
  return result.isValid
}

/** 把跨字段校验失败的错误写入对应 el-form-item（用户在 UI 看到），并 console.error 列出全部 */
function applyCrossErrors(result: ValidateResult): void {
  if (result.isValid) return
  for (const err of result.errors) {
    const fieldPath = err.keyPath[err.keyPath.length - 1]
    if (typeof fieldPath === 'string') setFieldError(fieldPath, err.message)
  }
  console.error('[XForm] cross field validation failed:', result.errors)
}

/** 详细校验：异步返回跨字段校验结果（含异步 crossValidator 等待） */
async function validateDetail(): Promise<ValidateResult> {
  const m = props.model
  if (!m) return { isValid: true, errors: [] }
  return runCrossFieldValidation(props.schema, m)
}

/**
 * 字段事件触发跨字段校验 —— 让 crossValidator 响应 trigger 配置
 * - 遍历当前字段 rules,提取 dependsOn + crossValidator + trigger 配置
 * - 检查 rule.trigger 与当前事件类型是否匹配:
 *   - rule.trigger === eventType(blur/change)→ 跑该 rule
 *   - rule.trigger 是数组包含 eventType → 跑该 rule
 *   - rule.trigger 未指定 → 默认响应 blur(向后兼容现有 schema)
 *   - rule.trigger 是 'manual' → 永远不响应 blur/change(只在 validateForm 时跑)
 * - 跑 crossValidator(支持同步/异步)
 * - 成功 → 清掉之前可能的红字
 * - 失败 → setFieldError 红字提示
 * - 跳过空值字段(空值交给普通 required 校验处理)
 */
async function triggerCrossFieldValidator(
  node: SchemaNode,
  eventType: 'blur' | 'change'
): Promise<void> {
  if (!node.name || !node.rules) return
  const m = props.model
  if (!m) return
  const rules = Array.isArray(node.rules) ? node.rules : [node.rules]
  const currentValue = get(m, node.name)
  // 空值跳过 cross 校验(留给 required / type 规则)
  if (currentValue === '' || currentValue === undefined || currentValue === null) return
  for (const r of rules) {
    if (typeof r !== 'object' || r === null) continue
    const rule = r as RuleItem
    if (!rule.crossValidator || !rule.dependsOn) continue
    // trigger 字段过滤
    if (!matchTrigger(rule.trigger, eventType)) continue
    const depsList = (Array.isArray(rule.dependsOn) ? rule.dependsOn : [rule.dependsOn]).map(
      (dep: string) => get(m, dep)
    )
    let result: true | string
    try {
      result = await Promise.resolve(rule.crossValidator(currentValue, ...depsList))
    } catch (err) {
      console.error('[XForm] crossValidator blur trigger threw:', err)
      continue
    }
    if (result === true) {
      setFieldError(node.name, '', '')
    } else {
      setFieldError(node.name, result)
    }
  }
}

/**
 * 判断 rule.trigger 是否匹配当前事件类型 —— 已抽到 ./composables/match-trigger.ts 便于单测
 * (XForm.vue SFC 无法 export,直接 import 复用)
 */

// 顶层节点列表（直接从 reactiveSchema 派生，含 reaction 修改后能触发重渲染）
const topLevelNodes = computed<SchemaNode[]>(() => {
  const s = reactiveSchema.value
  if (Array.isArray(s)) return s as SchemaNode[]
  if (s.children !== undefined)
    return (Array.isArray(s.children) ? s.children : [s.children]) as SchemaNode[]
  return [s]
})

const topLevelRow = computed(() => {
  const s = reactiveSchema.value
  if (Array.isArray(s) || s.children === undefined) return undefined
  // 阶段 2.4：row.responsive 拍平 —— 当前断点的 gutter/type/align/justify 覆盖基础配置
  return mergeRowResponsive(s.row, currentBreakpoint.value)
})
const topLevelColumn = computed(() => {
  const s = reactiveSchema.value
  if (Array.isArray(s) || s.children === undefined) return undefined
  return s.column
})
const topLevelColSpan = computed(() =>
  topLevelColumn.value ? Math.floor(24 / topLevelColumn.value) : 24
)
// 阶段 2.4 增强:顶层 schema 自描述 labelPosition（从 schema 顶层字段读取,而非 XForm props）
const topLevelLabelPosition = computed<'left' | 'right' | 'top'>(() => {
  const s = reactiveSchema.value
  if (Array.isArray(s) || s.children === undefined) return 'left'
  return s.labelPosition ?? 'left'
})

/** 节点渲染（外层：hidden / directives 包装） */
function renderToComponent(
  node: SchemaNode | SchemaNode[] | string | undefined | null
): VNode | string | VNode[] | undefined {
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

// P2-1:响应式断点检测 —— viewport 变化时,响应式 ColConfig 自动拍平
// useSchemaRenderer 内部 watch + 重渲染(整个 form 重新 mount)——简单可靠
const currentBreakpoint = useCurrentBreakpoint()

/** 合并内置默认 props 与用户传入配置：用户按组件名覆盖默认 */
const mergedComponentProps = computed(() => ({
  ...DEFAULT_COMPONENT_PROPS,
  ...props.componentProps,
}))

const renderInner = useRenderSchemaNode({
  model: props.model,
  components: props.components,
  beforeChange: props.beforeChange,
  rules: props.rules,
  componentProps: mergedComponentProps.value,
  render: renderToComponent,
  arrayActions: {
    addItem: (name: string, init?: Record<string, unknown>) => addItem(name, init),
    removeItem: (name: string, index: number) => removeItem(name, index),
    moveItem: (name: string, from: number, to: number) => moveItem(name, from, to),
  },
  // 字段事件触发 cross rules —— 让 crossValidator 响应 trigger 配置
  triggerCrossFieldValidator: (node, eventType) => triggerCrossFieldValidator(node, eventType),
  // 触发 el-form 字段内 async-validator 校验 —— 覆盖 formItem onBlur 后必须手动调用
  validateField: async (name: string) => {
    try {
      await elFormRef.value?.validateField?.(name)
    } catch {
      /* silent — 校验失败时错误已写入 form-item */
    }
  },
  // v-model 值变化时主动调 triggerCrossFieldValidator(eventType='change')
  // 绕过 watch 不可靠问题(vue Proxy track  + watch getter 依赖追踪的陷阱)
  onValueChange: (node, _newValue) => {
    triggerCrossFieldValidator(node, 'change')
  },
  // P2-1:响应式断点感知(响应式 ColConfig 拍平)
  currentBreakpoint: currentBreakpoint,
})

function getNames(includesIgnore = false): string[] {
  const names: string[] = []
  visit(reactiveSchema.value)
  function visit(n: SchemaNode | SchemaNode[] | string): void {
    if (typeof n === 'string') return
    if (Array.isArray(n)) {
      n.forEach(visit)
      return
    }
    if (!includesIgnore && n.ignore) return
    if (n.name) names.push(n.name)
    else if (n.key) names.push(String(n.key))
    if (Array.isArray(n.children)) n.children.forEach(visit)
    else if (typeof n.children === 'object') visit(n.children as SchemaNode)
  }
  return names
}

defineExpose({
  getRef,
  getNames,
  validate: validateForm,
  validateDetail,
  clearValidate,
  resetFields,
  scrollToField,
  validateWithZod: validateFormWithZod,
  setFieldError,
  setFieldValidating,
  addItem,
  removeItem,
  moveItem,
  isDirty: formDirty.isDirty,
  getDirtyFields: formDirty.getDirtyFields,
  isTouched: formDirty.isTouched,
  resetDirty: formDirty.resetDirty,
  validateFromServer: serverError.validateFromServer,
} satisfies XFormExpose)
</script>

<template>
  <ElConfigProvider>
    <div :class="bem.b()">
      <ElForm
        ref="elFormRef"
        :model="(props.model ?? {}) as Record<string, unknown>"
        :validate-trigger="['change', 'blur']"
        :label-position="topLevelLabelPosition"
      >
        <!-- 阶段 2.4 修复：仅当顶层有 column 字段时,外层用 ElRow+ElCol 按 column 自动分配 span -->
        <!-- 否则直接渲染节点（节点的 col.responsive 由内部 wrapWithElCol 响应式拍平） -->
        <ElRow v-if="topLevelColumn" :gutter="(topLevelRow?.gutter ?? 0) as never">
          <ElCol v-for="(node, i) in topLevelNodes" :key="i" :span="topLevelColSpan">
            <component :is="renderToComponent(node)" />
          </ElCol>
        </ElRow>
        <ElRow v-else-if="topLevelRow" :gutter="(topLevelRow?.gutter ?? 0) as never">
          <component v-for="(node, i) in topLevelNodes" :key="i" :is="renderToComponent(node)" />
        </ElRow>
        <component
          v-else
          v-for="(node, i) in topLevelNodes"
          :key="i"
          :is="renderToComponent(node)"
        />
      </ElForm>
    </div>
  </ElConfigProvider>
  <XFormDebugBanner
    v-if="showDebugBanner"
    :validate-errors="validateErrors"
    :forbidden-errors="forbiddenErrors"
  />
</template>

<style lang="scss">
.#{$BEM_PREFIX}-x-form {
}
</style>
