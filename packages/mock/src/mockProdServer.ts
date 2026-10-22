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
 * 模块清单说明：2 个 data 直引模块（menu/user）+ 2 个内联 prod 版
 * （prodAuthMocks / prodDictMocks——字典静态展开，client wrapper 不支持路径参数）。
 * mock/index.ts 只聚合 auth/user/menu（dev 模式 viteMockServe 按目录扫描不受此限）。
 * pro-table/ 下 11 个文件是具名导出 xxxRequestApi（ProTableRequestApi 组件直连数据源，
 * 无 XHR 依赖），无需接线。
 *
 * 已知限制：mock/auth.ts 的 login/profile/logout/refresh 用 rawResponse（Node req/res 语义），
 * client 侧 createProdMockServer 只消费 response 函数（client.mjs 解构 4 字段，rawResponse 被
 * 静默忽略）——更深层原因是 rawResponse 模拟的 Set-Cookie HttpOnly 凭证流依赖真实网络栈，
 * mockjs 伪造响应写不进 cookie 也校验不了。故本文件内联 prod 版 auth（response 形态，无 cookie
 * 语义），供 VITE_DEMO_NO_AUTH 演示模式（守卫跳过登录校验但仍拉 profile）消费；
 * 权限码字面量与 mock/auth.ts MOCK_PERMISSIONS 保持同步（两处无运行时共享，手工对齐）。
 * 拦截窗口时序问题已根治：main.ts 阻塞式挂接（createApp 后、app.use(router) 前
 * await setupProdMockServer——router install 即触发初始导航，挂接晚于 use 则守卫请求穿透）。
 * @trigger 新增 mock 路由模块时须同步登记本文件与 mock/index.ts（dev 聚合入口），两处清单不许分叉
 * @see src/main.ts 入口挂接
 * @see src/router/guards/login.ts VITE_DEMO_NO_AUTH 演示模式守卫
 */
import type { MockMethod } from 'vite-plugin-mock'
import { createProdMockServer } from 'vite-plugin-mock/client'

import { DICT_DATA } from './dict-data'
import menu from './menu'
import user from './user'

/**
 * prod 版 auth mock（response 函数形态，无 cookie 语义）。
 * dev 版（mock/auth.ts）用 rawResponse 模拟 Set-Cookie 凭证流，浏览器端无法模拟，见文件头注。
 */
const prodAuthMocks: MockMethod[] = [
  {
    url: '/api/auth/login',
    method: 'post',
    response: ({ body }: { body: { username?: string; password?: string } }) =>
      body.username === 'admin' && body.password === '123456'
        ? { code: 200, message: 'ok', data: { profile: { id: 1, name: 'Admin' } } }
        : { code: 401, message: '账号或密码错误', data: null },
  },
  {
    url: '/api/auth/profile',
    method: 'get',
    response: () => ({
      code: 200,
      message: 'ok',
      data: {
        id: 1,
        name: 'Admin',
        // 与 mock/auth.ts MOCK_PERMISSIONS 保持同步（两处无运行时共享，手工对齐）
        permissions: ['dashboard:view', 'user:view', 'user:edit', 'orders:view', 'reports:view'],
      },
    }),
  },
  {
    url: '/api/auth/logout',
    method: 'post',
    response: () => ({ code: 200, message: 'ok', data: null }),
  },
  {
    url: '/api/auth/refresh',
    method: 'post',
    response: () => ({ code: 200, message: 'ok', data: null }),
  },
]

/**
 * prod 版字典 mock——静态展开为逐条 url 注册。
 * 不能复用 dev 版 /api/dict/:code 动态路由：client wrapper 不从路径提取参数
 * （query 仅来自 querystring，:code 恒 undefined → 防御分支 400）。
 * 静态注册后每条 url 的 code 由闭包固化，数据直返 DICT_DATA[code]。
 */
const prodDictMocks: MockMethod[] = Object.entries(DICT_DATA).map(([code, list]) => ({
  url: `/api/dict/${code}`,
  method: 'get',
  response: () => ({ code: 200, message: 'ok', data: list }),
}))

/** 全量 mock 路由清单（data 直引模块 + prod 版 auth/dict 内联） */
const mockModules: MockMethod[] = [...prodAuthMocks, ...prodDictMocks, ...menu, ...user]

/**
 * 注册生产 mock（浏览器端 mockjs XHR 劫持）。
 * 仅在 VITE_USE_MOCK==='true' 的产物中由 main.ts 调用；
 * 返回 Promise——main.ts 在 createApp 后、app.use(router) 前顶层 await 本函数，
 * 保证 mockjs 加载完成、劫持激活后才安装 router（router install 即触发初始导航，
 * 守卫的 profile 拉取必然在劫持之后发出），彻底消除「启动请求穿过拦截窗口
 * 打到静态服务器」的时序 bug（2026-10-20 两轮 preview 目检实锤：mount 前
 * await 仍不够——守卫链与 main.ts 后续语句并行执行，SPA fallback 返回 HTML）。
 */
export function setupProdMockServer(): Promise<void> {
  return createProdMockServer(mockModules)
}
