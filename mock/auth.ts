import type { MockMethod } from 'vite-plugin-mock'
import { delay } from './_utils'

export default [
  {
    url: '/api/auth/login',
    method: 'post',
    response: async ({ body }: { body: { username: string; password: string } }) => {
      await delay()
      if (body.username === 'admin' && body.password === '123456') {
        return {
          code: 0,
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
    response: async () => {
      await delay(100)
      return {
        code: 0,
        message: 'ok',
        data: { id: 1, name: 'Admin', permissions: ['dashboard:view', 'user:view', 'user:edit'] },
      }
    },
  },
] as MockMethod[]