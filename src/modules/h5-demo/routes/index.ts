/**
 * h5-demo 模块路由（h5 布局验收模块）。
 *
 * 自动注册：被 `src/router/auto-register.ts` 扫描到，无需手动 import。
 *
 * 设计：
 * - 父记录 component 挂 `@/layouts/h5/index.vue` → 获得 H5 面板能力（rem 适配自动激活/恢复）
 * - requiresAuth: false + 白名单（src/router/whitelist.ts）→ 免登录，方便手机扫码真机预览
 * - 本模块路径在 postcss-pxtorem 转换范围（src/modules/h5- 前缀约定），
 *   视图样式直接写 828 设计稿 px，构建时自动转 rem
 *
 * @see [`../views/Index.vue`](../views/Index.vue) rem 适配演示页
 * @group 业务模块：H5Demo
 */

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/h5-demo',
    component: () => import('@/layouts/h5/index.vue'),
    children: [
      {
        path: '',
        name: 'H5Demo',
        component: () => import('../views/Index.vue'),
        meta: {
          title: 'H5 示例',
          requiresAuth: false,
        },
      },
    ],
  },
]

export default routes
