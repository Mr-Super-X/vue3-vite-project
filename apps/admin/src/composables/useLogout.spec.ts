import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockStoreLogout, mockGoLogin, mockUseConfirm } = vi.hoisted(() => ({
  mockStoreLogout: vi.fn(),
  mockGoLogin: vi.fn().mockResolvedValue(undefined),
  mockUseConfirm: vi.fn(),
}))

// useLogout 经 AutoImport 注入 useConfirm，转换后即 '@/composables/useConfirm'
vi.mock('@/composables/useConfirm', () => ({
  useConfirm: mockUseConfirm,
}))

vi.mock('@/store/modules/user', () => ({
  useUserStore: () => ({ logout: mockStoreLogout }),
}))

vi.mock('@/composables/useAppRouter', () => ({
  useAppRouter: () => ({ goLogin: mockGoLogin }),
}))

import { useLogout } from './useLogout'

beforeEach(() => {
  mockStoreLogout.mockReset()
  mockGoLogin.mockReset().mockResolvedValue(undefined)
  mockUseConfirm.mockReset()
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
    expect(mockGoLogin).not.toHaveBeenCalled()
    expect(loggingOut.value).toBe(false)
  })

  it('confirm 确认后：logout + 跳登录页，loggingOut 复位', async () => {
    mockUseConfirm.mockResolvedValueOnce(true)
    mockStoreLogout.mockResolvedValueOnce(undefined)
    const { loggingOut, confirmLogout } = useLogout()
    await confirmLogout()
    expect(mockStoreLogout).toHaveBeenCalledTimes(1)
    expect(mockGoLogin).toHaveBeenCalledTimes(1)
    expect(loggingOut.value).toBe(false)
  })

  it('跳转抛错时 loggingOut 在 finally 中复位', async () => {
    mockUseConfirm.mockResolvedValueOnce(true)
    mockStoreLogout.mockResolvedValueOnce(undefined)
    mockGoLogin.mockRejectedValueOnce(new Error('boom'))
    const { loggingOut, confirmLogout } = useLogout()
    await expect(confirmLogout()).rejects.toThrow('boom')
    expect(loggingOut.value).toBe(false)
  })
})
