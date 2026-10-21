/**
 * 退出登录 composable。
 *
 * 封装 `useConfirm` 二次确认（取消 resolve false，调用方无须 try/catch）+ loading 态 +
 * `store.logout` 调用 + 跳登录页。`Header.vue` 与 `PortalHeader.vue` 复用。
 *
 * v1.14.2 二次确认从 `ElMessageBox.confirm + try/catch` 切换到 `useConfirm`；
 * 切换前后文案（`'确定退出登录吗？'` + `'退出'`/`'取消'` + `type: 'warning'`）完全一致。
 *
 * 跳转职责在此（2026-08-12 改造）：`store.logout` 不再依赖 router 实例，
 * 斩断 `store → router → guards → store` 循环依赖；logout 乐观化后不抛错，
 * 确认后始终跳转登录页。
 *
 * @see [`./useAppRouter`](./useAppRouter) `goLogin` 跳转入口
 * @see [`src/store/modules/user`](../store/modules/user) logout action
 * @see [`./useConfirm`](./useConfirm) 二次确认 composable
 * @see [`docs/23-权限设计.md §5.10`](../../docs/23-权限设计.md) useLogout 完整契约
 * @group 登出组合式 API
 */

// useConfirm 由 unplugin-auto-import 注入（详见 vite.config.ts 的 AutoImport 配置）
import { useUserStore } from '@/store/modules/user'
import { useAppRouter } from './useAppRouter'

export function useLogout() {
  const userStore = useUserStore()
  const { goLogin } = useAppRouter()
  const loggingOut = ref(false)

  async function confirmLogout(): Promise<void> {
    // useConfirm 取消时 resolve(false) 而非 reject，故此处无须 try/catch
    const confirmed = await useConfirm({
      content: '确定退出登录吗？',
      title: '提示',
      confirmButtonText: '退出',
      type: 'warning',
    })
    if (!confirmed) return

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
