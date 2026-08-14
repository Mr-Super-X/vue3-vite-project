import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import type { useUserStore } from '@/store/modules/user'

vi.mock('@/utils/storage', () => ({
  Session: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  Local: { set: vi.fn(), get: vi.fn(), remove: vi.fn(), clear: vi.fn() },
}))

import { checkLoginState } from './login'
import { Session } from '@/utils/storage'

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

  it('无登录标记 → 跳 /login 并携带 redirect', async () => {
    mockSessionGet.mockReturnValue(null)
    const store = makeStore()
    const result = await checkLoginState(to, store)
    expect(result).toEqual({ path: '/login', query: { redirect: '/orders?page=1' } })
    expect(store.fetchProfile).not.toHaveBeenCalled()
  })

  it('有标记但 profile 未恢复 → fetchProfile 成功后放行（hard refresh 恢复）', async () => {
    mockSessionGet.mockReturnValue(true)
    const store = makeStore()
    const result = await checkLoginState(to, store)
    expect(store.authenticated).toBe(true)
    expect(store.fetchProfile).toHaveBeenCalledTimes(1)
    expect(result).toBeNull()
  })

  it('凭证失效（fetchProfile 失败）→ 清本地标记并跳 /login', async () => {
    mockSessionGet.mockReturnValue(true)
    const store = makeStore({
      fetchProfile: vi.fn().mockRejectedValue(new Error('401')),
    })
    const result = await checkLoginState(to, store)
    expect(store.resetLocalState).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ path: '/login', query: { redirect: '/orders?page=1' } })
  })
})
