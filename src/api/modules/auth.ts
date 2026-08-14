import { request } from '../http'

export interface LoginPayload {
  username: string
  password: string
}
/**
 * 登录响应（httpOnly 模式）：
 * 凭证 token 由后端 Set-Cookie 下发，响应体不再携带 token。
 */
export interface LoginResult {
  profile: { id: number; name: string }
}
export interface UserProfile {
  id: number
  name: string
  permissions: string[]
}

export const authApi = {
  login: (data: LoginPayload) => request<LoginResult>({ url: '/auth/login', method: 'post', data }),

  fetchProfile: () => request<UserProfile>({ url: '/auth/profile', method: 'get' }),

  logout: () => request<void>({ url: '/auth/logout', method: 'post' }),
}
