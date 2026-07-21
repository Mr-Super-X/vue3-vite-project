#!/usr/bin/env node
// 路由配置一致性校验
//
// 用途：检查 src/router/ 内 2 处路由相关的 TypeScript 文件是否一致：
//   1. types.ts 中的 RouteName 联合类型（声明）
//   2. whitelist.ts 中的 ROUTE_WHITE_LIST 元素（白名单）
//
// 注：原 component-registry.ts 校验已移除（该文件已合并到 auto-register.ts 派生）。
//
// 用法：pnpm check:routes
// 失败退出码：1（可在 CI 阶段阻断）

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const ROUTER_DIR = resolve(ROOT, 'src/router')

function readRouterFile(relativePath: string): string {
  // 统一换行符：Windows CRLF → LF，避免正则 ^ 锚点跨平台失效
  return readFileSync(resolve(ROUTER_DIR, relativePath), 'utf-8').replace(/\r\n/g, '\n')
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
  const setMatch = content.match(/new Set<RouteName>\s*\(\s*\[([^\]]+)\]/s)
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

let errors = 0
const checks: Array<[string, () => boolean]> = [
  // whitelist 中每个 name 都必须在 RouteName 中
  ...[...whitelistedNames].map((name): [string, () => boolean] => [
    `whitelist 中的 '${name}' 不在 RouteName 联合类型中`,
    () => declaredNames.has(name),
  ]),
]

console.log('🔍 检查路由配置一致性...\n')

for (const [message, predicate] of checks) {
  // predicate 返回 true 表示检查项**通过**（即声明与实现一致）
  if (predicate()) {
    console.log(`✓ ${message}`)
  } else {
    console.error(`✖ ${message}`)
    errors++
  }
}

console.log('')
console.log(`RouteName 联合类型：${declaredNames.size} 个（${[...declaredNames].join(', ')}）`)
console.log(`whitelist 白名单：${whitelistedNames.size} 个`)
console.log('')

if (errors > 0) {
  console.error(`✖ ${errors} 个错误`)
  process.exit(1)
} else {
  console.log('✓ 所有路由检查通过')
}
