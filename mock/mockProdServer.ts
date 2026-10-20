/**
 * 生产环境 mock 接线（gh-pages 纯静态托管用）。
 *
 * vite-plugin-mock@3.0.2 为纯 dev-server 插件（2.9.x 的 prodEnabled 已移除），
 * 生产构建需经 client 侧 createProdMockServer 手动注册——浏览器端 mockjs 劫持 XHR，
 * 使无后端的静态产物具备完整 demo 数据。
 *
 * 挂接点：src/main.ts 条件分支（仅 VITE_USE_MOCK==='true' 的动态 import），
 * 常规生产构建（'false'）整分支被 tree-shake，产物不含 mock。
 *
 * 模块清单说明：仅含 5 个真实 mock 路由模块（mock/ 目录全部 url: '/api/*' 定义处）。
 * mock/index.ts 只聚合 auth/user/menu；pro-table/ 下 11 个文件是具名导出
 * xxxRequestApi（ProTableRequestApi 组件直连数据源，无 XHR 依赖），无需接线。
 *
 * 已知限制：mock/auth.ts 的 login/profile/logout/refresh 用 rawResponse（Node req/res 语义），
 * client 侧 createProdMockServer 只消费 response 函数（client.mjs 解构 4 字段，rawResponse 被
 * 静默忽略）→ gh-pages 上登录接口返回空对象、登录流程不可用。data 类 4 模块不受影响。
 * 修复路径（待 Task 4 验证后决策）：auth.ts 改写为 response 函数形态（双端兼容）。
 * @see src/main.ts 入口挂接
 * @trigger 新增 mock 路由模块时须同步登记本文件与 mock/index.ts（dev 聚合入口），两处清单不许分叉
 */
import type { MockMethod } from 'vite-plugin-mock'
import { createProdMockServer } from 'vite-plugin-mock/client'

import auth from './auth'
import dict from './dict'
import menu from './menu'
import portalOverview from './portal-overview'
import user from './user'

/** 全量 mock 路由清单（与 mock/ 目录全部 url: '/api/*' 定义一一对应） */
const mockModules: MockMethod[] = [...auth, ...dict, ...menu, ...portalOverview, ...user]

/**
 * 注册生产 mock（浏览器端 mockjs XHR 劫持）。
 * 仅在 VITE_USE_MOCK==='true' 的产物中由 main.ts 调用；
 * createProdMockServer 为 async（内部动态 import mockjs），此处 fire-and-forget，
 * 劫持在 mockjs 异步加载完成后生效；此前发出的启动请求会错过拦截窗口
 * （CI 用 VITE_MENU_SOURCE=local 规避菜单首请求，风险低）。
 */
export function setupProdMockServer(): void {
  void createProdMockServer(mockModules)
}
