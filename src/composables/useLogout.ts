import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/modules/user'

/**
 * 退出登录 composable。
 * 封装 ElMessageBox.confirm 二次确认 + loading 态 + store.logout 调用。
 * Header.vue 与 Dashboard Index.vue 复用。
 */
export function useLogout() {
  const userStore = useUserStore()
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
    } finally {
      loggingOut.value = false
    }
  }

  return { loggingOut, confirmLogout }
}
