import { authApi, type LoginPayload, type UserProfile } from '@/api/modules/auth'
import { Session } from '@/utils/storage'
import { globalAbort } from '@/api/global-abort'
import { resetAuthGuardState } from '@/router/guards/auth'
import { useDictStore } from './dict'
import { useRouterStore } from './router'

export const useUserStore = defineStore('user', () => {
  // httpOnly 模式（2026-08-12 改造）：凭证 cookie 前端不可读，
  // 用 sessionStorage 登录标记供守卫同步判断；真正凭证校验由后端完成
  const authenticated = ref<boolean>(Session.get<boolean>('auth') ?? false)
  const profile = ref<UserProfile | null>(null)
  const permissions = ref<string[]>([])

  const isLoggedIn = computed(() => authenticated.value)

  async function login(credentials: LoginPayload) {
    // 登录成功：后端已 Set-Cookie 凭证，前端只写登录标记
    await authApi.login(credentials)
    Session.set('auth', true)
    authenticated.value = true
    await fetchProfile()
    // 登录成功后预加载常用字典（失败不阻塞登录流程，5min TTL 兜底）
    try {
      await useDictStore().preloadDict()
    } catch (err) {
      console.warn('[user] 字典预加载失败（不阻塞登录流程）:', err)
    }
  }

  async function fetchProfile() {
    const p = await authApi.fetchProfile()
    profile.value = p
    permissions.value = p.permissions
  }

  /**
   * 清空本地登录态（不动后端凭证 cookie）。
   * 供 logout 与守卫在凭证失效（fetchProfile 401）时调用。
   *
   * 注意：最后调用 globalAbort.reset() 创建新的 controller，
   * 避免重新登录后所有请求因仍处于 aborted 状态被立即取消。
   */
  function resetLocalState(): void {
    Session.remove('auth')
    authenticated.value = false
    profile.value = null
    permissions.value = []
    globalAbort.abort('logout')
    resetAuthGuardState()
    const routerStore = useRouterStore()
    if (typeof routerStore.$reset === 'function') {
      routerStore.$reset()
    }
    // 为下一个 session 准备：创建新的 AbortController，否则重新登录的请求会全部 abort
    globalAbort.reset()
  }

  /**
   * 乐观退出（2026-08-12 改造）：先清本地登录态（用户立即"已退出"），
   * 后端 logout 请求 fire-and-forget——弱网/后端故障时用户也能正常退出。
   * 凭证 cookie 由后端响应 `Set-Cookie: Max-Age=0` 清除；请求失败时凭证
   * 会自然过期，且后续请求 401 会再次触发 refresh 失败 → performLogout 兜底。
   *
   * 跳转职责在调用方（useLogout / 守卫），store 不依赖 router 实例，
   * 避免 store → router → guards → store 的循环依赖。
   */
  async function logout(): Promise<void> {
    resetLocalState()
    try {
      await authApi.logout()
    } catch (err) {
      console.warn('[user] 后端 logout 请求失败（本地已退出，不影响）:', err)
    }
  }

  return {
    authenticated,
    profile,
    permissions,
    isLoggedIn,
    login,
    fetchProfile,
    logout,
    resetLocalState,
  }
})
