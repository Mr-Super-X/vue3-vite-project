import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: vi.fn() },
}))

const { mockStoreLogout, mockGoLogin } = vi.hoisted(() => ({
  mockStoreLogout: vi.fn(),
  mockGoLogin: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/store/modules/user', () => ({
  useUserStore: () => ({ logout: mockStoreLogout }),
}))

vi.mock('@/composables/useAppRouter', () => ({
  useAppRouter: () => ({ goLogin: mockGoLogin }),
}))

import { ElMessageBox } from 'element-plus'
import { useLogout } from './useLogout'

beforeEach(() => {
  mockStoreLogout.mockReset()
  mockGoLogin.mockReset().mockResolvedValue(undefined)
  ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockReset()
})

describe('useLogout', () => {
  it('初始 loggingOut 为 false', () => {
    const { loggingOut } = useLogout()
    expect(loggingOut.value).toBe(false)
  })

  it('confirm 取消时 logout 与跳转均不触发', async () => {
    ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('cancel'))
    const { loggingOut, confirmLogout } = useLogout()
    await confirmLogout()
    expect(mockStoreLogout).not.toHaveBeenCalled()
    expect(mockGoLogin).not.toHaveBeenCalled()
    expect(loggingOut.value).toBe(false)
  })

  it('confirm 确认后：logout + 跳登录页，loggingOut 复位', async () => {
    ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce('ok')
    mockStoreLogout.mockResolvedValueOnce(undefined)
    const { loggingOut, confirmLogout } = useLogout()
    await confirmLogout()
    expect(mockStoreLogout).toHaveBeenCalledTimes(1)
    expect(mockGoLogin).toHaveBeenCalledTimes(1)
    expect(loggingOut.value).toBe(false)
  })

  it('跳转抛错时 loggingOut 在 finally 中复位', async () => {
    ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce('ok')
    mockStoreLogout.mockResolvedValueOnce(undefined)
    mockGoLogin.mockRejectedValueOnce(new Error('boom'))
    const { loggingOut, confirmLogout } = useLogout()
    await expect(confirmLogout()).rejects.toThrow('boom')
    expect(loggingOut.value).toBe(false)
  })
})
