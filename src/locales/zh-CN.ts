/**
 * 简体中文文案。
 *
 * 命名空间约定：
 * - `app.*`：应用元信息（标题、欢迎语等）
 * - `common.*`：通用按钮/动作（确认/取消/重试/加载）
 * - `auth.*`：登录相关
 * - `menu.*`：菜单名
 * - `error.*`：错误码文案
 *
 * 新增业务模块的 i18n key：建议在 `modules/<m>/locales/zh-CN.ts` 单独维护，
 * 通过 `useI18n().merge()` 合并，避免本文件膨胀。
 *
 * @see [`./index.ts`](./index.ts) i18n 入口
 * @see [`./en-US.ts`](./en-US.ts) 英文对照
 * @group 国际化
 */
export default {
  app: { title: '企业中后台管理' },
  common: { confirm: '确认', cancel: '取消', retry: '重试', loading: '加载中...' },
  auth: {
    login: '登录',
    logout: '退出',
    logoutConfirm: '确定退出登录吗？',
    logoutConfirmButton: '退出',
    logoutCancelButton: '取消',
    logoutTitle: '提示',
    username: '用户名',
    password: '密码',
  },
  menu: {
    home: '首页',
    user: '用户管理',
    workbench: '工作台',
    workbenchHome: '工作台首页',
    workbenchAnalysis: '分析页',
    workbenchMonitor: '监控页',
  },
  error: { '403': '无权访问', '404': '页面不存在', '500': '服务器错误' },
}
