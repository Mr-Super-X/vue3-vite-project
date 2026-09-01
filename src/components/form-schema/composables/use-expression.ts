// SECURITY：用 new Function 替代 eval，隔离上层作用域，仅暴露 model 只读副本与组件事件参数
// model 经 toSafeDto 净化：排除函数 / 原型链 / 循环引用 / 危险字段
// 实际安全边界依赖 schema 来源约束（仅项目内部硬编码）
// 危险标识符扫描已抽到 ./use-scan-forbidden.ts

// ────────────────────────────────────────────────────────────────────────────
// 模块级缓存 —— OPT-5 评估后保留并文档化
//
// 1. EXPRESSION_CACHE：编译结果缓存（字符串 → fn 或 null）
//    - 表达式字符串是静态配置，但求值可能发生在每次渲染/联动中。
//    - 不缓存意味着同一字符串反复 new Function（含语法解析），大表单下开销可观。
//    - 失败结果同样缓存（null），避免同一非法表达式每轮重复 console.error。
//    - 超 500 条时整体 clear（按时间窗口冷启动，命中影响可忽略）。
//
// 2. EXPRESSION_FNS / fnsVersion：白名单函数表 + 版本号
//    - 由 XFormProps.expressionFunctions 通过 setExpressionFunctions 注入。
//    - 模块级共享意味着多 XForm 实例同时挂载时后注册的会覆盖前者（last-write-wins）。
//    - 当前项目实践中 XForm 不在同一页面多实例共存，保留性能特性。
//    - 若未来需支持多实例共存，将 resolveFunctionExpression 改为接收 scope 参数即可。
//
// 设计权衡：以上两块本质是全局求值缓存，跨实例共享同一编译结果是性能优化。
// 把它们改为实例级会让同一字符串反复编译（N schema × M reaction），得不偿失。
// 保留模块级 + 文档化设计权衡，是务实选择。 — OPT-5
// ────────────────────────────────────────────────────────────────────────────

const EXPRESSION_REG = /^\s*\{\{([\s\S]+)\}\}\s*$/

const EXPRESSION_CACHE = new Map<string, ((model: unknown) => unknown) | null>()
const CACHE_LIMIT = 500

let EXPRESSION_FNS: Record<string, (...args: never[]) => unknown> = {}
let fnsVersion = 0

/** 注册表达式可用函数表（XForm setup 调用；传 undefined 清空） */
export function setExpressionFunctions(fns?: Record<string, (...args: never[]) => unknown>): void {
  EXPRESSION_FNS = fns ?? {}
  fnsVersion++ // fns 变化时旧编译缓存必须失效（同字符串表达式作用域已变）
}

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
  const cacheKey = `${fnsVersion}:${raw}`
  const hit = EXPRESSION_CACHE.get(cacheKey)
  if (hit !== undefined) return hit as T | null
  let compiled: ((model: unknown, ...rest: unknown[]) => unknown) | null = null
  try {
    // 白名单函数注入表达式作用域：表达式可直接引用注册名（如 formatDate）
    const names = Object.keys(EXPRESSION_FNS)
    // __rest 透传组件事件参数（on 绑定第 2 起的实参）；reaction / permission 等
    // 单参求值路径传入空数组，调用形态与旧版保持一致
    const fn = new Function(
      'model',
      '__rest',
      ...names,
      `return (${m[1].trim()})(model, ...__rest)`
    ) as (model: unknown, rest: unknown[], ...whitelist: unknown[]) => unknown
    compiled = (model: unknown, ...rest: unknown[]) =>
      fn(toSafeDto(model), rest, ...names.map((n) => EXPRESSION_FNS[n]))
  } catch (err) {
    console.error('[XForm] Invalid function expression:', raw, err)
  }
  // 超上限整体清空：表达式集通常远小于上限，clear 比 LRU 逐出实现简单且命中影响可忽略
  if (EXPRESSION_CACHE.size >= CACHE_LIMIT) EXPRESSION_CACHE.clear()
  EXPRESSION_CACHE.set(cacheKey, compiled)
  return compiled as T | null
}
