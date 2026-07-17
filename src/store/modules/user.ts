import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginPayload, type UserProfile } from '@/api/modules/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') ?? '')
  const profile = ref<UserProfile | null>(null)
  const permissions = ref<string[]>([])

  const isLoggedIn = computed(() => !!token.value)

  async function login(credentials: LoginPayload) {
    const { token: t, profile: p } = await authApi.login(credentials)
    token.value = t
    localStorage.setItem('token', t)
    await fetchProfile()
  }

  // 用于路由守卫刷新用户信息（如 F5 后页面状态恢复）
  async function fetchProfile() {
    const p = await authApi.fetchProfile()
    profile.value = p
    permissions.value = p.permissions
  }

  function logout() {
    token.value = ''
    profile.value = null
    permissions.value = []
    localStorage.removeItem('token')
  }

  return { token, profile, permissions, isLoggedIn, login, fetchProfile, logout }
})