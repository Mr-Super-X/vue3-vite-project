import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mockPush, mockRouterStoreReset } = vi.hoisted(() => ({
  mockPush: vi.fn().mockResolvedValue(undefined),
  mockRouterStoreReset: vi.fn(),
}))

vi.mock('@/router', () => ({
  router: { push: mockPush },
}))

vi.mock('./router', () => ({
  useRouterStore: () => ({ $reset: mockRouterStoreReset }),
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
  clearCookies: vi.fn(),
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
  resetRouterState: vi.fn(),
}))

import { useUserStore } from './user'
import { authApi } from '@/api/modules/auth'
import { Session, clearCookies } from '@/utils/storage'
import { globalAbort } from '@/api/global-abort'
import { resetRouterState } from '@/router/guards/auth'

const mockAuthLogout = authApi.logout as ReturnType<typeof vi.fn>
const mockSessionRemove = Session.remove as ReturnType<typeof vi.fn>
const mockClearCookies = clearCookies as ReturnType<typeof vi.fn>
const mockGlobalAbortAbort = globalAbort.abort as ReturnType<typeof vi.fn>
const mockGlobalAbortReset = globalAbort.reset as ReturnType<typeof vi.fn>
const mockResetRouter = resetRouterState as ReturnType<typeof vi.fn>

beforeEach(() => {
  setActivePinia(createPinia())
  mockAuthLogout.mockReset()
  mockSessionRemove.mockReset()
  mockClearCookies.mockReset()
  mockGlobalAbortAbort.mockReset()
  mockGlobalAbortReset.mockReset()
  mockResetRouter.mockReset()
  mockRouterStoreReset.mockReset()
  mockPush.mockReset()
})

describe('userStore.logout()', () => {
  it('成功路径：先调后端 logout，再清本地 + 跳转', async () => {
    mockAuthLogout.mockResolvedValueOnce(undefined)
    const store = useUserStore()
    store.token = 'mock'
    store.profile = { id: 1, name: 'A', permissions: ['p1'] }
    store.permissions = ['p1']

    await store.logout()

    expect(mockAuthLogout).toHaveBeenCalledTimes(1)
    expect(mockSessionRemove).toHaveBeenCalledWith('token')
    expect(mockClearCookies).toHaveBeenCalledTimes(1)
    expect(mockGlobalAbortAbort).toHaveBeenCalledWith('logout')
    expect(mockResetRouter).toHaveBeenCalledTimes(1)
    expect(mockRouterStoreReset).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/login')
    expect(mockGlobalAbortReset).toHaveBeenCalledTimes(1)
    expect(store.token).toBe('')
    expect(store.profile).toBe(null)
    expect(store.permissions).toEqual([])
  })

  it('失败路径：后端 logout 抛错时不执行任何清理', async () => {
    const apiError = new Error('server error')
    mockAuthLogout.mockRejectedValueOnce(apiError)
    const store = useUserStore()
    store.token = 'mock'

    await expect(store.logout()).rejects.toThrow('server error')

    expect(mockSessionRemove).not.toHaveBeenCalled()
    expect(mockClearCookies).not.toHaveBeenCalled()
    expect(mockGlobalAbortAbort).not.toHaveBeenCalled()
    expect(mockGlobalAbortReset).not.toHaveBeenCalled()
    expect(mockResetRouter).not.toHaveBeenCalled()
    expect(mockRouterStoreReset).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
    expect(store.token).toBe('mock')
  })
})
