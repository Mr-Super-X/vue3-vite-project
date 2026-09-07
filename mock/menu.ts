import type { MockMethod } from 'vite-plugin-mock'

// 注意：mock response 必须是**同步函数**。详见 mock/auth.ts 顶部注释。

/**
 * 远程菜单 mock：与 src/router/types.ts 的 RemoteMenuItem[] 契约一致。
 *
 * 覆盖 3 种典型场景：
 *   1. 单级菜单（Home）—— 顶层页面，无需权限
 *   2. 单级菜单（UserList）—— 顶层业务页 + 权限码
 *   3. 隐藏菜单（Reports）—— 后端 hidden:true 转换后，前端 meta.visible:false
 *
 * 多级菜单（嵌套 children）场景已注释保留（参考块），实际未启用——
 * 启用前需在 src/modules/ 下新增对应业务模块（如 orders/）并注册路由，
 * 否则 COMPONENT_REGISTRY 查不到 name → src/router/remote.ts:172 触发 warn。
 *
 * 路由守卫在 remote 模式下会调此接口拉菜单并 router.addRoute() 注入。
 * 拉到的 JSON 由 src/router/remote.ts:34 的 RemoteMenuItemSchema（zod）运行时校验；
 * 校验失败时守卫 console.warn + 逐项校验兜底（容错优先），不影响菜单加载。
 *
 * 字段说明详见 src/router/types.ts 中的 RemoteMenuItem 接口注释。
 */
export default [
  {
    url: '/api/menu',
    method: 'get',
    timeout: 200,
    response: () => ({
      code: 200,
      message: 'ok',
      data: [
        // 1. 顶层页面（无需权限）
        {
          name: 'Home',
          path: '/home',
          meta: { title: '仪表盘', icon: 'odometer' },
        },
        // 2. 顶层业务页（带权限码）
        {
          name: 'UserList',
          path: '/user/list',
          meta: {
            title: '用户管理',
            icon: 'user',
            permissions: ['user:view'],
          },
        },
        // 3. 隐藏菜单（hidden: true → meta.visible: false）
        {
          name: 'Reports',
          path: '/reports',
          meta: {
            title: '运营报表',
            icon: 'data-analysis',
            permissions: ['reports:view'],
            hidden: true, // 转换后守卫拦截直访，菜单也不渲染
          },
        },
      ],
    }),
  },
] as MockMethod[]
