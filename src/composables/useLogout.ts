// ElMessageBox 由 unplugin-auto-import 注入（importStyle 自动带样式，勿显式 import）
import { useUserStore } from '@/store/modules/user'
import { useAppRouter } from './useAppRouter'

/**
 * 退出登录 composable。
 * 封装 ElMessageBox.confirm 二次确认 + loading 态 + store.logout 调用 + 跳登录页。
 * Header.vue 与 PortalHeader.vue 复用。
 *
 * 跳转职责在此（2026-08-12 改造）：store.logout 不再依赖 router 实例，
 * 斩断 store → router → guards → store 循环依赖；logout 乐观化后不抛错，
 * 确认后始终跳转登录页。
 */
export function useLogout() {
  const userStore = useUserStore()
  const { goLogin } = useAppRouter()
  const loggingOut = ref(false)

  async function confirmLogout(): Promise<void> {
    try {
      await ElMessageBox.confirm('确定退出登录吗？', '提示', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      // 用户在 confirm 弹窗点取消
      return
    }

    loggingOut.value = true
    try {
      await userStore.logout()
      await goLogin()
    } finally {
      loggingOut.value = false
    }
  }

  return { loggingOut, confirmLogout }
}
