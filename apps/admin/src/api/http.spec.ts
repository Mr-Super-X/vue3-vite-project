import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BusinessCode } from '@/enums/httpEnum'
import { ApiError, isApiError } from './types/error'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from './types/api.d'
import { globalAbort } from './global-abort'

/**
 * 通过 mock axios 把 http.ts 拦截器逻辑剥离出来验证。
 *
 * 关键点：每个 axios.create() 调用会触发 mock 工厂返回新对象。
 * http.ts 在模块加载时调用一次 axios.create()，我们捕获那个实例的
 * request mock 以验证 request<T>() 是否正确转发；拦截器 handler
 * 也通过同一组 mock 工厂的闭包写入 capturedInterceptors。
 *
 * 因此测试直接使用 `httpModule.default`（即 http.ts 内部持有的 instance），
 * 避免再调用 axios.create() 创建另一个不同对象。
 */

const requestHandlers = new Map<unknown, { onFulfilled: (cfg: unknown) => unknown }>()
const responseHandlers = new Map<
  unknown,
  {
    onFulfilled: (resp: AxiosResponse<ApiResponse<unknown>>) => AxiosResponse<ApiResponse<unknown>>
    onRejected: (err: unknown) => never
  }
>()

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      create: () => {
        const requestMock = vi.fn()
        const instanceKey = Symbol('axios-instance')
        return {
          interceptors: {
            request: {
              use: (onFulfilled: (cfg: unknown) => unknown) => {
                requestHandlers.set(instanceKey, { onFulfilled })
              },
            },
            response: {
              use: (
                onFulfilled: (
                  resp: AxiosResponse<ApiResponse<unknown>>
                ) => AxiosResponse<ApiResponse<unknown>>,
                onRejected: (err: unknown) => never
              ) => {
                responseHandlers.set(instanceKey, { onFulfilled, onRejected })
              },
            },
          },
          request: requestMock,
        }
      },
    },
  }
})

// httpOnly 模式：refreshSession 由 token-refresh 模块提供，mock 掉以控制 401 流程
const { mockRefreshSession, mockRouterPush } = vi.hoisted(() => ({
  mockRefreshSession: vi.fn(),
  mockRouterPush: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./token-refresh', () => ({
  refreshSession: mockRefreshSession,
  _getCurrentConfig: () => ({ url: '/auth/refresh', refresh: vi.fn() }),
}))

// performLogout 通过动态 import('@/router') 拿实例跳转（httpOnly 改造后不再硬编码路径）
vi.mock('@/router', () => ({
  router: { push: mockRouterPush },
}))

// 必须在 mock 之后；动态 import 让 mock 生效
const httpModule = await import('./http')
const { request } = httpModule
const httpInstance = httpModule.default

// 从最近注册的拦截器中取 handler（http.ts 模块加载时调用一次 axios.create）
const getRequestHandler = () => {
  const handlers = Array.from(requestHandlers.values())
  const last = handlers[handlers.length - 1]
  if (!last) throw new Error('request handler not registered; http.ts failed to load')
  return last
}
const getResponseHandler = () => {
  const handlers = Array.from(responseHandlers.values())
  const last = handlers[handlers.length - 1]
  if (!last) throw new Error('response handler not registered; http.ts failed to load')
  return last
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  mockRefreshSession.mockReset()
  mockRouterPush.mockReset().mockResolvedValue(undefined)
  vi.clearAllMocks()
})

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('ApiError', () => {
  it('构造时设置字段', () => {
    const e = new ApiError({ code: 500, message: 'srv', status: 500, url: '/x' })
    expect(e.name).toBe('ApiError')
    expect(e.code).toBe(500)
    expect(e.status).toBe(500)
    expect(e.url).toBe('/x')
    expect(e.message).toBe('srv')
    expect(e).toBeInstanceOf(Error)
  })

  it('isApiError 类型守卫', () => {
    expect(isApiError(new ApiError({ code: 1, message: 'x' }))).toBe(true)
    expect(isApiError(new Error('x'))).toBe(false)
    expect(isApiError('x')).toBe(false)
  })
})

describe('http.ts 拦截器契约', () => {
  describe('请求拦截器', () => {
    it('httpOnly 模式：不注入 Authorization header（凭证由 cookie 自动携带）', () => {
      const handler = getRequestHandler()
      const headers = new Map<string, string>()
      handler.onFulfilled({ headers })
      expect(headers.get('Authorization')).toBeUndefined()
    })

    it('请求拦截器合并 globalAbort signal：abort 后 cfg.signal 也中止', () => {
      const handler = getRequestHandler()
      const ctrl = new AbortController()
      const cfg: { headers: Map<string, string>; signal?: AbortSignal } = {
        headers: new Map<string, string>(),
      }
      handler.onFulfilled(cfg)
      // 通过触发 globalAbort 验证合并后的 signal 是否同步中止
      // 这里用 cfg.signal.aborted 直接断言，不再依赖类型层面的 abort
      expect(cfg.signal?.aborted).toBe(false)
      globalAbort.abort('http-spec-test')
      expect(cfg.signal?.aborted).toBe(true)
      ctrl.abort()
      globalAbort.reset()
    })
  })

  describe('响应拦截器 — 业务码', () => {
    it('HTTP 200 + 业务码 200 时透传响应', () => {
      const handler = getResponseHandler()
      const response = {
        status: 200,
        data: { code: BusinessCode.SUCCESS, message: 'ok', data: { id: 1 } },
        config: { url: '/x' },
      }
      const result = handler.onFulfilled(response as AxiosResponse<ApiResponse<unknown>>)
      expect(result).toBe(response)
    })

    it('HTTP 非 200（如 201）即使业务码 200 也视为失败', () => {
      const handler = getResponseHandler()
      let captured: unknown
      try {
        handler.onFulfilled({
          status: 201,
          data: { code: BusinessCode.SUCCESS, message: 'created', data: { id: 1 } },
          config: { url: '/x' },
        } as AxiosResponse<ApiResponse<unknown>>)
      } catch (e) {
        captured = e
      }
      expect(isApiError(captured)).toBe(true)
      if (isApiError(captured)) {
        expect(captured.message).toBe('created')
        expect(captured.code).toBe(BusinessCode.SUCCESS)
      }
    })

    it('业务码 UNAUTHORIZED 时仅抛 ApiError（side effects 由 request<T> 包裹层处理）', () => {
      const handler = getResponseHandler()

      let captured: unknown
      try {
        handler.onFulfilled({
          status: 200,
          data: { code: BusinessCode.UNAUTHORIZED, message: 'expired', data: null },
          config: { url: '/x' },
        } as AxiosResponse<ApiResponse<unknown>>)
      } catch (e) {
        captured = e
      }

      expect(isApiError(captured)).toBe(true)
      if (isApiError(captured)) {
        expect(captured.code).toBe(BusinessCode.UNAUTHORIZED)
        expect(captured.url).toBe('/x')
      }
      // 拦截器层不做 side effects（不跳转、不清标记、不 refresh）——留给 request<T> 决定
      expect(mockRouterPush).not.toHaveBeenCalled()
      expect(mockRefreshSession).not.toHaveBeenCalled()
    })

    it('业务码失败时抛 ApiError 并保留 message', () => {
      const handler = getResponseHandler()
      let captured: unknown
      try {
        handler.onFulfilled({
          status: 200,
          data: { code: 5001, message: '业务异常', data: null },
          config: { url: '/x' },
        } as AxiosResponse<ApiResponse<unknown>>)
      } catch (e) {
        captured = e
      }
      expect(isApiError(captured)).toBe(true)
      if (isApiError(captured)) {
        expect(captured.code).toBe(5001)
        expect(captured.message).toBe('业务异常')
      }
    })
  })

  describe('响应拦截器 — HTTP 错误', () => {
    it('401 走 "请先登录" 文案', () => {
      const handler = getResponseHandler()
      let captured: unknown
      try {
        handler.onRejected({ response: { status: 401 }, config: { url: '/x' } })
      } catch (e) {
        captured = e
      }
      expect(isApiError(captured)).toBe(true)
      if (isApiError(captured)) {
        expect(captured.status).toBe(401)
        expect(captured.code).toBe(401)
        expect(captured.message).toBe('请先登录')
      }
    })

    it('500 走 "服务器错误" 文案', () => {
      const handler = getResponseHandler()
      let captured: unknown
      try {
        handler.onRejected({ response: { status: 500 }, config: { url: '/x' } })
      } catch (e) {
        captured = e
      }
      if (isApiError(captured)) expect(captured.message).toBe('服务器错误')
    })

    it('网络异常（无 response）走通用文案', () => {
      const handler = getResponseHandler()
      let captured: unknown
      try {
        handler.onRejected({ config: { url: '/x' } })
      } catch (e) {
        captured = e
      }
      if (isApiError(captured)) {
        expect(captured.status).toBeUndefined()
        expect(captured.message).toBe('网络异常，请稍后重试')
      }
    })
  })

  describe('request<T>()', () => {
    it('转发到 instance.request 并在 then 中解包 body.data', async () => {
      const requestMock = httpInstance.request as ReturnType<typeof vi.fn>
      requestMock.mockReset()
      // 模拟成功响应：拦截器透传后，request<T> 需要 .then(res => res.data.data)
      requestMock.mockResolvedValueOnce({
        data: { code: 0, message: 'ok', data: { id: 1 } },
      })

      const result = await request<{ id: number }>({ url: '/x' })
      expect(requestMock).toHaveBeenCalledWith({ url: '/x' })
      expect(result).toEqual({ id: 1 })
    })

    it('401 时自动 refreshSession 并重发原请求（httpOnly：无需更新 header）', async () => {
      const requestMock = httpInstance.request as ReturnType<typeof vi.fn>
      requestMock.mockReset()
      // 第一次：401（业务码 UNAUTHORIZED）
      requestMock.mockRejectedValueOnce(
        new ApiError({ code: BusinessCode.UNAUTHORIZED, message: 'expired', url: '/x' })
      )
      // 第二次（refresh 成功后重发）：成功
      requestMock.mockResolvedValueOnce({
        data: { code: 0, message: 'ok', data: { id: 2 } },
      })
      mockRefreshSession.mockResolvedValueOnce(undefined)

      const result = await request<{ id: number }>({ url: '/x' })

      expect(mockRefreshSession).toHaveBeenCalledTimes(1)
      expect(requestMock).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ id: 2 })
      // 未触发登出
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('refresh 失败时清登录标记并跳登录页（performLogout）', async () => {
      const requestMock = httpInstance.request as ReturnType<typeof vi.fn>
      requestMock.mockReset()
      requestMock.mockRejectedValueOnce(
        new ApiError({ code: 401, message: 'unauthorized', status: 401, url: '/x' })
      )
      mockRefreshSession.mockRejectedValueOnce(new Error('refresh failed'))

      await expect(request({ url: '/x' })).rejects.toThrow('unauthorized')

      expect(mockRefreshSession).toHaveBeenCalledTimes(1)
      expect(mockRouterPush).toHaveBeenCalledWith('/login')
    })

    it('refresh 端点自身的 401 不触发 refresh（防循环）', async () => {
      const requestMock = httpInstance.request as ReturnType<typeof vi.fn>
      requestMock.mockReset()
      requestMock.mockRejectedValueOnce(
        new ApiError({ code: 401, message: 'unauthorized', status: 401, url: '/auth/refresh' })
      )

      await expect(request({ url: '/auth/refresh', method: 'post' })).rejects.toThrow()

      expect(mockRefreshSession).not.toHaveBeenCalled()
    })
  })
})
