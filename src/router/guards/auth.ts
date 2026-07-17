import type { Router } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const WHITE_LIST = ['/login', '/403', '/404', '/500']

export function setupAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const userStore = useUserStore()

    if (WHITE_LIST.includes(to.path)) return true

    if (!userStore.isLoggedIn) {
      const token = localStorage.getItem('token')
      if (!token) return { path: '/login', query: { redirect: to.fullPath } }
      userStore.token = token
      try {
        await userStore.fetchProfile()
      } catch {
        userStore.logout()
        return { path: '/login', query: { redirect: to.fullPath } }
      }
    }

    const requiredPerms = to.meta.permissions as string[] | undefined
    if (requiredPerms?.length) {
      const hasAll = requiredPerms.every((p) => userStore.permissions.includes(p))
      if (!hasAll) return { path: '/403' }
    }

    return true
  })
}
