import type { MockMethod } from 'vite-plugin-mock'

// 注意：mock response 必须是**同步函数**。详见 mock/auth.ts 顶部注释。
export default [
  {
    url: '/api/dashboard/stats',
    method: 'get',
    timeout: 200,
    response: () => ({
      code: 200,
      message: 'ok',
      data: { userCount: 128, onlineCount: 12, todayVisits: 256 },
    }),
  },
] as MockMethod[]
