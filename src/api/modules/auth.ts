import { request } from '../http'

export interface LoginPayload {
  username: string
  password: string
}
export interface LoginResult {
  token: string
  profile: { id: number; name: string }
}
export interface UserProfile {
  id: number
  name: string
  permissions: string[]
}

export const authApi = {
  login: (data: LoginPayload) =>
    request<LoginResult>({ url: '/api/auth/login', method: 'post', data }),

  fetchProfile: () => request<UserProfile>({ url: '/api/auth/profile', method: 'get' }),

  logout: () => request<void>({ url: '/api/auth/logout', method: 'post' }),
}
