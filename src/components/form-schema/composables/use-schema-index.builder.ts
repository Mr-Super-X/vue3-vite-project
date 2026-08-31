/**
 * useSchemaIndex 的纯函数 builder
 * - 一次性遍历 schema，构建 byName / fieldNames / allNames / crossRules / reverseIndex / dependsOnMap
 * - DFS 顺序与现有 getNames() 保持一致（先父后子、子按出现顺序）
 * - cross rules 提取覆盖 children / array.itemSchema / formItem.slots（与 collectCrossRuleFields 对齐）
 * - trigger=manual 的规则不进入 reverseIndex（仅 validateForm 跑）
 */
import type { SchemaNode, RuleItem } from '../types'

export interface SchemaIndex {
  byName: Map<string, SchemaNode>
  /** 不含 ignore，DFS 顺序 */
  fieldNames: readonly string[]
  /** 含 ignore，DFS 顺序 */
  allNames: readonly string[]
  /** target field → cross rules（含 deps + trigger） */
  crossRules: Map<string, CrossRuleEntry[]>
  /** depField → 受影响的 target 字段名列表 */
  reverseIndex: Map<string, string[]>
  /** target → deps 字段名列表 */
  dependsOnMap: Map<string, string[]>
}

export interface CrossRuleEntry {
  target: string
  deps: string[]
  rule: RuleItem
}

/**
 * 构建索引 —— 一次遍历搞定所有查询表
 * 覆盖：children / array.itemSchema / formItem.slots
 */
export function buildIndex(schema: SchemaNode | SchemaNode[] | string | undefined): SchemaIndex {
  const byName = new Map<string, SchemaNode>()
  const fieldNames: string[] = []
  const allNames: string[] = []
  const crossRules = new Map<string, CrossRuleEntry[]>()
  const reverseIndex = new Map<string, string[]>()
  const dependsOnMap = new Map<string, string[]>()
  const seenNames = new Set<string>()

  traverse(schema, (n) => {
    const id = resolveFieldId(n)
    if (id) {
      allNames.push(id)
      if (!n.ignore && !seenNames.has(id)) {
        fieldNames.push(id)
        seenNames.add(id)
      }
      if (!byName.has(id)) byName.set(id, n)
    }
    if (!n.rules) return
    const arr = Array.isArray(n.rules) ? n.rules : [n.rules]
    for (const r of arr) {
      if (typeof r !== 'object' || !r || !('crossValidator' in r) || !('dependsOn' in r)) continue
      const target = resolveFieldId(n)
      if (!target) continue
      const raw = (r as RuleItem).dependsOn
      const deps = (Array.isArray(raw) ? raw : [raw]).filter(
        (d): d is string => typeof d === 'string'
      )
      if (deps.length === 0) continue
      const entry: CrossRuleEntry = { target, deps, rule: r as RuleItem }
      const list = crossRules.get(target)
      if (list) list.push(entry)
      else crossRules.set(target, [entry])
      // 同一 target 挂多条 cross rule 时合并 deps（去重）—— 直接 set 会被后者整条覆盖
      const prevDeps = dependsOnMap.get(target)
      if (prevDeps) {
        for (const d of deps) if (!prevDeps.includes(d)) prevDeps.push(d)
      } else {
        dependsOnMap.set(target, [...deps])
      }
      const trigger = (r as RuleItem).trigger
      if (trigger === 'manual') continue // manual 仅 validateForm 跑，不进反向索引
      for (const d of deps) {
        const arr2 = reverseIndex.get(d)
        if (arr2) {
          if (!arr2.includes(target)) arr2.push(target)
        } else {
          reverseIndex.set(d, [target])
        }
      }
    }
  })

  return {
    byName,
    fieldNames,
    allNames,
    crossRules,
    reverseIndex,
    dependsOnMap,
  }
}

/**
 * 解析字段 id：优先 name，没有则用 key
 * 与 XForm 原 getNames() 行为一致
 */
function resolveFieldId(n: SchemaNode): string | undefined {
  if (n.name) return n.name
  if (n.key !== undefined) return String(n.key)
  return undefined
}

/**
 * 统一遍历函数 —— 与 collectCrossRuleFields 覆盖范围一致
 * children / array.itemSchema / formItem.slots
 */
function traverse(
  node: SchemaNode | SchemaNode[] | string | undefined,
  visit: (n: SchemaNode) => void
): void {
  if (!node || typeof node === 'string') return
  if (Array.isArray(node)) {
    for (const c of node) traverse(c, visit)
    return
  }
  visit(node)
  if (node.kind === 'array' && node.array) traverse(node.array.itemSchema, visit)
  if (node.children) {
    if (Array.isArray(node.children)) traverse(node.children, visit)
    else if (typeof node.children === 'object') traverse(node.children, visit)
  }
  if (node.formItem && typeof node.formItem === 'object' && node.formItem.slots) {
    for (const v of Object.values(node.formItem.slots)) {
      // SchemaSlot = string | VNode | SchemaNode | 渲染函数 —— 只递归 SchemaNode/SchemaNode[]
      if (isSchemaNodeLike(v)) traverse(v, visit)
    }
  }
}

/**
 * 判定是否为 SchemaNode / SchemaNode[] 形态 —— SchemaSlot 类型擦除后无法 TS 收窄
 * 启发式：有 component / name / children / kind / array 字段的对象视为 SchemaNode
 */
function isSchemaNodeLike(v: unknown): v is SchemaNode | SchemaNode[] {
  if (!v || typeof v !== 'object') return false
  if (Array.isArray(v)) return true
  const o = v as Record<string, unknown>
  return (
    'component' in o ||
    'name' in o ||
    'children' in o ||
    'kind' in o ||
    'array' in o ||
    'formItem' in o
  )
}
