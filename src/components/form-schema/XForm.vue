<script setup lang="ts">
import { computed, ref, watch, type VNode } from 'vue'
import { get, set } from 'lodash-es'
import 'element-plus/dist/index.css'
import { ElConfigProvider, ElForm, ElRow, ElCol } from 'element-plus'
import type { SchemaNode, XFormProps, XFormExpose } from './types'
import { useSchemaRenderer } from './composables/use-schema-renderer'
import { validate } from './composables/use-validate'
import { scanForForbidden } from './composables/use-scan-forbidden'
import { withHidden } from './composables/with-hidden'
import { applyDirectives } from './composables/apply-directives'
import { useFormInstance } from './composables/use-form-instance'
import { useRenderSchemaNode } from './composables/render-schema-node'
import XFormDebugBanner from './XFormDebugBanner.vue'

const props = defineProps<XFormProps>()
const bem = createNamespace('x-form')

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
      const { isValid, errors } = validate(normalized)
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
  validateForm,
  clearValidate,
  resetFields,
  scrollToField,
  validateFormWithZod,
  addItem,
  removeItem,
  moveItem,
} = useFormInstance(
  () => props.model,
  () => props.zodSchema
)

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
  return s.row
})
const topLevelColumn = computed(() => {
  const s = reactiveSchema.value
  if (Array.isArray(s) || s.children === undefined) return undefined
  return s.column
})
const topLevelColSpan = computed(() =>
  topLevelColumn.value ? Math.floor(24 / topLevelColumn.value) : 24
)

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

const renderInner = useRenderSchemaNode({
  model: props.model,
  components: props.components,
  beforeChange: props.beforeChange,
  rules: props.rules,
  render: renderToComponent,
  arrayActions: {
    addItem: (name: string, init?: Record<string, unknown>) => addItem(name, init),
    removeItem: (name: string, index: number) => removeItem(name, index),
    moveItem: (name: string, from: number, to: number) => moveItem(name, from, to),
  },
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
  clearValidate,
  resetFields,
  scrollToField,
  validateWithZod: validateFormWithZod,
  addItem,
  removeItem,
  moveItem,
} satisfies XFormExpose)
</script>

<template>
  <ElConfigProvider>
    <div :class="bem.b()">
      <ElForm ref="elFormRef" :model="(props.model ?? {}) as Record<string, unknown>">
        <ElRow v-if="topLevelRow || topLevelColumn" :gutter="(topLevelRow?.gutter ?? 0) as never">
          <ElCol v-for="(node, i) in topLevelNodes" :key="i" :span="topLevelColSpan">
            <component :is="renderToComponent(node)" />
          </ElCol>
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
