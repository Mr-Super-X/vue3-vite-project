import { request } from '../http'
import type { Pagination } from '../types/api.d'

export interface UserItem {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
}

export interface UserListParams {
  page?: number
  pageSize?: number
  keyword?: string
}

export const userApi = {
  getList: (params: UserListParams) =>
    request<Pagination<UserItem>>({ url: '/user/list', method: 'get', params }),

  getById: (id: number) => request<UserItem>({ url: `/user/${id}`, method: 'get' }),

  create: (data: Omit<UserItem, 'id' | 'createdAt'>) =>
    request<UserItem>({ url: '/user', method: 'post', data }),

  update: (id: number, data: Partial<UserItem>) =>
    request<UserItem>({ url: `/user/${id}`, method: 'put', data }),

  remove: (id: number) => request<void>({ url: `/user/${id}`, method: 'delete' }),
}
