/**
 * App 全局 UI 状态（侧边栏 / 布局模式 / 移动端断点 / 全局 loading / 语言）。
 *
 * 设计要点：
 * - 选择性持久化：仅持久化用户偏好类字段（layout 布局模式，类比 theme store 的 mode），
 *   会话级字段（sidebarCollapsed / globalLoading / mobile）刷新后回到默认值
 *   （避免恢复老 tab 的侧边栏折叠态）
 * - 与 user store 分离：UI 状态与登录态生命周期不同（user 跟着登录会话，app 跟着浏览器 tab）
 * - 业务组件统一通过 `useAppStore()` 消费，避免 prop drilling
 * - layout 四模式语义复刻自 vue-element-plus-admin：sidebar（经典侧边栏）/ top（顶部导航）/
 *   mixed（顶栏主导航 + 二级侧边栏）/ dual（双栏：图标 rail + 二级侧边栏）
 *
 * @see [`@composables/useAppRouter`](../composables/useAppRouter.ts) 路由跳转
 * @see [`../store/modules/user.ts`](./user.ts) 用户登录态
 * @see [`../../layouts/default/index.vue`](../../layouts/default/index.vue) 四模式布局消费方
 * @group 状态管理：App UI
 */

import { namespacedStorageKey } from '@/utils/storage'

/** 布局模式：sidebar 经典侧边栏 / top 顶部导航 / mixed 顶栏+二级侧栏 / dual 双栏 rail */
export type LayoutMode = 'sidebar' | 'top' | 'mixed' | 'dual'

export const useAppStore = defineStore(
  'app',
  () => {
    /** 侧边栏是否折叠。`toggleSidebar()` 翻转 */
    const sidebarCollapsed = ref(false)
    /** 全局 loading 开关。`setGlobalLoading(v)` 控制，主要用于路由切换兜底 */
    const globalLoading = ref(false)
    /** 当前语言。`setLocale(l)` 切换，影响 i18n 加载 */
    const locale = ref<'zh-CN' | 'en-US'>('zh-CN')
    /** 布局模式（四模式切换，ToolHeader 的 LayoutSwitcher 修改） */
    const layout = ref<LayoutMode>('sidebar')
    /** 是否移动端断点（≤767px），由 matchMedia 监听驱动；移动端侧栏变抽屉并显示遮罩 */
    const mobile = ref(false)

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
    /** 切换布局模式（LayoutSwitcher 调用） */
    function setLayout(mode: LayoutMode) {
      layout.value = mode
    }

    // 移动端断点监听：matchMedia 驱动 mobile 标志，default 布局据此切换侧栏为抽屉 + 遮罩
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(max-width: 767px)')
      mobile.value = mediaQuery.matches
      const onMediaChange = (e: MediaQueryListEvent) => {
        mobile.value = e.matches
        // 进入移动端时强制收起侧栏（抽屉态）；回到桌面恢复展开
        sidebarCollapsed.value = e.matches ? true : false
      }
      mediaQuery.addEventListener('change', onMediaChange)
    }

    return {
      sidebarCollapsed,
      globalLoading,
      locale,
      layout,
      mobile,
      toggleSidebar,
      setGlobalLoading,
      setLocale,
      setLayout,
    }
  },
  {
    persist: {
      // 与 utils/storage 共用命名空间规则（vue3-vite-project:app-ui），
      // 老用户残留的裸 'app-ui' key 不影响（pick 字段回灌失败只是回退默认值）
      key: namespacedStorageKey('app-ui'),
      storage: localStorage,
      // locale 一并持久化：刷新后 App.vue 的 watch（immediate）回灌到 i18n 实例
      pick: ['layout', 'locale'],
    },
  }
)
