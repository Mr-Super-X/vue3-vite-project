import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mockRouterStoreReset, mockPreloadDict } = vi.hoisted(() => ({
  mockRouterStoreReset: vi.fn(),
  mockPreloadDict: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./router', () => ({
  useRouterStore: () => ({ $reset: mockRouterStoreReset }),
}))

vi.mock('./dict', () => ({
  useDictStore: () => ({ preloadDict: mockPreloadDict }),
}))

vi.mock('@/api/modules/auth', () => ({
  authApi: {
    login: vi.fn(),
    fetchProfile: vi.fn(),
    logout: vi.fn(),
  },
}))
vi.mock('@/utils/storage', () => ({
  Session: { remove: vi.fn(), set: vi.fn(), get: vi.fn() },
  Local: { set: vi.fn(), get: vi.fn(), remove: vi.fn(), clear: vi.fn() },
}))
vi.mock('@/api/global-abort', () => ({
  globalAbort: {
    signal: new AbortController().signal,
    abort: vi.fn(),
    reset: vi.fn(),
  },
}))
vi.mock('@/router/guards/auth', () => ({
  resetAuthGuardState: vi.fn(),
}))

import { useUserStore } from './user'
import { authApi } from '@/api/modules/auth'
import { Session } from '@/utils/storage'
import { globalAbort } from '@/api/global-abort'
import { resetAuthGuardState } from '@/router/guards/auth'

const mockAuthLogin = authApi.login as ReturnType<typeof vi.fn>
const mockAuthFetchProfile = authApi.fetchProfile as ReturnType<typeof vi.fn>
const mockAuthLogout = authApi.logout as ReturnType<typeof vi.fn>
const mockSessionSet = Session.set as ReturnType<typeof vi.fn>
const mockSessionRemove = Session.remove as ReturnType<typeof vi.fn>
const mockGlobalAbortAbort = globalAbort.abort as ReturnType<typeof vi.fn>
const mockGlobalAbortReset = globalAbort.reset as ReturnType<typeof vi.fn>
const mockResetGuard = resetAuthGuardState as ReturnType<typeof vi.fn>

beforeEach(() => {
  setActivePinia(createPinia())
  mockAuthLogin.mockReset()
  mockAuthFetchProfile.mockReset()
  mockAuthLogout.mockReset()
  mockSessionSet.mockReset()
  mockSessionRemove.mockReset()
  mockGlobalAbortAbort.mockReset()
  mockGlobalAbortReset.mockReset()
  mockResetGuard.mockReset()
  mockRouterStoreReset.mockReset()
  mockPreloadDict.mockReset().mockResolvedValue(undefined)
})

describe('userStore.login()', () => {
  it('成功路径：写登录标记 + 拉 profile + 预加载字典', async () => {
    mockAuthLogin.mockResolvedValueOnce({ profile: { id: 1, name: 'Admin' } })
    mockAuthFetchProfile.mockResolvedValueOnce({
      id: 1,
      name: 'Admin',
      permissions: ['user:view'],
    })
    const store = useUserStore()

    await store.login({ username: 'admin', password: '123456' })

    // httpOnly 模式：不存 token，只写无敏感信息的登录标记
    expect(mockSessionSet).toHaveBeenCalledWith('auth', true)
    expect(store.authenticated).toBe(true)
    expect(store.isLoggedIn).toBe(true)
    expect(mockAuthFetchProfile).toHaveBeenCalledTimes(1)
    expect(store.profile).toEqual({ id: 1, name: 'Admin', permissions: ['user:view'] })
    expect(store.permissions).toEqual(['user:view'])
    expect(mockPreloadDict).toHaveBeenCalledTimes(1)
  })

  it('字典预加载失败不阻塞登录（console.warn 兜底）', async () => {
    mockAuthLogin.mockResolvedValueOnce({})
    mockAuthFetchProfile.mockResolvedValueOnce({ id: 1, name: 'A', permissions: [] })
    mockPreloadDict.mockRejectedValueOnce(new Error('dict error'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = useUserStore()

    await store.login({ username: 'admin', password: '123456' })

    expect(store.isLoggedIn).toBe(true)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('userStore.logout()（乐观退出）', () => {
  it('成功路径：先清本地登录态，再通知后端', async () => {
    mockAuthLogout.mockResolvedValueOnce(undefined)
    const store = useUserStore()
    store.authenticated = true
    store.profile = { id: 1, name: 'A', permissions: ['p1'] }
    store.permissions = ['p1']

    await store.logout()

    // 本地清理全套
    expect(mockSessionRemove).toHaveBeenCalledWith('auth')
    expect(store.authenticated).toBe(false)
    expect(store.profile).toBe(null)
    expect(store.permissions).toEqual([])
    expect(mockGlobalAbortAbort).toHaveBeenCalledWith('logout')
    expect(mockResetGuard).toHaveBeenCalledTimes(1)
    expect(mockRouterStoreReset).toHaveBeenCalledTimes(1)
    expect(mockGlobalAbortReset).toHaveBeenCalledTimes(1)
    // 后端通知已发出
    expect(mockAuthLogout).toHaveBeenCalledTimes(1)
  })

  it('后端 logout 失败：本地仍清理 + 不抛错 + console.warn', async () => {
    mockAuthLogout.mockRejectedValueOnce(new Error('server down'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = useUserStore()
    store.authenticated = true

    // 乐观语义：后端失败不影响本地退出
    await expect(store.logout()).resolves.toBeUndefined()

    expect(mockSessionRemove).toHaveBeenCalledWith('auth')
    expect(store.authenticated).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('userStore.resetLocalState()', () => {
  it('清标记 + 清状态 + abort/reset + 守卫/routerStore 重置', () => {
    const store = useUserStore()
    store.authenticated = true
    store.profile = { id: 1, name: 'A', permissions: [] }

    store.resetLocalState()

    expect(mockSessionRemove).toHaveBeenCalledWith('auth')
    expect(store.authenticated).toBe(false)
    expect(store.profile).toBe(null)
    expect(mockGlobalAbortAbort).toHaveBeenCalledWith('logout')
    expect(mockResetGuard).toHaveBeenCalledTimes(1)
    expect(mockRouterStoreReset).toHaveBeenCalledTimes(1)
    expect(mockGlobalAbortReset).toHaveBeenCalledTimes(1)
    // resetLocalState 不触碰后端
    expect(mockAuthLogout).not.toHaveBeenCalled()
  })
})
