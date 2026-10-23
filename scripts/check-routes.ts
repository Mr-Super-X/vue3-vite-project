#!/usr/bin/env node
// 路由配置一致性校验（Monorepo 多应用版）
//
// 用途：检查各应用（apps/*）的路由相关源头是否一致，任何不一致都会让 CI 失败。
//   1. apps/<a>/src/router/whitelist.ts 中的 ROUTE_WHITE_LIST（白名单）
//   2. apps/<a>/src/modules/*/routes/index.ts 中的 name 字段（实现）
//   3. apps/<a>/src/router/index.ts 中的根级具名路由（如 NotFound 兜底页）
//
// 多应用语义（P5-A）：
//   - 自动发现 apps/ 下含 src/modules/ 的应用，逐 app 独立校验、按 app 分组输出
//   - whitelist 支持 `...xxxRouteNames` 展开语法：经 import 表解析到
//     `@/modules/<m>/routes`，用该模块 routes 的实际 name 展开（与运行时吸收行为一致）
//   - 系统兜底名单按 app 注册表差异化（B/C 校验），单一事实源 scripts/apps-registry.mjs：
//       auth → ['Login', 'NotFound']（登录路由宿主 + 登出落地页匿名可达）
//       admin → ['Forbidden', 'NotFound', 'ServerError']（系统错误页宿主）
//       其余 app（docs/portal/h5/big）→ ['NotFound']（全公开 app 只有 404 兜底）
//   - 路由检查收尾时自动复跑网关配置校验（check-gateway-conf 同一函数，CI 单点覆盖）
//
// 5 个校验（语义与单应用时代一致，逐 app 执行）：
//   A. whitelist ⊆ implementedNames（白名单元素必须有 route 实现）
//   B. 系统兜底名单 ⊆ whitelist（任何项目都必须能匿名访问的兜底）
//   C. 系统兜底名单 ⊆ implementedNames（兜底页面必须有真实路由）
//   D. 双向一致性最终汇总
//   E. 注册表反向校验：apps/ 下发现的应用必须登记 apps-registry.mjs（防静默失效）
// 收尾另跑网关校验 + 端口双写锁死（check-gateway-conf 同函数，CI 单点覆盖）
//
// 设计变更（2026-07-24 方案 A）：
//   - 移除 RouteName 联合类型校验（types.ts RouteName 改为 string alias）
//   - 单一事实源：modules/<feature>/routes/index.ts 的 name 字段
//   - auto-register.ts 自动捕获（Vite 编译期 import.meta.glob）
//
// 用法：pnpm check:routes
// 失败退出码：1（可在 CI 阶段阻断）

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { APPS } from './apps-registry.mjs'
import { validateGatewayConf, validatePortWiring } from './check-gateway-conf.ts'

const ROOT = resolve(import.meta.dirname, '..')
const APPS_DIR = resolve(ROOT, 'apps')

/**
 * 发现所有含 src/modules/ 的应用目录（apps/* 下的独立应用）。
 * docs/h5/big/portal/auth/admin 均在此列；未来新增 app 只要建了 src/modules 即自动纳入校验。
 */
function discoverApps(): string[] {
  return readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(APPS_DIR, entry.name, 'src/modules')))
    .map((entry) => entry.name)
    .sort()
}

/**
 * B/C 校验的系统兜底名单：由 app 注册表（scripts/apps-registry.mjs）派生，
 * 名单语义（可匿名访问的兜底路由）在注册表条目注释中说明；未登记的 app 不校验。
 */
function requiredFor(app: string): readonly string[] {
  return APPS.find((entry) => entry.name === app)?.requiredRoutes ?? []
}

/**
 * 一致性豁免前缀——以这些字符串开头的路由 name 跳过 A/D 两处一致性校验。
 *
 * 适用场景：动态/可选模块（docs 的 demo 路由虽经 routeNames 吸收全量白名单，
 * 仍保留豁免以兼容未来"故意不枚举"的可选模块）。新增同类模块时只需在此追加前缀。
 */
const EXEMPT_PREFIXES: readonly string[] = ['Demo']

function isExempt(name: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => name.startsWith(prefix))
}

/** 读取应用内文件统一换行符（Windows CRLF → LF），避免正则 ^ 锚点跨平台失效 */
function readAppText(app: string, relativePath: string): string {
  return readFileSync(join(APPS_DIR, app, relativePath), 'utf-8').replace(/\r\n/g, '\n')
}

/** 提取 routes 文件中的所有 `name: 'Xxx'` 字段（兼容 `name: 'Xxx',` 与行尾无逗号） */
function extractRouteNames(content: string): string[] {
  const matches = [...content.matchAll(/name:\s*'([A-Za-z][\w-]*)'/g)]
  return [...new Set(matches.map((m) => m[1]!))]
}

/**
 * 提取应用内所有已实现的路由 name。
 *
 * 扫描模拟 src/router/auto-register.ts 的 import.meta.glob 行为：
 *   - 仅扫描 `src/modules/<dir>/routes/index.ts`（不是 routes.ts）
 *   - 嵌套 children 中的 name 同样提取（业务可能写多级菜单）
 *   - 附加扫描 `src/router/index.ts` 的根级具名路由：各 app 的 NotFound 兜底页
 *     在 router/index.ts 注册（非 modules），不纳入会让 auth/portal 等全公开 app 的
 *     A 校验误报"白名单 NotFound 无实现"
 */
function extractImplementedNames(app: string): Set<string> {
  const names = new Set<string>()
  const modulesDir = join(APPS_DIR, app, 'src/modules')
  for (const moduleDir of readdirSync(modulesDir)) {
    const routesFile = join(modulesDir, moduleDir, 'routes/index.ts')
    let content: string
    try {
      content = readFileSync(routesFile, 'utf-8').replace(/\r\n/g, '\n')
    } catch {
      // 模块没有 routes 子目录或文件，跳过（不是所有模块都必须有路由）
      continue
    }
    for (const n of extractRouteNames(content)) names.add(n)
  }
  try {
    for (const n of extractRouteNames(readAppText(app, 'src/router/index.ts'))) names.add(n)
  } catch {
    // 无 router/index.ts（理论不存在）则仅依据 modules 扫描结果
  }
  return names
}

/**
 * 提取 ROUTE_WHITE_LIST 生效名单（字面量 + routeNames 展开）。
 *
 * whitelist.ts 两种形态：
 *   1. 纯字面量（admin）：new Set<string>([ 'Forbidden', ... ])
 *   2. 吸收展开（auth/portal/h5/big/docs）：
 *        import { routeNames as authRouteNames } from '@/modules/auth/routes'
 *        new Set<string>([ 'NotFound', ...authRouteNames ])
 *
 * 展开条目按 import 表解析到具体模块，用该模块 routes 文件的实际 name 展开——
 * 与运行时"routeNames 全量吸收进白名单"的行为严格一致。
 */
function extractWhitelist(content: string, app: string): Set<string> {
  const setMatch = content.match(/new Set<[^>]+>\s*\(\s*\[([^\]]+)\]/s)
  if (!setMatch) return new Set()

  const body = setMatch[1]!
  const names = new Set<string>([...body.matchAll(/'([A-Za-z][\w-]*)'/g)].map((m) => m[1]!))

  // import { routeNames as <alias> } from '@/modules/<module>/routes'
  const aliasToModule = new Map<string, string>()
  const importRe =
    /import\s*\{\s*routeNames\s+as\s+(\w+)\s*\}\s*from\s*'@\/modules\/([\w-]+)\/routes'/g
  for (const m of content.matchAll(importRe)) aliasToModule.set(m[1]!, m[2]!)

  for (const m of body.matchAll(/\.\.\.(\w+)/g)) {
    const moduleName = aliasToModule.get(m[1]!)
    if (!moduleName) continue
    try {
      for (const n of extractRouteNames(
        readAppText(app, `src/modules/${moduleName}/routes/index.ts`)
      )) {
        names.add(n)
      }
    } catch {
      // 展开指向的模块无 routes 文件：运行时吸收为空集，此处同样忽略
    }
  }
  return names
}

// ─── 主流程 ───────────────────────────────────────────────────

const apps = discoverApps()
let totalErrors = 0

console.log(`🔍 检查路由配置一致性（${apps.length} 个应用）...\n`)

// E. 注册表反向校验：apps/ 下发现的应用（含 src/modules）必须登记 apps-registry.mjs。
//    漏登记是高危静默失效点（2026-10-23 扩展性审查 P0）——boundary-apps-<new> ESLint
//    规则不会生成（新 app 引用兄弟 app 无 error 拦截），requiredFor 返回空集让 B/C
//    校验静默跳过，网关校验也不覆盖它：三道防线同时失明，唯有反向校验能暴露。
const registeredApps = new Set(APPS.map((entry) => entry.name))
for (const app of apps) {
  if (!registeredApps.has(app)) {
    console.error(
      `✖ [E] apps/${app} 存在 src/modules 但未登记 scripts/apps-registry.mjs（ESLint 边界规则 / B/C 兜底校验 / 网关校验将静默跳过它）`
    )
    totalErrors++
  }
}

for (const app of apps) {
  const whitelistedNames = extractWhitelist(readAppText(app, 'src/router/whitelist.ts'), app)
  const implementedNames = extractImplementedNames(app)
  const required = requiredFor(app)
  const routesGlob = `apps/${app}/src/modules/**/routes/*.ts`

  const checks: Array<[string, boolean]> = [
    // A. whitelist 元素必须在实际 routes 中存在（豁免前缀跳过此检查）
    ...[...whitelistedNames]
      .filter((name) => !isExempt(name))
      .map((name): [string, boolean] => [
        `[A] whitelist 中的 '${name}' 必须在 ${routesGlob} 或 router/index.ts 中存在（当前${implementedNames.has(name) ? '✓' : '✗ 缺失'}）`,
        implementedNames.has(name),
      ]),

    // B. 系统兜底名单必须在 whitelist 中（任何项目都必须能匿名访问的兜底）
    ...required.map((name): [string, boolean] => [
      `[B] 系统路由 '${name}' 必须在 whitelist 中（兜底页面必须能匿名访问）`,
      whitelistedNames.has(name),
    ]),

    // C. 系统兜底名单必须在实际 routes 中实现
    ...required.map((name): [string, boolean] => [
      `[C] 系统路由 '${name}' 必须在 ${routesGlob} 或 router/index.ts 中实现（兜底页面必须有真实路由）`,
      implementedNames.has(name),
    ]),

    // D. 双向一致性最终汇总（豁免前缀不参与对比）
    [
      (() => {
        const whitelistedEffective = [...whitelistedNames].filter((n) => !isExempt(n))
        const implementedEffective = [...implementedNames].filter((n) => !isExempt(n))
        return `[D] 双向一致性：whitelisted(${whitelistedEffective.length}) ⊆ implemented(${implementedEffective.length})（已豁免前缀: ${EXEMPT_PREFIXES.join(', ')}）`
      })(),
      (() => {
        const whitelistedEffective = new Set([...whitelistedNames].filter((n) => !isExempt(n)))
        return [...whitelistedEffective].every((n) => implementedNames.has(n))
      })(),
    ],
  ]

  let appErrors = 0
  console.log(`━━━ ${app} ━━━`)
  for (const [message, ok] of checks) {
    if (ok) {
      console.log(`✓ ${message}`)
    } else {
      console.error(`✖ ${message}`)
      appErrors++
    }
  }

  console.log('')
  console.log(
    `whitelist 白名单：${whitelistedNames.size} 个（${[...whitelistedNames].sort().join(', ')}）`
  )
  console.log(
    `routes 实现：${implementedNames.size} 个（${[...implementedNames].sort().join(', ')}）`
  )
  console.log('')

  totalErrors += appErrors
}

// ─── 网关配置校验（同 apps-registry 单源，CI 单点覆盖）──────────
// nginx.dev.conf 是静态配置无法 import 注册表，漏配 location/<port> 只在
// dev:gateway 真机访问时才暴露——此处复跑同一校验函数把漂移前置到 CI 阶段。

console.log('━━━ 网关配置（docker/nginx.dev.conf vs apps-registry）━━━')
const gatewayErrors = validateGatewayConf()
if (gatewayErrors.length === 0) {
  console.log(`✓ 网关 location 名单与端口接线一致（${APPS.length} 个 app）`)
} else {
  for (const message of gatewayErrors) console.error(`✖ ${message}`)
  totalErrors += gatewayErrors.length
}
console.log('')

console.log('━━━ 端口双写锁死（apps-registry.mjs port ↔ vite.config.ts portOffset）━━━')
const portErrors = validatePortWiring()
if (portErrors.length === 0) {
  console.log(`✓ ${APPS.length} 个 app 的注册表端口与 vite.config portOffset 推导一致`)
} else {
  for (const message of portErrors) console.error(`✖ ${message}`)
  totalErrors += portErrors.length
}
console.log('')

if (totalErrors > 0) {
  console.error(`✖ 共 ${totalErrors} 个错误`)
  process.exit(1)
} else {
  console.log(`✓ 所有应用的路由检查通过（${apps.join(' / ')}）`)
}
