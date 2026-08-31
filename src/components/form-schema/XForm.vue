<script setup lang="ts">
import { computed, ref, watch, type VNode, onScopeDispose, onMounted, useAttrs } from 'vue'
import { get, set } from 'lodash-es'
import { useSchemaRenderer } from './composables/use-schema-renderer'
import { useSchemaIndex } from './composables/use-schema-index'
import { useCurrentBreakpoint } from './composables/use-current-breakpoint'
import { validate } from './composables/use-validate'
import { scanForForbidden } from './composables/use-scan-forbidden'
import { withHidden } from './composables/with-hidden'
import { applyDirectives } from './composables/apply-directives'
import { useFormInstance } from './composables/use-form-instance'
import { useCrossFieldTrigger } from './composables/use-cross-field-trigger'
import { useFormDirty } from './composables/use-form-dirty'
import { useServerError } from './composables/use-server-error'
import { useFormValidation } from './composables/use-form-validation'
import { useTopLevelFields } from './composables/use-top-level-fields'
import { useRenderSchemaNode } from './composables/render-schema-node'
import { resolveFunctionExpression, setExpressionFunctions } from './composables/use-expression'
import type { RenderSchemaNodeOptions } from './composables/render-schema-node'
import { DEFAULT_COMPONENT_MAP, DEFAULT_COMPONENT_PROPS } from './element-plus-adapter'
import { mergeRowResponsive } from './composables/render-schema-node'
import XFormDebugBanner from './XFormDebugBanner.vue'
import SchemaField from './SchemaField.vue'
import 'element-plus/dist/index.css'
import './styles/element-form-overwrite.scss'
import { ElConfigProvider, ElForm, ElRow, ElCol } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import type { SchemaNode, XFormProps, XFormExpose } from './types'

const props = defineProps<XFormProps>()
const attrs = useAttrs()
// XForm 的 template 是 ElConfigProvider + 条件 XFormDebugBanner 两个 root，Vue 3 编译为
// fragment 时父传的 :class 不会自动合并到根 div。关掉默认 fallthrough 后在根 div 显式
// merge attrs.class，使 <XForm class="xxx"> 在所有使用场景都能正常生效
defineOptions({ inheritAttrs: false })
// template 引用：<div :class="[bem.b(), attrs.class]">
// 标注仅供 IDE 索引，模板里的 attrs.class 实际由 Vue template compiler 解析（ts-plugin 不会扫描 template）
const _attrsRef = attrs
void _attrsRef
// ElConfigProvider 默认配置：中文 locale + default 尺寸档
// 业务页中文环境零配置（ElForm / ElPagination / ElDatePicker 等都依赖 locale）
// 业务页若需其他 size（large / small），可在外面再包一层 ElConfigProvider 覆盖
// 类型 as any 原因：element-plus buildProp 类型元组（type/required/validator/__epPropKey）与运行时
// 值类型不直接等价，是 element-plus 类型系统的已知问题（App.vue 也用同样模式）
const elConfig = { locale: zhCn, size: 'default' }
void elConfig
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

// 阶段 3.1：外部字段错误状态（走 element-plus 官方 props.error + props.validateStatus 路径）
// 通过 ref 触发响应式，renderInner 读取后传给 form-item 的 props.error / props.validateStatus
const fieldErrors = ref<Record<string, import('./composables/use-form-instance').FieldErrorState>>(
  {}
)

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

// defaultValue 填充是运行时行为而非调试诊断，必须全环境生效 ——
// 此前它被 showDebugBanner 门控，导致 prod 下 defaultValue 静默失效

if (showDebugBanner.value) {
  watch(
    () => props.schema,
    (val) => {
      const normalized = Array.isArray(val) ? ({ children: val } as SchemaNode) : val
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

// P2-1:响应式断点检测 —— viewport 变化时,响应式 ColConfig 自动拍平
// useSchemaRenderer 内部 watch + 重渲染(整个 form 重新 mount)——简单可靠
// 前置声明：useTopLevelFields 需要 currentBreakpoint 作为 dep
const currentBreakpoint = useCurrentBreakpoint()

const { reactiveSchema, triggerRender } = useSchemaRenderer({
  schema: computed(() => props.schema),
  components: computed(() => props.components) as never,
  formData: computed(() => props.model ?? {}) as never,
})

// 阶段 4.x：schema 元数据中央索引 —— 替代每次遍历 O(n) 的 getNames/collectCrossRuleFields
// - fieldNames / allNames：供 useFormDirty / useServerError 复用 O(1) 查表
// - crossRules：供 useCrossFieldTrigger 拍平使用
// - schema 整体替换时自动重建；局部修改需手动调 reindex()
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
  fieldErrors // 阶段 3.1：传入外部错误状态 ref，setFieldError 走 props 路径
)

function normalizeSchema(val: SchemaNode | SchemaNode[]): SchemaNode {
  return Array.isArray(val) ? ({ children: val } as SchemaNode) : val
}

/** 应用 defaultValue 并同步 ElForm 初始值快照 */
function applyDefaultsAndSync(val: SchemaNode | SchemaNode[]): void {
  const normalized = normalizeSchema(val)
  applyDefaults(normalized, props.model)
  // 关键：子组件 mount 时可能 emit 副作用值（如 ElRate 在 modelValue falsy 时 emit 0），
  // 导致 ElForm 捕获错误的初始值。schema defaultValue 填充后立刻 setInitialValues，
  // 使 resetFields 以 schema 定义的 defaultValue 为准。
  setInitialValues(props.model ?? {})
}

watch(() => props.schema, applyDefaultsAndSync, { immediate: true, deep: true })

onMounted(() => {
  // setup 期 immediate watch 触发时 elFormRef 尚未绑定，mounted 后补同步一次初始值
  applyDefaultsAndSync(props.schema)
})

// 阶段 1.1 + 3.1 修复：反向跨字段实时校验 —— 精确触发
// onValueChange 调用 crossFieldTrigger.trigger(node.name) 只跑 deps 包含该字段的 rule
// 跨字段规则从 schemaIndex.crossRules 拍平传入，schema 变化时自动跟随重建
// 阶段 X.Y：schema.debounceValidation 透传为 defaultDebounceMs，
//   字段级 RuleItem.debounceMs 优先；0 = 实时（默认），>0 = 停止变化 delay ms 后跑一次
// 顶层字段集合（11 个 topLevelXxx computed）抽离到 use-top-level-fields.ts
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
  mergeRowResponsive: (row, bp) => mergeRowResponsive(row, bp as 'xs' | 'sm' | 'md' | 'lg' | 'xl'),
})

const crossFieldTrigger = useCrossFieldTrigger({
  crossRules: () => {
    const out: Array<{ target: string; deps: string[]; rule: import('./types').RuleItem }> = []
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
// fieldNames 直接从 schemaIndex 查表（O(1)），避免每次 model 变化都遍历 schema
const formDirty = useFormDirty({
  model: () => props.model,
  fieldNames: () => schemaIndex.fieldNames.value,
})
// 立即拍基线（model 加载完成即开始追踪，避免"未拍基线 = 全字段 dirty"假象）
formDirty.resetDirty()

// 阶段 3.1：fieldErrors 变化时强制 reactiveSchema 引用变化
// 原因:topLevelNodes computed 依赖 reactiveSchema,只有引用变化才重算
// triggerRef 通知但不修改引用,computed 命中缓存,模板不重渲染
watch(fieldErrors, () => triggerRender(), { deep: true })

// 阶段 2.1：服务端错误适配器
const serverError = useServerError({
  setFieldError: (name, message) => setFieldError(name, message),
  // 用 useFormInstance 返回的 clearValidate（同步清 externalErrors + el-form 内部状态）
  // 不直接用 elFormRef.value.clearValidate —— 它不清 externalErrors，导致 success 后红字残留
  clearValidate,
  knownFields: () => schemaIndex.allNames.value, // 包含 ignore 字段（hidden 字段也可能有后端错误）
})

// 校验编排（useFormValidation）在 topLevelScrollToError 声明之后调用，
// 因为 deps 需要 topLevelScrollToError.value —— TDZ 顺序约束。

/**
 * 校验编排 —— 6 个函数（validateForm / validateDetail / triggerCrossFieldValidator /
 * firstCrossErrorField / applyCrossErrors / scrollToFirstError）抽离到 composables/use-form-validation.ts
 *
 * 行为 100% 等价于原内联实现：
 * - el-form.validate 失败直接 false，跨字段失败时滚动 + setFieldError 红字
 * - 跨字段校验支持异步，序号令牌防竞态（H3）
 * - 公开 API 签名不变
 */
const { validateForm, validateDetail, triggerCrossFieldValidator } = useFormValidation({
  reactiveSchema: computed(() => reactiveSchema.value),
  model: computed(() => props.model),
  rules: computed(() => props.rules),
  elFormRef,
  setFieldError: (name, message) => setFieldError(name, message),
  scrollToField,
  topLevelScrollToError,
  crossFieldTrigger,
})

// P2-1:响应式断点检测 —— viewport 变化时,响应式 ColConfig 自动拍平
// useSchemaRenderer 内部 watch + 重渲染(整个 form 重新 mount)——简单可靠
// 注：currentBreakpoint 已在 setup 顶部前置声明（useTopLevelFields deps 需要）

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

// P2-1:响应式断点检测 —— viewport 变化时,响应式 ColConfig 自动拍平
// 注：currentBreakpoint 已在 setup 顶部前置声明（useTopLevelFields deps 需要）

/** 合并内置默认 props 与用户传入配置：用户按组件名覆盖默认 */
const mergedComponentProps = computed(() => ({
  ...DEFAULT_COMPONENT_PROPS,
  ...props.componentProps,
}))

const renderOpts: RenderSchemaNodeOptions = {
  model: props.model,
  components: props.components,
  beforeChange: props.beforeChange,
  rules: props.rules,
  componentProps: mergedComponentProps.value,
  render: renderToComponent,
  // 阶段 3.1：把 fieldErrors 状态透传给 renderWithFormItem,走 element-plus 官方 props 路径
  externalErrors: () => fieldErrors.value,
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
  // v-model 值变化时的跨字段调度唯一入口是 crossFieldTrigger.trigger（享受 debounceValidation）。
  // 不再调 triggerCrossFieldValidator('change')：它与 ElFormItem 透传的原生 change、
  // debounce 路径三线并行，每键重复执行 crossValidator（实时模式 3 次/键，counter 虚高）
  // + 阶段 3.1：精确触发反向校验（只跑 deps 包含 node.name 的 rules）
  // + 阶段 2.1 修复：用户修改字段值时自动清除该字段的服务端错误（红字），
  //   避免下次 validate() 因残留服务端错误误判失败
  onValueChange: (node, _newValue) => {
    if (node.name) {
      // 先清旧错误（含服务端错误），再触发跨字段校验重新写入新错误。
      // 顺序关键：delay=0（实时模式）下 crossValidator 同步执行，
      // 若先 trigger 后 clearValidate，刚写入的错误会被立即清除，导致 UI 不标红。
      clearValidate([node.name])
      crossFieldTrigger.trigger(node.name)
    }
  },
  // P2-1:响应式断点感知(响应式 ColConfig 拍平)
  currentBreakpoint: currentBreakpoint,
  // P2-1：整体只读开关（顶层 schema readonly）—— permission gate 按 view 态渲染
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

// B4 修复：renderOpts 在 setup 期捕获 props 快照，父级替换引用（model/components/rules 等）
// 后渲染绑定静默断裂 —— render 闭包统一经 opts.xxx 惰性读取，watch 同步最新引用即可
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
    optsEpoch.value++ // props 引用换代（日常输入不触发，字段级重渲隔离不受影响）
  }
)

// getNames 现在直接查 schemaIndex 索引（O(1)），保留函数签名与原行为一致
function getNames(includesIgnore = false): string[] {
  // 返回新数组避免外部修改污染索引引用
  return [...schemaIndex.getFieldNames(includesIgnore)]
}

defineExpose({
  getRef,
  getNames,
  validate: validateForm,
  validateDetail,
  clearValidate,
  resetFields,
  validateField,
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

// 调试钩子(仅 dev) — 通过 window.__xform_debug 直接调 setFieldError 验证 props 路径是否正常
if (import.meta.env.DEV) {
  ;(window as unknown as { __xform_debug?: unknown }).__xform_debug = {
    setFieldError: (name: string, message: string) => setFieldError(name, message),
    getFieldErrors: () => JSON.parse(JSON.stringify(fieldErrors.value)),
    getModel: () => JSON.parse(JSON.stringify(props.model)),
  }
}
</script>

<template>
  <!--
    ElConfigProvider 默认配置：中文 locale + default 尺寸档
    - 业务页中文环境零配置（ElForm / ElPagination / ElDatePicker 等都依赖 locale）
    - 业务页若需其他 size（large / small），可在外面再包一层 ElConfigProvider 覆盖
    - 套用 App.vue 模式：const 中转 + v-bind + as any + eslint-disable-next-line 绕开
      element-plus buildProp 类型元组推断缺陷（详见 const elConfig 注释）
  -->
  <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
  <ElConfigProvider v-bind="elConfig as any">
    <div :class="[bem.b(), attrs.class]">
      <ElForm
        ref="elFormRef"
        :model="(props.model ?? {}) as Record<string, unknown>"
        :validate-trigger="['change', 'blur']"
        :disabled="topLevelDisabled"
        :label-position="topLevelLabelPosition"
        :label-width="topLevelLabelWidth"
        :scroll-to-error="topLevelScrollToError"
        :scroll-into-view-options="topLevelScrollIntoViewOptions"
      >
        <!-- 阶段 2.4 修复：仅当顶层有 column 字段时,外层用 ElRow+ElCol 按 column 自动分配 span -->
        <!-- 否则直接渲染节点（节点的 col.responsive 由内部 wrapWithElCol 响应式拍平） -->
        <!-- 阶段 3.1:fieldErrors 变化时强制重渲染关键 —— 模板必须显式引用 fieldErrors -->
        <!-- triggerRef 通知依赖但不修改引用,computed topLevelNodes 引用未变 → Vue 不会重渲染 -->
        <!-- 显式绑定 fieldErrors 到 DOM 属性让模板建立响应式依赖,触发重渲染 -->
        <div :data-field-errors="Object.keys(fieldErrors).join(',')" style="display: none"></div>
        <ElRow v-if="topLevelColumn" :gutter="(topLevelRow?.gutter ?? 0) as never">
          <ElCol
            v-for="(node, i) in topLevelNodes"
            :key="node.key ?? node.name ?? i"
            :span="topLevelColSpan"
          >
            <SchemaField :node="node" :render-fn="renderToComponent" />
          </ElCol>
        </ElRow>
        <ElRow v-else-if="topLevelRow" :gutter="(topLevelRow?.gutter ?? 0) as never">
          <SchemaField
            v-for="(node, i) in topLevelNodes"
            :key="node.key ?? node.name ?? i"
            :node="node"
            :render-fn="renderToComponent"
          />
        </ElRow>
        <SchemaField
          v-else
          v-for="(node, i) in topLevelNodes"
          :key="node.key ?? node.name ?? i"
          :node="node"
          :render-fn="renderToComponent"
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
