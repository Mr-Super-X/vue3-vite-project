/**
 * check-routes 单测（node:test runner）——校验器假阳性守护（/autoplan E3）。
 *
 * 业务背景：check-routes 是 CI 阻断级门禁（A-D 一致性 + E 注册表反向校验 + manifest
 * 完整性），路由名/白名单的解析正则一旦漂移会让校验静默失效。本 spec 表驱动守护
 * 纯文本解析层：extractRouteNames（routes name 提取）/ extractWhitelist 字面量形态
 * / isExempt / requiredFor；alias 展开路径（importRe + expandAlias）经真实仓库
 * portal/auth 文件做行为断言（/autoplan R2-E8——原「CLI 每日运行天然覆盖」论证不成立：
 * CLI 全绿无法区分「真一致」与「解析退化为空集」）。
 *
 * 运行：pnpm test:check-scripts
 * @see scripts/check-routes.ts —— 被测实现
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  EXEMPT_PREFIXES,
  extractRouteNames,
  extractWhitelist,
  isExempt,
  requiredFor,
} from './check-routes.ts'

// ── extractRouteNames：routes 文件 name 提取 ───────────────────

test('extractRouteNames：提取 name 字段并去重', () => {
  const content = `
    { path: '/a', name: 'UserList', component: A },
    { path: '/b', name: 'UserEdit', component: B },
    { path: '/c', name: 'UserList', component: C },
  `
  assert.deepEqual(extractRouteNames(content), ['UserList', 'UserEdit'])
})

test('extractRouteNames：无 name → 空数组', () => {
  assert.deepEqual(extractRouteNames(`{ path: '/a' }`), [])
})

test('extractRouteNames：数字开头 name 不合法不提取', () => {
  assert.deepEqual(extractRouteNames(`name: '9abc'`), [])
})

// ── extractWhitelist：三种形态的字面量解析（无 alias 展开，不触文件系统） ──

test('extractWhitelist：形态 1 createWhiteList 字面量 + 行注释剥离', () => {
  const content = `
export const ROUTE_WHITE_LIST = createWhiteList(
  'NotFound', // 兜底
  'Home'
)`
  assert.deepEqual([...extractWhitelist(content, 'app')].sort(), ['Home', 'NotFound'])
})

test('extractWhitelist：形态 3 new Set 纯字面量', () => {
  const content = `const W = new Set<string>([ 'Forbidden', 'NotFound', 'ServerError' ])`
  assert.deepEqual([...extractWhitelist(content, 'app')].sort(), [
    'Forbidden',
    'NotFound',
    'ServerError',
  ])
})

test('extractWhitelist：无匹配形态 → 空集', () => {
  assert.deepEqual([...extractWhitelist(`const x = 1`, 'app')], [])
})

// ── extractWhitelist：alias 展开路径（真实仓库行为断言，/autoplan R2-E8） ──
// alias 展开正则（importRe + expandAlias）是运行时吸收行为的对齐点，回归会让
// A/D 校验静默失效且纯字面量 spec 全绿。此处对真实仓库文件做行为断言：
// portal/auth 的 whitelist 均为 `createWhiteList('NotFound', xxxRouteNames)` 形态，
// 展开结果必须含模块 routes 的真实 name（Home / Login）。

test('extractWhitelist：alias 展开吸收 portal home 模块路由名（真实仓库回归）', () => {
  const whitelistPath = fileURLToPath(
    new URL('../apps/portal/src/router/whitelist.ts', import.meta.url)
  )
  const content = readFileSync(whitelistPath, 'utf-8')
  const names = extractWhitelist(content, 'portal')
  assert.ok(names.has('NotFound'), '字面量 NotFound 应保留')
  assert.ok(names.has('Home'), 'alias 展开应吸收 home 模块的 Home（check:routes 已证实运行时吸收）')
})

test('extractWhitelist：alias 展开吸收 auth 模块路由名（真实仓库回归）', () => {
  const whitelistPath = fileURLToPath(
    new URL('../apps/auth/src/router/whitelist.ts', import.meta.url)
  )
  const content = readFileSync(whitelistPath, 'utf-8')
  const names = extractWhitelist(content, 'auth')
  assert.ok(names.has('NotFound'), '字面量 NotFound 应保留')
  assert.ok(names.has('Login'), 'alias 展开应吸收 auth 模块的 Login')
})

// ── isExempt / EXEMPT_PREFIXES ──────────────────────────────────

test('isExempt：豁免前缀命中与不命中', () => {
  assert.equal(isExempt('DemoXForm'), true)
  assert.equal(isExempt('Demo'), true)
  assert.equal(isExempt('UserList'), false)
  assert.equal(isExempt('demoLower'), false)
  assert.deepEqual([...EXEMPT_PREFIXES], ['Demo'])
})

// ── requiredFor：注册表兜底名单派生 ────────────────────────────

test('requiredFor：已登记 app 返回注册表兜底名单', () => {
  assert.deepEqual([...requiredFor('admin')].sort(), ['Forbidden', 'NotFound', 'ServerError'])
  assert.deepEqual([...requiredFor('auth')].sort(), ['Login', 'NotFound'])
  assert.deepEqual(requiredFor('portal'), ['NotFound'])
})

test('requiredFor：未登记 app → 空集（B/C 校验静默跳过，靠 E 反向校验兜底）', () => {
  assert.deepEqual(requiredFor('ghost-app'), [])
})
