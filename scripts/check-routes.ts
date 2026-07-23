#!/usr/bin/env node
// 路由配置一致性校验
//
// 用途：检查 3 处路由相关的源头是否一致，任何不一致都会让 CI 失败：
//   1. types.ts 中的 RouteName 联合类型（声明）
//   2. whitelist.ts 中的 ROUTE_WHITE_LIST（白名单）
//   3. src/modules/*/routes/index.ts 中的 name 字段（实现）
//
// 5 个校验：
//   A. whitelist ⊆ declaredNames（已在原版本）
//   B. declaredNames ⊆ implementedNames（声明必须有 route 实现）
//   C. implementedNames ⊆ declaredNames（实现必须声明，防漂移）
//   D. 系统路由 Login/Forbidden/NotFound/ServerError 必在 whitelist（兜底）
//   E. 双向一致性最终确认（汇总）
//
// 用法：pnpm check:routes
// 失败退出码：1（可在 CI 阶段阻断）

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const ROUTER_DIR = resolve(ROOT, 'src/router')
const MODULES_DIR = resolve(ROOT, 'src/modules')

function readRouterFile(relativePath: string): string {
  // 统一换行符：Windows CRLF → LF，避免正则 ^ 锚点跨平台失效
  return readFileSync(resolve(ROUTER_DIR, relativePath), 'utf-8').replace(/\r\n/g, '\n')
}

/**
 * 提取各模块 routes 文件中所有 `name: 'Xxx'` 字段。
 *
 * 扫描模拟 src/router/auto-register.ts 的 import.meta.glob 行为：
 *   - 仅扫描 `src/modules/<dir>/routes/index.ts`（不是 routes.ts）
 *   - 嵌套 children 中的 name 同样提取（业务可能写多级菜单）
 */
function extractImplementedNames(): string[] {
  const names: string[] = []
  for (const moduleDir of readdirSync(MODULES_DIR)) {
    const routesFile = join(MODULES_DIR, moduleDir, 'routes/index.ts')
    let content: string
    try {
      content = readFileSync(routesFile, 'utf-8').replace(/\r\n/g, '\n')
    } catch {
      // 模块没有 routes 子目录或文件，跳过（不是所有模块都必须有路由）
      continue
    }
    // 提取所有 `name: 'Xxx'` 形式（兼容 `name: 'Xxx',` 与 `name: 'Xxx'` 行尾）
    const matches = [...content.matchAll(/name:\s*'([A-Za-z][\w-]*)'/g)]
    names.push(...matches.map((m) => m[1]))
  }
  return [...new Set(names)]
}

// ─── 1. 提取 RouteName 联合类型中的字符串字面量 ──────────────────
//
// 提取策略：找 `export type RouteName =` 之后到下一个空行前的内容，
// 再提取所有 'Name'。Prettier 对单行 type 别名省略 ;，不能用 ; 作边界。
function extractRouteNames(content: string): string[] {
  const block = content.match(/export type RouteName\s*=\s*([\s\S]*?)(?:\n\n|$)/)
  if (!block) return []
  const matches = [...block[1].matchAll(/'([A-Za-z][\w-]*)'/g)]
  return [...new Set(matches.map((m) => m[1]))]
}

// ─── 2. 提取 ROUTE_WHITE_LIST 中的字符串 ───────────────────────
//
// 匹配格式（whitelist.ts）：
//   new Set<RouteName>([
//     'Login', // 注释
//     'Dashboard',
//   ])
function extractWhitelist(content: string): string[] {
  const setMatch = content.match(/new Set<[^>]+>\s*\(\s*\[([^\]]+)\]/s)
  if (!setMatch) return []
  const items = setMatch[1]
  // 提取 'Name' 形式（忽略注释和空格）
  const matches = [...items.matchAll(/'([A-Za-z][\w-]*)'/g)]
  return [...new Set(matches.map((m) => m[1]))]
}

// ─── 主流程 ────────────────────────────────────────────────────

const typesContent = readRouterFile('types.ts')
const whitelistContent = readRouterFile('whitelist.ts')

const declaredNames = new Set(extractRouteNames(typesContent))
const whitelistedNames = new Set(extractWhitelist(whitelistContent))
const implementedNames = new Set(extractImplementedNames())

// 系统级白名单必须存在（Login/F403/F404/F500 是兜底页面）
const REQUIRED_WHITELIST: ReadonlySet<string> = new Set([
  'Login',
  'Forbidden',
  'NotFound',
  'ServerError',
])

/**
 * 一致性豁免前缀——以这些字符串开头的路由 name 跳过 A/C/E 三处一致性校验。
 *
 * 适用场景：动态/可选模块（demo 路由由 src/modules/demo 自动派生，
 * 在 src/router/types.ts 的 RouteName 联合类型和 whitelist 中**故意不枚举**）。
 * 新增同类模块时只需在此追加前缀，无需在多处手动维护。
 */
const EXEMPT_PREFIXES: readonly string[] = ['Demo']

function isExempt(name: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => name.startsWith(prefix))
}

let errors = 0
const checks: Array<[string, boolean]> = [
  // A. whitelist 元素必须在 RouteName 中（豁免前缀跳过此检查）
  ...[...whitelistedNames]
    .filter((name) => !isExempt(name))
    .map((name): [string, boolean] => [
      `[A] whitelist 中的 '${name}' 必须存在于 RouteName 联合类型中（当前${declaredNames.has(name) ? '✓' : '✗ 缺失'}）`,
      declaredNames.has(name),
    ]),

  // B. RouteName 声明必须有 route 实现（防止声明了但忘了写路由）
  ...[...declaredNames].map((name): [string, boolean] => [
    `[B] RouteName 声明了 '${name}' 但 src/modules/**/routes/*.ts 中没有 name 字段`,
    implementedNames.has(name),
  ]),

  // C. route 实现必须有 RouteName 声明（豁免前缀跳过此检查）
  ...[...implementedNames]
    .filter((name) => !isExempt(name))
    .map((name): [string, boolean] => [
      `[C] src/modules/*/routes/*.ts 中实现了 name '${name}' 但 RouteName 联合类型未声明`,
      declaredNames.has(name),
    ]),

  // D. 系统级白名单必须存在（任何项目都必须能匿名访问的兜底）
  ...[...REQUIRED_WHITELIST].map((name): [string, boolean] => [
    `[D] 系统路由 '${name}' 必须在 whitelist 中（兜底页面必须能匿名访问）`,
    whitelistedNames.has(name),
  ]),

  // E. 双向一致性最终汇总（豁免前缀不参与对比，汇总行也排除豁免项的计数）
  [
    (() => {
      const declaredEffective = [...declaredNames].filter((n) => !isExempt(n))
      const implementedEffective = [...implementedNames].filter((n) => !isExempt(n))
      return `[E] 双向一致性：declaredNames(${declaredEffective.length}) ≡ implementedNames(${implementedEffective.length})（已豁免前缀: ${EXEMPT_PREFIXES.join(', ')}）`
    })(),
    (() => {
      const declaredEffective = new Set([...declaredNames].filter((n) => !isExempt(n)))
      const implementedEffective = new Set([...implementedNames].filter((n) => !isExempt(n)))
      return (
        declaredEffective.size === implementedEffective.size &&
        [...declaredEffective].every((n) => implementedEffective.has(n))
      )
    })(),
  ],
]

console.log('🔍 检查路由配置一致性...\n')

for (const [message, ok] of checks) {
  if (ok) {
    console.log(`✓ ${message}`)
  } else {
    console.error(`✖ ${message}`)
    errors++
  }
}

console.log('')
console.log(`RouteName 联合类型：${declaredNames.size} 个（${[...declaredNames].join(', ')}）`)
console.log(`whitelist 白名单：${whitelistedNames.size} 个（${[...whitelistedNames].join(', ')}）`)
console.log(`routes 实现：${implementedNames.size} 个（${[...implementedNames].join(', ')}）`)
console.log('')

if (errors > 0) {
  console.error(`✖ ${errors} 个错误`)
  process.exit(1)
} else {
  console.log('✓ 所有路由检查通过')
}
