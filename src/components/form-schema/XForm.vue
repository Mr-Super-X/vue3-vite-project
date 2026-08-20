<script setup lang="ts">
import { h, computed, watch, resolveComponent, type VNode } from 'vue'
// element-plus CSS（直接 import 绕过了 unplugin-vue-components 的 CSS 自动注入）
import 'element-plus/dist/index.css'
import {
  ElConfigProvider,
  ElForm,
  ElFormItem,
  ElRow,
  ElCol,
  ElCard,
  ElInput,
  ElSelect,
  ElOption,
  ElSwitch,
  ElDatePicker,
  ElRadioGroup,
  ElRadio,
  ElCheckboxGroup,
  ElCheckbox,
  ElCascader,
  ElInputNumber,
  ElSlider,
} from 'element-plus'
import type { SchemaNode, XFormProps, XFormExpose } from './types'
import { useSchemaRenderer } from './composables/use-schema-renderer'
import { validate } from './composables/use-validate'
import { scanForForbidden } from './composables/use-scan-forbidden'
import { renderToComponentWithGrid } from './composables/render-with-grid'
import { useFormInstance } from './composables/use-form-instance'
import { buildVModelBindings } from './composables/build-vmodel-bindings'
import { buildOnBindings } from './composables/build-on-bindings'
import { withHidden } from './composables/with-hidden'
import { applyDirectives } from './composables/apply-directives'

const props = defineProps<XFormProps>()
const bem = createNamespace('x-form')

if (import.meta.env.DEV) {
  watch(
    () => props.schema,
    (val) => {
      const normalized = Array.isArray(val) ? ({ children: val } as SchemaNode) : val
      const { isValid, errors } = validate(normalized)
      if (!isValid) console.error('[XForm] schema validation failed:', errors)
      const forbidden = scanForForbidden(normalized)
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
} = useFormInstance(
  () => props.model,
  () => props.zodSchema
)

// 顶层节点列表：直接从 reactiveSchema 派生（含 reaction 修改后能触发重渲染）
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

// schema 字符串快捷名 → Element Plus 组件对象映射（直接 import，h() 渲染无需全局注册）
const EL_COMPONENT_MAP: Record<string, unknown> = {
  Input: ElInput,
  Select: ElSelect,
  Option: ElOption,
  Switch: ElSwitch,
  DatePicker: ElDatePicker,
  RadioGroup: ElRadioGroup,
  Radio: ElRadio,
  CheckboxGroup: ElCheckboxGroup,
  Checkbox: ElCheckbox,
  Cascader: ElCascader,
  InputNumber: ElInputNumber,
  Slider: ElSlider,
  Card: ElCard,
  FormItem: ElFormItem,
  Form: ElForm,
}

function resolveComponentFor(name: string | undefined, userComponents?: Record<string, unknown>) {
  if (!name) return null
  if (userComponents && name in userComponents) return userComponents[name]
  if (name in EL_COMPONENT_MAP) return EL_COMPONENT_MAP[name] ?? null
  if (name.startsWith('El') && name.length > 2) {
    const short = name[2]!.toUpperCase() + name.slice(3)
    if (short in EL_COMPONENT_MAP) return EL_COMPONENT_MAP[short] ?? null
  }
  if (name.startsWith('El')) {
    try {
      const resolved = resolveComponent(name)
      if (typeof resolved !== 'string') return resolved
    } catch {
      /* fallthrough */
    }
  }
  return null
}

function compileRules(rules: SchemaNode['rules']): Array<Record<string, unknown>> {
  if (!rules) return []
  return (Array.isArray(rules) ? rules : [rules])
    .map((r) =>
      typeof r === 'string'
        ? (props.rules?.[r] ?? { required: true })
        : (r as Record<string, unknown>)
    )
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
}

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

function renderChildren(children: SchemaNode['children']): VNode | string | VNode[] | undefined {
  if (children === undefined) return undefined
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(renderToComponent) as VNode[]
  return renderToComponent(children)
}

/** node.col 栅格包装：col:false → 不包；col:{span:24} → ElCol span=24 */
function wrapWithElCol(node: SchemaNode, inner: VNode): VNode {
  if (node.col === false) return inner
  if (node.col === undefined) return inner
  const span = node.col && typeof node.col === 'object' ? (node.col.span ?? 24) : 24
  const offset = node.col && typeof node.col === 'object' ? node.col.offset : undefined
  return h(ElCol as never, { span, offset } as never, { default: () => inner }) as VNode
}

function renderToComponent(
  node: SchemaNode | SchemaNode[] | string | undefined | null
): VNode | string | VNode[] | undefined {
  if (node === null || node === undefined) return undefined
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(renderToComponent) as VNode[]
  if (node.ignore) return undefined

  // hidden: 与 ignore 区分——hidden 创建节点但 display:none
  if (node.hidden) {
    const inner = renderToComponentInner(node)
    if (inner && typeof inner !== 'string' && !Array.isArray(inner)) {
      return withHidden(inner)
    }
  }

  const result = renderToComponentInner(node)
  if (!result || typeof result === 'string' || Array.isArray(result)) return result as never
  return applyDirectives(result, node.directives)
}

function renderToComponentInner(node: SchemaNode): VNode | string | VNode[] | undefined {
  const Comp = resolveComponentFor(node.component, props.components)
  const eventBindings = {
    ...buildVModelBindings(node, props.model, props.beforeChange),
    ...buildOnBindings(node, props.model),
  }
  // 视觉容器（Card 等）：有 slots/children 但无 name → 用组件容器包 slots + default
  if (Comp && (node.slots || node.children !== undefined) && !node.name) {
    const slotMap: Record<string, () => unknown> = {}
    if (node.slots)
      for (const [k, v] of Object.entries(node.slots))
        slotMap[k] = () => renderToComponent(v as never)
    const useGrid = !!(node.row || node.column !== undefined)
    slotMap.default = useGrid
      ? () => renderToComponentWithGrid(node, renderToComponent)
      : () => renderToComponent(node.children as never) as never
    return h(
      Comp as never,
      { ...node.props, ...(node.key !== undefined && { key: node.key }) } as never,
      slotMap
    ) as never
  }
  const wrapWithFormItem =
    (node.name !== undefined && node.formItem !== false) || node.formItem === true
  if (wrapWithFormItem) {
    return h(
      ElFormItem as never,
      {
        label: node.label,
        prop: node.name,
        rules: compileRules(node.rules) as never,
        ...(node.name || node.key ? { key: `fi-${node.name ?? node.key}` } : {}),
      } as never,
      Comp
        ? {
            default: () => {
              const inner = h(
                Comp as never,
                {
                  ...eventBindings,
                  ...node.props,
                  ...(node.key !== undefined && { key: node.key }),
                } as never,
                { default: () => renderChildren(node.children) as never }
              )
              return wrapWithElCol(node, inner)
            },
          }
        : undefined
    ) as never
  }
  if (node.row || node.column !== undefined) {
    const colSpan =
      node.col && typeof node.col === 'object'
        ? node.col.span
        : node.column
          ? Math.floor(24 / node.column)
          : 24
    return h(
      ElRow as never,
      { ...node.row, ...(node.key !== undefined && { key: node.key }) } as never,
      {
        default: () =>
          h(
            ElCol as never,
            { span: colSpan, ...(node.key !== undefined && { key: node.key }) } as never,
            {
              default: () => renderToComponent(node.children as never),
            }
          ),
      }
    ) as never
  }
  if (!Comp) return undefined
  return wrapWithElCol(
    node,
    h(
      Comp as never,
      {
        ...eventBindings,
        ...node.props,
        ...(node.key !== undefined && { key: node.key }),
      } as never,
      { default: () => renderChildren(node.children) as never }
    ) as VNode
  )
}

defineExpose({
  getRef,
  getNames,
  validate: validateForm,
  clearValidate,
  resetFields,
  scrollToField,
  validateWithZod: validateFormWithZod,
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
</template>

<style lang="scss">
.#{$BEM_PREFIX}-x-form {
}
</style>
