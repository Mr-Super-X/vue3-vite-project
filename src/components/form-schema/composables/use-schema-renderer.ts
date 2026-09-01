import { watch, ref, reactive, markRaw, onScopeDispose, type Ref } from 'vue'
import { cloneDeepWith } from 'lodash-es'

/**
 * identity-preserving clone（渲染层重构 B-3）：行为同 cloneDeep，但不深入 component 字段 ——
 * 组件定义对象（options object）被深克隆后身份丢失，Vue 视为不同组件导致整字段 remount；
 * 保持引用后配合顶层稳定 key（B-1），schema 重建时同 key 节点走 patch 而非 remount。
 * 函数（reaction/validator/source）cloneDeep 本就按引用拷贝，无需特殊处理。
 *
 * markRaw 包裹：用户传 component 为 Component 对象（如 `component: ElIcon`）时，
 * 后续 reactive(cloned) 会把组件对象也变 Proxy，触发 Vue 警告
 * "Component that was made a reactive object"。
 * markRaw 排除响应式追踪，保留 Vue 内部组件优化的同时消除警告。
 */
function cloneSchema<T>(value: T): T {
  return cloneDeepWith(value, (val, key) => {
    if (key === 'component' && val !== null && typeof val === 'object') return markRaw(val)
    return undefined // 其余字段走默认深克隆
  })
}
import type { SchemaNode, XFormProps } from '../types'
import { containsReaction, applyReactions } from './use-reaction'
import { useAsyncOptions, resolveAsyncOptionsProp } from './use-async-options'

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
  const asyncStoppers: (() => void)[] = []

  watch(
    () => opts.schema.value,
    (val) => {
      stoppers.forEach((s) => s())
      stoppers.length = 0
      asyncStoppers.forEach((s) => s())
      asyncStoppers.length = 0
      // 数组 schema → 包 children（XForm 不再独立处理 normalize）
      const normalized = Array.isArray(val) ? ({ children: val } as SchemaNode) : val
      const hasRx = containsReaction(normalized)
      const hasAsync = containsAsyncOptions(normalized)
      // 用 reactive 包装 cloned：reaction / asyncOptions 会修改 cloned.ignore / label / props 等内部属性，
      // vue 才能追踪到变化触发模板重渲染（plain object 不响应）
      const cloned = hasRx || hasAsync ? reactive(cloneSchema(normalized)) : cloneSchema(normalized)
      // 注册异步选项 watcher（在 reaction traverse 之前，避免 reaction 覆盖 props）
      registerAsyncOptions(cloned, opts.formData, asyncStoppers)
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
    asyncStoppers.forEach((s) => s())
    asyncStoppers.length = 0
  })

  return {
    reactiveSchema,
    /**
     * 阶段 3.1：强制触发 reactiveSchema 重渲染
     * 关键:不仅 triggerRef 通知依赖,还要**改变 reactiveSchema 引用** —
     * 否则顶层 computed topLevelNodes 重算但返回**同一引用**,Vue 不触发模板重渲染
     * （Vue 3 优化：computed 返回值引用未变时依赖方不重新执行 render）
     */
    triggerRender: () => {
      // 阶段 3.1 调试：标记被调用
      ;(window as unknown as { __triggerRenderCalled?: number }).__triggerRenderCalled =
        ((window as unknown as { __triggerRenderCalled?: number }).__triggerRenderCalled ?? 0) + 1
      reactiveSchema.value = { ...reactiveSchema.value } as SchemaNode | SchemaNode[]
    },
  }
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

/**
 * 注册 schema 中所有异步选项节点
 * - 为每个含 asyncOptions 的节点创建请求状态
 * - 状态变化时同步到 node.props（Select/Cascader → options；TreeSelect → data；loading → loading）
 * - 返回的 stop 函数由调用方在 schema 变化/组件卸载时统一调用
 */
function registerAsyncOptions(
  node: SchemaNode | SchemaNode[],
  model: Ref<Record<string, unknown>>,
  stoppers: (() => void)[]
): void {
  if (Array.isArray(node)) {
    node.forEach((n) => registerAsyncOptions(n, model, stoppers))
    return
  }
  if (node.asyncOptions) {
    const state = useAsyncOptions(node, model)
    stoppers.push(state.stop)
    const stopState = watch(
      () => [state.data.value, state.loading.value],
      () => {
        const targetProp = resolveAsyncOptionsProp(node)
        node.props = { ...(node.props ?? {}), loading: state.loading.value }
        if (targetProp) {
          node.props = { ...node.props, [targetProp]: state.data.value }
        }
      },
      { immediate: true, deep: true }
    )
    stoppers.push(stopState)
  }
  if (node.children) {
    if (Array.isArray(node.children)) {
      registerAsyncOptions(node.children, model, stoppers)
    } else if (typeof node.children === 'object') {
      registerAsyncOptions(node.children, model, stoppers)
    }
  }
  if (node.slots) {
    for (const slot of Object.values(node.slots)) {
      if (typeof slot === 'function') continue
      if (slot && typeof slot === 'object' && !Array.isArray(slot)) {
        registerAsyncOptions(slot, model, stoppers)
      } else if (Array.isArray(slot)) {
        slot.forEach((s) => registerAsyncOptions(s, model, stoppers))
      }
    }
  }
}

/** 检查 schema 中是否含 asyncOptions 字段（含字段时才需启用 reactive） */
function containsAsyncOptions(node: SchemaNode | SchemaNode[]): boolean {
  let found = false
  traverse(node)
  return found

  function traverse(n: unknown): void {
    if (found || n === null || typeof n !== 'object') return
    const o = n as Record<string, unknown>
    if (o.asyncOptions) {
      found = true
      return
    }
    if (Array.isArray(o.children)) o.children.forEach(traverse)
    else if (o.children && typeof o.children === 'object') traverse(o.children)
    if (o.slots && typeof o.slots === 'object') {
      for (const slot of Object.values(o.slots as Record<string, unknown>)) {
        if (typeof slot === 'function') continue
        traverse(slot)
      }
    }
    if (o.formItem && typeof o.formItem === 'object') {
      const fi = o.formItem as Record<string, unknown>
      if (fi.slots && typeof fi.slots === 'object') {
        for (const slot of Object.values(fi.slots as Record<string, unknown>)) {
          if (typeof slot === 'function') continue
          traverse(slot)
        }
      }
    }
    // 数组节点（kind: 'array'）：递归遍历 itemSchema 子树
    if (o.kind === 'array' && o.array && typeof o.array === 'object') {
      const itemSchema = (o.array as Record<string, unknown>).itemSchema
      traverse(itemSchema)
    }
  }
}
