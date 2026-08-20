import { watch, ref, reactive, onScopeDispose, type Ref } from 'vue'
import { cloneDeep } from 'lodash-es'
import type { SchemaNode, XFormProps } from '../types'
import { containsReaction, applyReactions } from './use-reaction'

interface UseSchemaRendererOptions {
  schema: Ref<SchemaNode | SchemaNode[]>
  components: Ref<Record<string, unknown> | undefined>
  formData: Ref<Record<string, unknown>>
  beforeChange?: XFormProps['beforeChange']
}

/**
 * 核心编排 composable
 * - watch(schema, deep)：schema 变化时按需克隆 + 注册 reaction watchEffect
 * - onScopeDispose：卸载时清理所有 watchEffect
 */
export function useSchemaRenderer(opts: UseSchemaRendererOptions) {
  // 用 ref 而非 shallowRef：reaction watchEffect 会修改 cloned schema 内部属性（如 node.ignore）
  // shallowRef 不深度响应，修改内部属性不会触发模板重渲染
  const reactiveSchema = ref<SchemaNode | SchemaNode[]>({})
  const stoppers: (() => void)[] = []

  watch(
    () => opts.schema.value,
    (val) => {
      stoppers.forEach((s) => s())
      stoppers.length = 0
      // 数组 schema → 包 children（XForm 不再独立处理 normalize）
      const normalized = Array.isArray(val) ? ({ children: val } as SchemaNode) : val
      const hasRx = containsReaction(normalized)
      // 用 reactive 包装 cloned：reaction watchEffect 修改 cloned.ignore / label / props 等内部属性时
      // vue 才能追踪到变化触发模板重渲染（plain object 不响应）
      const cloned = hasRx ? reactive(cloneDeep(normalized)) : normalized
      if (hasRx) {
        traverse(cloned as SchemaNode, opts.formData.value, stoppers)
      }
      reactiveSchema.value = cloned
    },
    { immediate: true, deep: true }
  )

  onScopeDispose(() => {
    stoppers.forEach((s) => s())
    stoppers.length = 0
  })

  return { reactiveSchema }
}

function traverse(
  node: SchemaNode | SchemaNode[],
  model: Record<string, unknown>,
  stoppers: (() => void)[]
): void {
  if (Array.isArray(node)) {
    node.forEach((n) => traverse(n, model, stoppers))
    return
  }
  applyReactions(node, model, stoppers)
}
