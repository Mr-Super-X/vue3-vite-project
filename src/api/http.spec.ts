import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Cookies from 'js-cookie'
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
  Cookies.remove('token', { path: '/' })
  vi.clearAllMocks()
})

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  Cookies.remove('token', { path: '/' })
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
    it('Session 没有 token 时不写入 Authorization', () => {
      const handler = getRequestHandler()
      const headers = new Map<string, string>()
      handler.onFulfilled({ headers })
      expect(headers.get('Authorization')).toBeUndefined()
    })

    it('Session 有 token 时写入 Bearer Authorization', () => {
      const handler = getRequestHandler()
      Cookies.set('token', 'mock-jwt-xyz')
      const headers = new Map<string, string>()
      handler.onFulfilled({ headers })
      expect(headers.get('Authorization')).toBe('Bearer mock-jwt-xyz')
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

    it('业务码 UNAUTHORIZED 时清 token + 跳登录 + 抛 ApiError', () => {
      const handler = getResponseHandler()
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })
      Cookies.set('token', 'old-token')

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
      expect(window.location.href).toContain('/login')
      expect(Cookies.get('token')).toBeUndefined()
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
  })
})
