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
  app: { title: 'Emergency Water Portal' },
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
  menu: { home: 'Home', user: 'User Management' },
  error: { '403': 'Forbidden', '404': 'Not Found', '500': 'Server Error' },
}
