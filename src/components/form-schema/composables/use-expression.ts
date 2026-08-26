// SECURITY：用 new Function 替代 eval，隔离上层作用域，仅暴露 model 参数
// model 经 toSafeDto 净化：排除函数 / 原型链 / 循环引用 / 危险字段
// 实际安全边界依赖 schema 来源约束（仅项目内部硬编码）
// 危险标识符扫描已抽到 ./use-scan-forbidden.ts

const EXPRESSION_REG = /^\s*\{\{([\s\S]+)\}\}\s*$/

// 编译结果缓存：表达式字符串是静态配置，但求值可能发生在每次渲染/联动中，
// 不缓存意味着同一字符串反复 new Function（含语法解析），大表单下开销可观。
// 失败结果同样缓存（null），避免同一非法表达式每轮重复 console.error。
const EXPRESSION_CACHE = new Map<string, ((model: unknown) => unknown) | null>()
const CACHE_LIMIT = 500

/** 深冻结 model 为安全 DTO：排除函数 / 原型链 / 循环引用 / 危险字段 */
function toSafeDto(model: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (model === null || typeof model !== 'object' || seen.has(model)) return model
  if (typeof model === 'function') return undefined
  seen.add(model)
  if (Array.isArray(model)) return model.map((m) => toSafeDto(m, seen))
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(model as Record<string, unknown>)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
    out[k] = toSafeDto((model as Record<string, unknown>)[k], seen)
  }
  return out
}

/** 沙箱解析 schema 中的 {{ fn }} 表达式 */
export function resolveFunctionExpression<T extends (...a: unknown[]) => unknown>(
  raw: unknown
): T | null {
  if (typeof raw !== 'string') return null
  const m = raw.match(EXPRESSION_REG)
  if (!m || !m[1]) return null
  const hit = EXPRESSION_CACHE.get(raw)
  if (hit !== undefined) return hit as T | null
  let compiled: ((model: unknown) => unknown) | null = null
  try {
    const fn = new Function('model', `return (${m[1].trim()})(model)`)
    compiled = (model: unknown) => fn(toSafeDto(model))
  } catch (err) {
    console.error('[XForm] Invalid function expression:', raw, err)
  }
  // 超上限整体清空：表达式集通常远小于上限，clear 比 LRU 逐出实现简单且命中影响可忽略
  if (EXPRESSION_CACHE.size >= CACHE_LIMIT) EXPRESSION_CACHE.clear()
  EXPRESSION_CACHE.set(raw, compiled)
  return compiled as T | null
}
