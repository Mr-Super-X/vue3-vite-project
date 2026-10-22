import type { MockMethod } from 'vite-plugin-mock'
import type { IncomingMessage, ServerResponse } from 'node:http'

// httpOnly cookie 模拟（2026-08-12 改造）：
// 凭证由"后端"（本 mock）通过 Set-Cookie: HttpOnly 下发，前端 JS 不可读，
// 与生产后端契约一致。profile/logout/refresh 通过校验 cookie 模拟真实凭证验证。
//
// 注意：rawResponse 需手动解析 body / 序列化响应（vite-plugin-mock 不代为处理）。
// 延迟用 setTimeout 模拟（timeout 配置项对 rawResponse 不生效）。

const TOKEN_COOKIE = 'token'
const MOCK_PERMISSIONS = ['dashboard:view', 'user:view', 'user:edit', 'orders:view', 'reports:view']

/** 写 Set-Cookie 头（HttpOnly；maxAge=0 表示删除） */
function setTokenCookie(res: ServerResponse, value: string, maxAge?: number): void {
  const parts = [`${TOKEN_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`)
  res.setHeader('Set-Cookie', parts.join('; '))
}

/** 校验请求是否携带凭证 cookie */
function hasTokenCookie(req: IncomingMessage): boolean {
  const cookie = req.headers.cookie ?? ''
  return cookie.split(';').some((c) => c.trim().startsWith(`${TOKEN_COOKIE}=`))
}

function sendJson(res: ServerResponse, body: unknown, statusCode = 200): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.statusCode = statusCode
  res.end(JSON.stringify(body))
}

/** 读取请求 body JSON（rawResponse 模式下需手动解析） */
function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>)
      } catch {
        resolve({})
      }
    })
  })
}

/** 模拟网络延迟后执行 handler */
function withDelay(handler: () => void, ms: number): void {
  setTimeout(handler, ms)
}

export default [
  {
    url: '/api/auth/login',
    method: 'post',
    rawResponse: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await readBody(req)
      withDelay(() => {
        if (body.username === 'admin' && body.password === '123456') {
          // 登录成功：凭证走 Set-Cookie（HttpOnly），响应体不再携带 token
          setTokenCookie(res, `mock-jwt-${Date.now()}`)
          sendJson(res, {
            code: 200,
            message: 'ok',
            data: { profile: { id: 1, name: 'Admin' } },
          })
        } else {
          sendJson(res, { code: 401, message: '账号或密码错误', data: null })
        }
      }, 200)
    },
  },
  {
    url: '/api/auth/profile',
    method: 'get',
    rawResponse: (req: IncomingMessage, res: ServerResponse) => {
      withDelay(() => {
        if (hasTokenCookie(req)) {
          sendJson(res, {
            code: 200,
            message: 'ok',
            data: { id: 1, name: 'Admin', permissions: MOCK_PERMISSIONS },
          })
        } else {
          // 无凭证 cookie → 401，触发前端守卫清标记跳登录
          sendJson(res, { code: 401, message: '登录已过期', data: null })
        }
      }, 100)
    },
  },
  {
    url: '/api/auth/logout',
    method: 'post',
    rawResponse: (req: IncomingMessage, res: ServerResponse) => {
      withDelay(() => {
        // 登出：Max-Age=0 让浏览器删除凭证 cookie
        setTokenCookie(res, '', 0)
        sendJson(res, { code: 200, message: 'ok', data: null })
      }, 100)
    },
  },
  {
    url: '/api/auth/refresh',
    method: 'post',
    rawResponse: (req: IncomingMessage, res: ServerResponse) => {
      withDelay(() => {
        if (hasTokenCookie(req)) {
          // 续期成功：Set-Cookie 新凭证（前端无需读取）
          setTokenCookie(res, `mock-jwt-refreshed-${Date.now()}`)
          sendJson(res, { code: 200, message: 'ok', data: null })
        } else {
          sendJson(res, { code: 401, message: '凭证已失效', data: null })
        }
      }, 100)
    },
  },
] as MockMethod[]
