/**
 * App 全局 UI 状态（侧边栏 / 全局 loading / 语言）。
 *
 * 设计要点：
 * - 不持久化：UI 状态是会话级，刷新应回到默认值（避免恢复老 tab 的侧边栏折叠态）
 * - 与 user store 分离：UI 状态与登录态生命周期不同（user 跟着登录会话，app 跟着浏览器 tab）
 * - 业务组件统一通过 `useAppStore()` 消费，避免 prop drilling
 *
 * @see [`@composables/useAppRouter`](../composables/useAppRouter.ts) 路由跳转
 * @see [`../store/modules/user.ts`](./user.ts) 用户登录态
 * @group 状态管理：App UI
 */

export const useAppStore = defineStore('app', () => {
  /** 侧边栏是否折叠。`toggleSidebar()` 翻转 */
  const sidebarCollapsed = ref(false)
  /** 全局 loading 开关。`setGlobalLoading(v)` 控制，主要用于路由切换兜底 */
  const globalLoading = ref(false)
  /** 当前语言。`setLocale(l)` 切换，影响 i18n 加载 */
  const locale = ref<'zh-CN' | 'en-US'>('zh-CN')

  /** 翻转侧边栏折叠态。Header / Sidebar 组件的 hamburger 按钮触发 */
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  /** 设置全局 loading 状态。true 时 RootView 通常显示 Spinner */
  function setGlobalLoading(v: boolean) {
    globalLoading.value = v
  }
  /** 切换语言。立即写入响应式状态，i18n 实例通过 watch 同步 */
  function setLocale(l: 'zh-CN' | 'en-US') {
    locale.value = l
  }

  return { sidebarCollapsed, globalLoading, locale, toggleSidebar, setGlobalLoading, setLocale }
})
