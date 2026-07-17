import type { MockMethod } from 'vite-plugin-mock'
import { delay, paginate, generateUsers } from './_utils'

const ALL_USERS = generateUsers(50)

export default [
  {
    url: '/api/user/list',
    method: 'get',
    response: async ({ query }: { query: { page?: string; pageSize?: string; keyword?: string } }) => {
      await delay()
      const page = Number(query.page) || 1
      const pageSize = Number(query.pageSize) || 10
      const keyword = query.keyword?.toLowerCase() ?? ''
      const filtered = keyword
        ? ALL_USERS.filter((u) => u.name.toLowerCase().includes(keyword))
        : ALL_USERS
      return { code: 0, message: 'ok', data: paginate(filtered, page, pageSize) }
    },
  },
  {
    url: '/api/user/:id',
    method: 'get',
    response: async ({ params }: { params: { id: string } }) => {
      await delay(100)
      const user = ALL_USERS.find((u) => u.id === Number(params.id))
      return user
        ? { code: 0, message: 'ok', data: user }
        : { code: 404, message: '用户不存在', data: null }
    },
  },
] as MockMethod[]