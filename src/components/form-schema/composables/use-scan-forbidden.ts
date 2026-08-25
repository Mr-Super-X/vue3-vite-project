import type { SchemaNode } from '../types'

// 危险标识符黑名单：覆盖 OWASP A03 Injection 主要攻击面
const FORBIDDEN_REG =
  /\b(window|document|globalThis|eval|Function|setTimeout|setInterval|fetch|XMLHttpRequest|process|Reflect|Proxy|constructor|__proto__|prototype)\b/
const MAX_DEPTH = 32
const MAX_NODES = 10_000

/**
 * 扫描 schema 中所有可执行字段（on/reaction/directives/slots/formItem.slots）的危险标识符
 * 防护：WeakSet 去重 + 最大深度 32 + 最大节点数 10000
 */
export function scanForForbidden(schema: SchemaNode | SchemaNode[]): string[] {
  const errors: string[] = []
  const seen = new WeakSet<object>()
  let count = 0
  traverse(schema, 0)
  return errors
  function traverse(node: unknown, depth: number): void {
    if (
      depth > MAX_DEPTH ||
      count > MAX_NODES ||
      node === null ||
      typeof node !== 'object' ||
      seen.has(node as object)
    )
      return
    seen.add(node as object)
    count++
    // 数组顶层：递归每个元素
    if (Array.isArray(node)) {
      for (const item of node) traverse(item, depth + 1)
      return
    }
    const obj = node as Record<string, unknown>
    scanField(obj.on, 'on')
    scanField(obj.reaction, 'reaction')
    if (Array.isArray(obj.directives)) {
      for (const d of obj.directives) {
        if (d && typeof d === 'object') {
          const v = (d as Record<string, unknown>).value
          if (typeof v === 'string' && FORBIDDEN_REG.test(v)) errors.push(`directive.value: ${v}`)
        }
      }
    }
    if (Array.isArray(obj.children)) obj.children.forEach((c) => traverse(c, depth + 1))
    else if (obj.children && typeof obj.children === 'object') traverse(obj.children, depth + 1)
    if (obj.slots && typeof obj.slots === 'object') {
      for (const slot of Object.values(obj.slots as Record<string, unknown>))
        traverse(slot, depth + 1)
    }
    if (obj.formItem && typeof obj.formItem === 'object') {
      const fi = obj.formItem as Record<string, unknown>
      if (fi.slots && typeof fi.slots === 'object') {
        for (const slot of Object.values(fi.slots as Record<string, unknown>))
          traverse(slot, depth + 1)
      }
    }
  }
  function scanField(target: unknown, prefix: string): void {
    if (target && typeof target === 'object') {
      for (const [k, v] of Object.entries(target as Record<string, unknown>)) {
        if (typeof v === 'string' && FORBIDDEN_REG.test(v)) errors.push(`${prefix}.${k}: ${v}`)
      }
    }
  }
}
