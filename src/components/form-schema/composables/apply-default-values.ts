/**
 * apply-default-values —— defaultValue 运行时填充工具（P0 拆分抽出）
 *
 * 为什么独立成文件：
 * - defaultValue 填充是运行时行为（非 dev 诊断），必须全环境生效 —— 此前被 showDebugBanner
 *   门控，导致 prod 下 defaultValue 静默失效
 * - dev 校验 + 表达式扫描已迁到 use-dev-runtime.ts，本文件只保留 model 填充逻辑
 * - applyDefaultsAndSync 依赖 setInitialValues（来自 useFormInstance），需 caller 注入
 */
import { onMounted, watch } from 'vue'
import { get, set } from 'lodash-es'
import type { SchemaNode, XFormProps } from '../types'

/** 数组 schema → 包 children 形态（统一为根节点） */
export function normalizeSchema(val: SchemaNode | SchemaNode[]): SchemaNode {
  return Array.isArray(val) ? ({ children: val } as SchemaNode) : val
}

/**
 * 递归应用 schema 节点 defaultValue 到 model
 * - 仅在 model 字段未定义时填充（get 返回 undefined 才 set）
 * - lodash get/set 支持嵌套路径（'address.city'）
 * - 跳过 string / undefined / null 节点
 */
export function applyDefaults(
  node: SchemaNode | SchemaNode[] | string | undefined,
  model: Record<string, unknown> | undefined
): void {
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

/**
 * 应用 defaultValue + 同步 ElForm 初始值快照
 * - setup 期 immediate watch 触发时 elFormRef 尚未绑定，mounted 后再补一次
 */
export function applyDefaultsAndSync(
  props: XFormProps,
  val: SchemaNode | SchemaNode[],
  setInitialValues: (initModel: Record<string, unknown>) => void
): void {
  const normalized = normalizeSchema(val)
  applyDefaults(normalized, props.model)
  setInitialValues(props.model ?? {})
}

/**
 * 注册 schema 变化 → applyDefaultsAndSync + mounted 后补同步
 * - 立即执行 + deep watch schema 引用变化
 */
export function useApplyDefaults(
  props: XFormProps,
  setInitialValues: (initModel: Record<string, unknown>) => void
): void {
  watch(
    () => props.schema,
    (val) => applyDefaultsAndSync(props, val, setInitialValues),
    { immediate: true, deep: true }
  )
  onMounted(() => {
    // setup 期 immediate watch 触发时 elFormRef 尚未绑定，mounted 后补同步一次初始值
    applyDefaultsAndSync(props, props.schema, setInitialValues)
  })
}
