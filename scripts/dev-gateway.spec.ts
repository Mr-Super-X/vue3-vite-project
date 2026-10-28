/**
 * dev-gateway 纯函数单测（node:test runner）——/autoplan E8。
 *
 * 覆盖：resolveAppSubset（未知 app 名抛错）/ resolveRootRedirect（portal 优先 + 空子集防御）。
 * 守卫已统一为 invokedDirectly 模式（与 check-* 脚本一致），import 本模块不触发 main()。
 *
 * 运行：pnpm test:gateway（与 node-gateway.spec.ts 同批）
 * @see scripts/dev-gateway.ts —— 被测实现
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolveAppSubset, resolveRootRedirect } from './dev-gateway.ts'

// 当前注册表形状（apps-registry 派生）：name/port 用于构造最小子集夹具
type AppEntry = { name: string; port: number; requiredRoutes: string[] }
const entry = (name: string, port: number): AppEntry => ({
  name,
  port,
  requiredRoutes: ['NotFound'],
})

test('resolveAppSubset：未知 app 名抛错并列出可用项', () => {
  assert.throws(() => resolveAppSubset(['ghost-app']), /未知 app 名：ghost-app/)
})

test('resolveRootRedirect：子集含 portal → /portal/', () => {
  assert.equal(resolveRootRedirect([entry('admin', 5174), entry('portal', 5176)]), '/portal/')
})

test('resolveRootRedirect：无 portal → 跳子集第一个', () => {
  assert.equal(resolveRootRedirect([entry('auth', 5179), entry('admin', 5174)]), '/auth/')
})

test('resolveRootRedirect：空子集抛错（防御未来调用方）', () => {
  assert.throws(() => resolveRootRedirect([]), /空子集无根 302 目标/)
})
