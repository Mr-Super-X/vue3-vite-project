import type { MockMethod } from 'vite-plugin-mock'

// 注意：mock response 必须是**同步函数**。
// vite-plugin-mock 中间件用 JSON.stringify(...) 序列化返回值，
// 若返回 Promise 会被序列化为 "{}"。需要延迟请用配置项 timeout（单位 ms）。
export default [
  {
    url: '/api/auth/login',
    method: 'post',
    timeout: 200,
    response: ({ body }: { body: { username: string; password: string } }) => {
      if (body.username === 'admin' && body.password === '123456') {
        return {
          code: 200,
          message: 'ok',
          data: { token: 'mock-jwt-' + Date.now(), profile: { id: 1, name: 'Admin' } },
        }
      }
      return { code: 401, message: '账号或密码错误', data: null }
    },
  },
  {
    url: '/api/auth/profile',
    method: 'get',
    timeout: 100,
    response: () => ({
      code: 200,
      message: 'ok',
      data: { id: 1, name: 'Admin', permissions: ['dashboard:view', 'user:view', 'user:edit'] },
    }),
  },
  {
    url: '/api/auth/logout',
    method: 'post',
    timeout: 100,
    response: () => ({ code: 200, message: 'ok', data: null }),
  },
  {
    url: '/api/auth/refresh',
    method: 'post',
    timeout: 100,
    response: () => ({
      code: 200,
      message: 'ok',
      data: { token: 'mock-jwt-refreshed-' + Date.now() },
    }),
  },
] as MockMethod[]
