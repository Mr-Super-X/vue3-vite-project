// SECURITY：用 new Function 替代 eval，隔离上层作用域，仅暴露 model 只读副本与组件事件参数
// model 经 toSafeDto 净化：排除函数 / 原型链 / 循环引用 / 危险字段
// 实际安全边界依赖 schema 来源约束（仅项目内部硬编码）
// 危险标识符扫描已抽到 ./use-scan-forbidden.ts

// ────────────────────────────────────────────────────────────────────────────
// 表达式作用域设计（保留向后兼容 + 新增 per-instance scope）
//
// 历史：原实现使用模块级 EXPRESSION_CACHE + EXPRESSION_FNS。
// 局限：多 XForm 实例同时挂载时后注册的函数表会覆盖前者，且缓存共享。
// 当前实践：XForm 不在同一页面多实例共存，模块级 API 保留作为向后兼容 fallback。
// 新方案：createExpressionScope() 工厂为每个 XForm 实例返回独立作用域（缓存 + 函数表）。
//         新调用方应优先使用 scope，旧模块级 API 保留到所有调用方迁移完成。
// ────────────────────────────────────────────────────────────────────────────

const EXPRESSION_REG = /^\s*\{\{([\s\S]+)\}\}\s*$/
const CACHE_LIMIT = 500

// 模块级状态（向后兼容旧调用方，新调用方请使用 ExpressionScope）
const EXPRESSION_CACHE = new Map<string, ((model: unknown) => unknown) | null>()
let EXPRESSION_FNS: Record<string, (...args: never[]) => unknown> = {}
let fnsVersion = 0

/** 注册表达式可用函数表（XForm setup 调用；传 undefined 清空） */
export function setExpressionFunctions(fns?: Record<string, (...args: never[]) => unknown>): void {
  EXPRESSION_FNS = fns ?? {}
  fnsVersion++ // fns 变化时旧编译缓存必须失效（同字符串表达式作用域已变）
}

/** 表达式作用域接口（每个 XForm 实例一个） */
export interface ExpressionScope {
  setExpressionFunctions(fns?: Record<string, (...args: never[]) => unknown>): void
  resolveFunctionExpression: <T extends (...a: unknown[]) => unknown>(raw: unknown) => T | null
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

/**
 * 共享编译函数：给定缓存、版本引用与函数表引用，编译一次并写入缓存
 * 内部实现，确保旧模块级 API 与新 scope 工厂行为一致
 */
function compileExpression(
  raw: string,
  cache: Map<string, ((model: unknown) => unknown) | null>,
  fnsRef: { current: Record<string, (...args: never[]) => unknown> }
): ((model: unknown, ...rest: unknown[]) => unknown) | null {
  let compiled: ((model: unknown, ...rest: unknown[]) => unknown) | null = null
  try {
    // 白名单函数注入表达式作用域：表达式可直接引用注册名（如 formatDate）
    const names = Object.keys(fnsRef.current)
    // __rest 透传组件事件参数（on 绑定第 2 起的实参）；reaction / permission 等
    // 单参求值路径传入空数组，调用形态与旧版保持一致
    const fn = new Function(
      'model',
      '__rest',
      ...names,
      `return (${raw.trim()})(model, ...__rest)`
    ) as (model: unknown, rest: unknown[], ...whitelist: unknown[]) => unknown
    compiled = (model: unknown, ...rest: unknown[]) =>
      fn(toSafeDto(model), rest, ...names.map((n) => fnsRef.current[n]))
  } catch (err) {
    console.error('[XForm] Invalid function expression:', raw, err)
  }
  // 超上限整体清空：表达式集通常远小于上限，clear 比 LRU 逐出实现简单且命中影响可忽略
  if (cache.size >= CACHE_LIMIT) cache.clear()
  return compiled
}

/** 沙箱解析 schema 中的 {{ fn }} 表达式（向后兼容模块级 API） */
export function resolveFunctionExpression<T extends (...a: unknown[]) => unknown>(
  raw: unknown
): T | null {
  if (typeof raw !== 'string') return null
  const m = raw.match(EXPRESSION_REG)
  if (!m || !m[1]) return null
  const cacheKey = `${fnsVersion}:${raw}`
  const hit = EXPRESSION_CACHE.get(cacheKey)
  if (hit !== undefined) return hit as T | null
  const fnsRef = { current: EXPRESSION_FNS }
  const compiled = compileExpression(m[1], EXPRESSION_CACHE, fnsRef)
  EXPRESSION_CACHE.set(cacheKey, compiled)
  return compiled as T | null
}

/** 创建一个独立的表达式作用域（每个 XForm 实例一个） */
export function createExpressionScope(): ExpressionScope {
  const cache = new Map<string, ((model: unknown) => unknown) | null>()
  const fnsRef = { current: {} as Record<string, (...args: never[]) => unknown> }
  const versionRef = { current: 0 }

  function setExpressionFunctions(fns?: Record<string, (...args: never[]) => unknown>): void {
    fnsRef.current = fns ?? {}
    versionRef.current++
  }

  function resolve<T extends (...a: unknown[]) => unknown>(raw: unknown): T | null {
    if (typeof raw !== 'string') return null
    const m = raw.match(EXPRESSION_REG)
    if (!m || !m[1]) return null
    const cacheKey = `${versionRef.current}:${raw}`
    const hit = cache.get(cacheKey)
    if (hit !== undefined) return hit as T | null
    const compiled = compileExpression(m[1], cache, fnsRef)
    cache.set(cacheKey, compiled)
    return compiled as T | null
  }

  return {
    setExpressionFunctions,
    resolveFunctionExpression: resolve,
  }
}
