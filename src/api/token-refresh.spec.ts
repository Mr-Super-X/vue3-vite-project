import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock axios BEFORE importing token-refresh
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('@/utils/storage', () => ({
  Session: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
  clearCookies: vi.fn(),
  Local: { set: vi.fn(), get: vi.fn(), remove: vi.fn(), clear: vi.fn() },
}))

import axios from 'axios'
import { Session } from '@/utils/storage'
import {
  getValidToken,
  configureTokenRefresh,
  _resetRefreshing,
  _getCurrentConfig,
} from './token-refresh'

const mockAxiosPost = axios.post as ReturnType<typeof vi.fn>
const mockSessionSet = Session.set as ReturnType<typeof vi.fn>

beforeEach(() => {
  _resetRefreshing()
  mockAxiosPost.mockReset()
  mockSessionSet.mockReset()
  // 重置为默认配置：让默认 fetchToken（含 baseURL fallback）生效，
  // 个别测试按需覆盖
  configureTokenRefresh({
    url: '/auth/refresh',
  })
})

describe('getValidToken（基础）', () => {
  it('成功 refresh 后返回新 token 并写入 Session', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { code: 200, message: 'ok', data: { token: 'new-token-abc' } },
    })
    const token = await getValidToken()
    expect(token).toBe('new-token-abc')
    expect(mockSessionSet).toHaveBeenCalledWith('token', 'new-token-abc')
  })

  it('refresh 接口地址使用默认 /auth/refresh', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { code: 200, data: { token: 'tok' } },
    })
    await getValidToken()
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.anything(),
      expect.any(Object)
    )
  })
})

describe('getValidToken（失败处理）', () => {
  it('refresh 接口 reject 时抛错，refreshingPromise 清空', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('network error'))
    await expect(getValidToken()).rejects.toThrow('network error')
    // 验证下次调用可重新发起（refreshingPromise 已清空）
    mockAxiosPost.mockResolvedValueOnce({
      data: { code: 200, data: { token: 'tok2' } },
    })
    const token = await getValidToken()
    expect(token).toBe('tok2')
  })

  it('refresh 响应无 token 字段时抛错', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { code: 200, data: {} },
    })
    await expect(getValidToken()).rejects.toThrow(/no token/i)
  })

  it('refresh 响应 data.code 非 200 也视作失败（extractToken 返回 null）', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { code: 401, message: 'unauthorized', data: null },
    })
    await expect(getValidToken()).rejects.toThrow(/no token/i)
  })
})

describe('getValidToken（并发去重）', () => {
  it('5 个并发调用只发一次 refresh 请求', async () => {
    let callCount = 0
    mockAxiosPost.mockImplementation(async () => {
      callCount++
      // 模拟 50ms 延迟，让所有调用进入等待
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { data: { code: 200, data: { token: 'shared-token' } } }
    })

    const results = await Promise.all([
      getValidToken(),
      getValidToken(),
      getValidToken(),
      getValidToken(),
      getValidToken(),
    ])

    expect(callCount).toBe(1)
    expect(results.every((t) => t === 'shared-token')).toBe(true)
  })

  it('并发调用失败后，下一次调用可以重新发起', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('fail'))
    await expect(getValidToken()).rejects.toThrow()
    mockAxiosPost.mockResolvedValueOnce({
      data: { code: 200, data: { token: 'after-retry' } },
    })
    const token = await getValidToken()
    expect(token).toBe('after-retry')
  })
})

describe('configureTokenRefresh（自定义配置）', () => {
  it('修改 url 后使用新 URL', async () => {
    configureTokenRefresh({ url: '/custom/refresh' })
    mockAxiosPost.mockResolvedValueOnce({
      data: { code: 200, data: { token: 'tok' } },
    })
    await getValidToken()
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/custom/refresh'),
      expect.anything(),
      expect.any(Object)
    )
  })

  it('自定义 extractToken 函数生效', async () => {
    configureTokenRefresh({
      extractToken: (data) => {
        if (data && typeof data === 'object') {
          const custom = data as { access_token?: unknown }
          return typeof custom.access_token === 'string' ? custom.access_token : null
        }
        return null
      },
    })
    mockAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'custom-format-token' },
    })
    const token = await getValidToken()
    expect(token).toBe('custom-format-token')
  })

  it('自定义 fetchToken 函数完全接管请求逻辑', async () => {
    const customFetch = vi.fn().mockResolvedValue({
      data: { custom: 'response' },
      token: 'from-custom-fetch',
    })
    configureTokenRefresh({
      url: '/ignored',
      fetchToken: customFetch,
      extractToken: (data) => {
        if (data && typeof data === 'object') {
          return ((data as { token?: unknown }).token as string) ?? null
        }
        return null
      },
    })
    const token = await getValidToken()
    expect(token).toBe('from-custom-fetch')
    expect(customFetch).toHaveBeenCalledTimes(1)
    // 验证 axios.post 没被调用（自定义 fetch 接管）
    expect(mockAxiosPost).not.toHaveBeenCalled()
  })
})

describe('_getCurrentConfig', () => {
  it('返回当前生效的配置（只读）', () => {
    const config = _getCurrentConfig()
    expect(config.url).toBe('/auth/refresh')
    expect(typeof config.fetchToken).toBe('function')
    expect(typeof config.extractToken).toBe('function')
  })
})
