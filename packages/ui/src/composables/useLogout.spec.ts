import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// P4 跨应用统一登录协议：登出改整页 location.href 跳 apps/auth（跨 app 无共享 router），
// 不再有 useAppRouter.goLogin；jsdom 的 Location.href 不可拦截，经 stubGlobal 整体替换
const fakeLocation = { href: 'http://localhost/workbench' }

const { mockStoreLogout, mockUseConfirm } = vi.hoisted(() => ({
  mockStoreLogout: vi.fn(),
  mockUseConfirm: vi.fn(),
}))

// '@/composables/useConfirm' 与 useLogout.ts 的相对导入 './useConfirm.ts'
// 解析到同一物理文件（ui 包内），mock 按解析路径生效
vi.mock('@/composables/useConfirm', () => ({
  useConfirm: mockUseConfirm,
}))

vi.mock('@vv/shared', () => ({
  useUserStore: () => ({ logout: mockStoreLogout }),
}))

import { useLogout } from './useLogout'

beforeEach(() => {
  mockStoreLogout.mockReset()
  mockUseConfirm.mockReset()
  fakeLocation.href = 'http://localhost/workbench'
  vi.stubGlobal('location', fakeLocation)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLogout', () => {
  it('初始 loggingOut 为 false', () => {
    const { loggingOut } = useLogout()
    expect(loggingOut.value).toBe(false)
  })

  it('confirm 取消时 logout 与跳转均不触发', async () => {
    mockUseConfirm.mockResolvedValueOnce(false)
    const { loggingOut, confirmLogout } = useLogout()
    await confirmLogout()
    expect(mockStoreLogout).not.toHaveBeenCalled()
    expect(window.location.href).toBe('http://localhost/workbench')
    expect(loggingOut.value).toBe(false)
  })

  it('confirm 确认后：logout + 整页跳 apps/auth 登录页，loggingOut 复位（P4）', async () => {
    mockUseConfirm.mockResolvedValueOnce(true)
    mockStoreLogout.mockResolvedValueOnce(undefined)
    const { loggingOut, confirmLogout } = useLogout()
    await confirmLogout()
    expect(mockStoreLogout).toHaveBeenCalledTimes(1)
    // 未注入 VITE_AUTH_ORIGIN 时回落 '/auth'（与 redirectToAuthLogin 同语义）
    expect(window.location.href).toBe('/auth/login')
    expect(loggingOut.value).toBe(false)
  })

  it('跳转抛错时 loggingOut 在 finally 中复位', async () => {
    mockUseConfirm.mockResolvedValueOnce(true)
    mockStoreLogout.mockResolvedValueOnce(undefined)
    // 用带 throw setter 的 fake location 模拟整页跳转失败
    vi.stubGlobal('location', {
      set href(_v: string) {
        throw new Error('boom')
      },
    })
    const { loggingOut, confirmLogout } = useLogout()
    await expect(confirmLogout()).rejects.toThrow('boom')
    expect(loggingOut.value).toBe(false)
  })
})
