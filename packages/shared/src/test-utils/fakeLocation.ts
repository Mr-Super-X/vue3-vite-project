/**
 * jsdom Location 整页跳转断言的共享测试夹具。
 *
 * 背景（2026-10-30 测试基建）：统一登录协议 / 登出流程的 spec 需断言 `window.location.href`
 * 整页跳转——jsdom 的 Location 无法被 vitest spy 拦截赋值，必须 `vi.stubGlobal` 整体替换。
 * 该样板曾在 4 个 spec 逐字重复（Login / auth redirect / router-guards login / useLogout），
 * 收敛为本模块的标准入口；后续新 spec 有整页跳转断言时一律经此夹具，不再各自手写。
 *
 * 用法（spec 三件套）：
 * ```ts
 * const fakeLocation = createFakeLocation('http://localhost/login')
 * beforeEach(() => {
 *   fakeLocation.href = 'http://localhost/login' // 每用例重置初始值
 *   fakeLocation.search = ''
 *   installFakeLocation(fakeLocation)
 * })
 * afterEach(() => { vi.unstubAllGlobals() })
 * ```
 * 特例（断言跳转抛错路径）：`vi.stubGlobal('location', { set href(v) { throw ... } })` 仍
 * 就地书写，不属于本夹具的常规形态。
 *
 * @group 测试基建
 */
import { vi } from 'vitest'

/** fake location 对象形态（索引签名容纳各 spec 的扩展字段，如 throw setter 之外的额外属性） */
export interface FakeLocation {
  href: string
  search: string
  [key: string]: unknown
}

/** 创建 fake location 对象（href 模拟初始导航完成态，search 预置空串） */
export function createFakeLocation(href = 'http://localhost/'): FakeLocation {
  return { href, search: '' }
}

/** 安装：stubGlobal 整体替换 window.location（在 spec 的 beforeEach 中调用，配合 afterEach 的 unstabAllGlobals） */
export function installFakeLocation(fake: FakeLocation): void {
  vi.stubGlobal('location', fake)
}
