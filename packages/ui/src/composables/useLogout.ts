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
 * @see `@vv/shared` useAppRouter —— `goLogin` 跳转入口
 * @see `@vv/shared` store/modules/user —— logout action
 * @see [`./useConfirm`](./useConfirm.ts) 二次确认 composable
 * @see [`docs/23-权限设计.md §5.10`](../../../../docs/23-权限设计.md) useLogout 完整契约
 * @group 登出组合式 API
 */

// 包内兄弟 composable 用显式相对导入（@vv/ui 包规范）；
// app 侧消费本文件时 AutoImport 对显式导入的标识符跳过注入
import { useConfirm } from './useConfirm.ts'
import { useUserStore } from '@vv/shared'
// useAppRouter 归 @vv/shared；本文件与 useDialog/useConfirm 因依赖包内 ProDialog
// 于 P1-4 随组件一并迁入 @vv/ui
import { useAppRouter } from '@vv/shared'

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
