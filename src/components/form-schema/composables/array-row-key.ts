/**
 * array-row-key —— 数组节点行身份与 name 路径前缀化工具（P1-1 拆分抽出）
 *
 * 为什么独立成文件：
 * - rewriteNamePath（~50 行）是纯函数，被 render-array-node.ts + 其 spec 直接调用
 * - rowKeyOf + newShortUid（~30 行）是 renderRow 内部行级稳定 key 分配工具
 * - 三个工具均与渲染逻辑解耦，独立单元可单独测试
 *
 * 行为 100% 等价拆分前。
 */
import type { SchemaNode } from '../types'

/**
 * 行级稳定 key —— 按行对象身份（WeakMap）分配，而非 index
 *
 * index 作 key 时删/移一行会导致后续所有行重挂载（焦点丢失、内部组件状态与校验状态错位）；
 * 对象行在 splice/move 后身份不变 → key 稳定 → Vue 只移动 DOM 不重挂载。
 * 原始值行（string/number）无对象身份，退回 index（极少见场景）。
 *
 * WeakMap 跨渲染存活是必要的：renderRow 每次渲染重建，key 必须跨渲染稳定；
 * 行对象被 GC 时条目自动回收，不会泄漏。
 *
 * OPT-5：原 rowKeySeq 模块级计数器永增不回收（长时间运行下接近 2^53 上限），
 * 改为 crypto.randomUUID() 短码 —— 无全局计数器，UUID 重复概率可忽略。
 */
const rowKeyMap = new WeakMap<object, string>()
export function rowKeyOf(row: unknown, index: number): string {
  if (row !== null && typeof row === 'object') {
    let k = rowKeyMap.get(row as object)
    if (!k) {
      k = `r${newShortUid()}`
      rowKeyMap.set(row as object, k)
    }
    return k
  }
  return `i${index}`
}

/**
 * 短 UUID 生成 —— 8 字符前缀，重复概率 1/2^32 = 可忽略
 * 优先使用 crypto.randomUUID()（Node 19+/所有现代浏览器），
 * 旧环境 fallback 到 time+random 组合
 */
export function newShortUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8)
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 把子 schema 的 name 路径前缀化,让 el-form 能按 list.0.qty 形式做嵌套校验
 * - 递归处理 children / formItem.slots / slots
 * - 子节点为空 / 字符串时原样返回
 * - keyPrefix（可选）：按行对象身份生成 node.key —— name 是位置路径（校验用），
 *   key 是身份标识（vnode diff 用）；不传则保持原行为（key 不受影响）
 */
export function rewriteNamePath(
  sub: SchemaNode | SchemaNode[] | string | undefined,
  prefix: string,
  sep: string,
  keyPrefix?: string
): SchemaNode | SchemaNode[] | string | undefined {
  if (sub === undefined || sub === null) return sub
  if (typeof sub === 'string') return sub
  if (Array.isArray(sub)) {
    return sub.map((s) => rewriteNamePath(s, prefix, sep, keyPrefix) as SchemaNode)
  }
  const cloned: SchemaNode = { ...sub }
  const originalName = cloned.name
  if (originalName) {
    cloned.name = `${prefix}${sep}${originalName}`
    // 用户显式配置的 key 优先；否则用行身份前缀派生稳定 key
    if (keyPrefix && cloned.key === undefined) cloned.key = `${keyPrefix}${sep}${originalName}`
  }
  if (cloned.children !== undefined) {
    cloned.children = rewriteNamePath(cloned.children, prefix, sep, keyPrefix) as never
  }
  if (cloned.slots) {
    const newSlots: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(cloned.slots)) {
      if (typeof v === 'function') {
        newSlots[k] = v
      } else if (v && typeof v === 'object') {
        newSlots[k] = rewriteNamePath(v, prefix, sep, keyPrefix)
      } else {
        newSlots[k] = v
      }
    }
    cloned.slots = newSlots as never
  }
  if (cloned.formItem && typeof cloned.formItem === 'object' && cloned.formItem.slots) {
    const newFormItemSlots: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(cloned.formItem.slots)) {
      if (typeof v === 'function') {
        newFormItemSlots[k] = v
      } else if (v && typeof v === 'object') {
        newFormItemSlots[k] = rewriteNamePath(v, prefix, sep, keyPrefix)
      } else {
        newFormItemSlots[k] = v
      }
    }
    cloned.formItem = { ...cloned.formItem, slots: newFormItemSlots as never }
  }
  return cloned
}
