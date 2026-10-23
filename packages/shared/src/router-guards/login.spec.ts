import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import type { useUserStore } from '../store/modules/user.ts'

vi.mock('../utils/storage.ts', () => ({
  Session: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  Local: { set: vi.fn(), get: vi.fn(), remove: vi.fn(), clear: vi.fn() },
}))

// P4 跨应用登录协议：未登录改 redirectToAuthLogin 整页跳 apps/auth；
// mock 掉真实实现（会赋 location.href + throw），本 spec 只断言调用契约
const { mockRedirectToAuthLogin } = vi.hoisted(() => ({
  mockRedirectToAuthLogin: vi.fn(() => {
    throw new Error('AUTH_REDIRECTING')
  }),
}))
vi.mock('../auth/redirect.ts', () => ({
  redirectToAuthLogin: mockRedirectToAuthLogin,
}))

import { checkLoginState } from './login'
import { Session } from '../utils/storage.ts'

type UserStore = ReturnType<typeof useUserStore>
const mockSessionGet = Session.get as ReturnType<typeof vi.fn>

const to = { path: '/orders', fullPath: '/orders?page=1', meta: {} } as RouteLocationNormalized

const makeStore = (overrides: Partial<UserStore> = {}): UserStore =>
  ({
    isLoggedIn: false,
    authenticated: false,
    profile: null,
    fetchProfile: vi.fn().mockResolvedValue(undefined),
    resetLocalState: vi.fn(),
    ...overrides,
  }) as unknown as UserStore

beforeEach(() => {
  mockSessionGet.mockReset()
  mockRedirectToAuthLogin.mockClear()
})

describe('checkLoginState（httpOnly 登录标记模式）', () => {
  it('已登录且 profile 已恢复 → 放行', async () => {
    const store = makeStore({
      isLoggedIn: true,
      profile: { id: 1, name: 'A', permissions: [] },
    })
    expect(await checkLoginState(to, store)).toBeNull()
    expect(store.fetchProfile).not.toHaveBeenCalled()
  })

  it('无登录标记 → 整页跳 apps/auth 登录页并携带 redirect（P4）', async () => {
    mockSessionGet.mockReturnValue(null)
    const store = makeStore()
    // mock 的 redirectToAuthLogin 抛 AUTH_REDIRECTING（与真实实现同形态）
    await expect(checkLoginState(to, store)).rejects.toThrow('AUTH_REDIRECTING')
    // P0 修复：redirect 改用 window.location.pathname+search（含 vue-router base 前缀，
    // 网关形态下不丢 /admin 前缀）；jsdom 默认 location 为 '/'，故断言 '/'
    expect(mockRedirectToAuthLogin).toHaveBeenCalledWith('/')
    expect(store.fetchProfile).not.toHaveBeenCalled()
  })

  it('网关 base 前缀不丢（P0 修复）：redirect 含 /admin/ 部署前缀', async () => {
    // 模拟 vue-router base=/admin/ 下访问受保护页：window.location 含前缀，to.fullPath 不含
    const originalLoc = window.location
    vi.stubGlobal('location', {
      ...originalLoc,
      pathname: '/admin/user/list',
      search: '?page=1',
    })
    try {
      mockSessionGet.mockReturnValue(null)
      const store = makeStore()
      await expect(checkLoginState(to, store)).rejects.toThrow('AUTH_REDIRECTING')
      // 关键断言：redirect 须含 /admin 前缀（网关联调实证 to.fullPath 会丢，致回跳 404）
      expect(mockRedirectToAuthLogin).toHaveBeenCalledWith('/admin/user/list?page=1')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('有标记但 profile 未恢复 → fetchProfile 成功后放行（hard refresh 恢复）', async () => {
    mockSessionGet.mockReturnValue(true)
    const store = makeStore()
    const result = await checkLoginState(to, store)
    expect(store.authenticated).toBe(true)
    expect(store.fetchProfile).toHaveBeenCalledTimes(1)
    expect(result).toBeNull()
  })

  it('凭证失效（fetchProfile 失败）→ 清本地标记并整页跳 apps/auth 登录页（P4）', async () => {
    mockSessionGet.mockReturnValue(true)
    const store = makeStore({
      fetchProfile: vi.fn().mockRejectedValue(new Error('401')),
    })
    await expect(checkLoginState(to, store)).rejects.toThrow('AUTH_REDIRECTING')
    expect(store.resetLocalState).toHaveBeenCalledTimes(1)
    expect(mockRedirectToAuthLogin).toHaveBeenCalledWith('/')
  })
})
