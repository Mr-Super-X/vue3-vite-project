import type { MockMethod } from 'vite-plugin-mock'

// 注意：mock response 必须是**同步函数**。详见 mock/auth.ts 顶部注释。

/**
 * 远程菜单 mock：与 src/router/types.ts 的 RemoteMenuItem[] 契约一致。
 * 路由守卫在 remote 模式下会调此接口拉菜单并 router.addRoute() 注入。
 * 未列在 src/router/types.ts RouteName 联合类型中的 name 会被守卫 warn + 跳过。
 */
export default [
  {
    url: '/api/menu',
    method: 'get',
    timeout: 200,
    response: () => ({
      code: 0,
      message: 'ok',
      data: [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'UserList', path: '/user' },
      ],
    }),
  },
] as MockMethod[]
