import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { router } from '@/router'
import { authApi, type LoginPayload, type UserProfile } from '@/api/modules/auth'
import { Session, clearCookies } from '@/utils/storage'
import { globalAbort } from '@/api/global-abort'
import { resetAuthGuardState } from '@/router/guards/auth'
import { useRouterStore } from './router'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(Session.get<string>('token') ?? '')
  const profile = ref<UserProfile | null>(null)
  const permissions = ref<string[]>([])

  const isLoggedIn = computed(() => !!token.value)

  async function login(credentials: LoginPayload) {
    const { token: t } = await authApi.login(credentials)
    token.value = t
    Session.set('token', t)
    await fetchProfile()
  }

  async function fetchProfile() {
    const p = await authApi.fetchProfile()
    profile.value = p
    permissions.value = p.permissions
  }

  /**
   * 悲观退出：先 await 后端 /auth/logout（失败由 http.ts 拦截器 toast + 抛 ApiError 中断），
   * 成功才清本地状态 + 取消在途请求 + 重置路由模块状态 + 跳登录页。
   *
   * 注意：最后调用 globalAbort.reset() 创建新的 controller，
   * 避免重新登录后所有请求因仍处于 aborted 状态被立即取消。
   */
  async function logout(): Promise<void> {
    await authApi.logout()
    Session.remove('token')
    clearCookies()
    token.value = ''
    profile.value = null
    permissions.value = []
    globalAbort.abort('logout')
    resetAuthGuardState()
    const routerStore = useRouterStore()
    if (typeof routerStore.$reset === 'function') {
      routerStore.$reset()
    }
    await router.push('/login')
    // 为下一个 session 准备：创建新的 AbortController，否则重新登录的请求会全部 abort
    globalAbort.reset()
  }

  return { token, profile, permissions, isLoggedIn, login, fetchProfile, logout }
})
