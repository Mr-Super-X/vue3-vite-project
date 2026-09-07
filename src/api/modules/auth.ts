/**
 * 认证 API（登录/获取个人信息/登出）。
 *
 * 认证模式（httpOnly 改造）：
 * - 登录成功后凭证由后端 `Set-Cookie: HttpOnly` 下发，前端 JS 不可读
 * - `login` / `logout` 响应体不含 token 字段，仅含必要的 profile 信息
 * - `fetchProfile` 返回当前用户的 profile + 权限列表（用于路由守卫鉴权）
 *
 * @see [`src/store/modules/user`](../../store/modules/user) profile / permissions 持久化
 * @see [`src/api/token-refresh.ts`](../token-refresh.ts) 401 自动续期
 * @group 业务 API：认证
 */

import { request } from '../http'

export interface LoginPayload {
  username: string
  password: string
}

/**
 * 登录响应（httpOnly 模式）：
 * 凭证 token 由后端 Set-Cookie 下发，响应体不再携带 token。
 *
 * @group 业务 API：认证
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
  /**
   * 登录。
   *
   * 副作用：后端 `Set-Cookie: HttpOnly` 自动写入凭证；
   * `Session.set('auth', true)` 由 store 同步写入（路由守卫读取用）。
   *
   * @group 业务 API：认证
   */
  login: (data: LoginPayload) => request<LoginResult>({ url: '/auth/login', method: 'post', data }),

  /**
   * 获取当前用户的 profile + 权限列表。
   * 路由守卫鉴权（`router/guards/permission.ts`）依赖此接口。
   *
   * @group 业务 API：认证
   */
  fetchProfile: () => request<UserProfile>({ url: '/auth/profile', method: 'get' }),

  /**
   * 登出。
   * 副作用：后端 `Set-Cookie: Max-Age=0` 清除 cookie；前端清 Session 'auth' 标记。
   *
   * @group 业务 API：认证
   */
  logout: () => request<void>({ url: '/auth/logout', method: 'post' }),
}
