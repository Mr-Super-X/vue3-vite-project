import type { MockMethod } from 'vite-plugin-mock'
import { delay } from './_utils'

export default [
  {
    url: '/api/dashboard/stats',
    method: 'get',
    response: async () => {
      await delay(200)
      return {
        code: 0,
        message: 'ok',
        data: { userCount: 128, onlineCount: 12, todayVisits: 256 },
      }
    },
  },
] as MockMethod[]