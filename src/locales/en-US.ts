/**
 * English text bundle.
 *
 * 命名空间约定：同 `zh-CN.ts`（`app.*` / `common.*` / `auth.*` / `menu.*` / `error.*`）。
 *
 * 新增 key 时必须**同步** `zh-CN.ts`，否则在 zh-CN locale 下 fallback 到 en-US。
 *
 * @see [`./index.ts`](./index.ts) i18n entry
 * @see [`./zh-CN.ts`](./zh-CN.ts) 简体中文对照
 * @group 国际化
 */
export default {
  app: { title: 'Enterprise Admin' },
  common: { confirm: 'Confirm', cancel: 'Cancel', retry: 'Retry', loading: 'Loading...' },
  auth: {
    login: 'Login',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
    logoutConfirmButton: 'Logout',
    logoutCancelButton: 'Cancel',
    logoutTitle: 'Notice',
    username: 'Username',
    password: 'Password',
  },
  menu: {
    home: 'Dashboard',
    user: 'User Management',
    demo: 'Components',
    workbench: 'Workbench',
    workbenchHome: 'Workbench Home',
    workbenchAnalysis: 'Analysis',
    workbenchMonitor: 'Monitor',
  },
  error: { '403': 'Forbidden', '404': 'Not Found', '500': 'Server Error' },
  /** Header chrome text (default layout replica, hot-reloads on language switch) */
  header: {
    collapse: 'Collapse menu',
    expand: 'Expand menu',
    switchLayout: 'Switch layout',
    switchLanguage: 'Switch language',
    darkMode: 'Toggle dark mode',
    layoutSettings: 'Layout settings',
    layoutSettingsHint: 'Choose navigation layout',
    layoutSidebar: 'Classic sidebar',
    layoutTop: 'Top navigation',
    layoutMixed: 'Mixed layout',
    layoutDual: 'Dual column',
    logout: 'Logout',
    loggingOut: 'Logging out...',
    closeMenu: 'Close navigation menu',
  },
  /** Tags view text (default layout TagsView) */
  tagsView: {
    scrollLeft: 'Scroll tags left',
    scrollRight: 'Scroll tags right',
    refresh: 'Refresh current tag',
    more: 'More tag actions',
    closeTag: 'Close tag',
    menuRefresh: 'Refresh',
    menuClose: 'Close',
    menuCloseLeft: 'Close left',
    menuCloseRight: 'Close right',
    menuCloseOthers: 'Close others',
    menuCloseAll: 'Close all',
  },
}
