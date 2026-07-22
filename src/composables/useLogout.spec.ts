import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: vi.fn() },
}))

const mockStoreLogout = vi.fn()
vi.mock('@/store/modules/user', () => ({
  useUserStore: () => ({ logout: mockStoreLogout }),
}))

import { ElMessageBox } from 'element-plus'
import { useLogout } from './useLogout'

beforeEach(() => {
  mockStoreLogout.mockReset()
  ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockReset()
})

describe('useLogout', () => {
  it('初始 loggingOut 为 false', () => {
    const { loggingOut } = useLogout()
    expect(loggingOut.value).toBe(false)
  })

  it('confirm 取消时 store.logout 不调用', async () => {
    ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('cancel'))
    const { loggingOut, confirmLogout } = useLogout()
    await confirmLogout()
    expect(mockStoreLogout).not.toHaveBeenCalled()
    expect(loggingOut.value).toBe(false)
  })

  it('confirm 确认 + store 成功时 loggingOut 复位', async () => {
    ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce('ok')
    mockStoreLogout.mockResolvedValueOnce(undefined)
    const { loggingOut, confirmLogout } = useLogout()
    await confirmLogout()
    expect(loggingOut.value).toBe(false)
    expect(mockStoreLogout).toHaveBeenCalledTimes(1)
  })

  it('store 抛错时 loggingOut 在 finally 中复位', async () => {
    ;(ElMessageBox.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce('ok')
    mockStoreLogout.mockRejectedValueOnce(new Error('boom'))
    const { loggingOut, confirmLogout } = useLogout()
    await expect(confirmLogout()).rejects.toThrow('boom')
    expect(loggingOut.value).toBe(false)
  })
})
