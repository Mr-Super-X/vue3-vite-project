/**
 * big-demo 模块路由（big layout 验收模块）。
 *
 * 自动注册：被 `src/router/auto-register.ts` 扫描到，无需手动 import。
 *
 * 设计：
 * - 父记录 component 挂 `@/layouts/big/index.vue` → 获得大屏面板能力（scale 适配自动激活）
 * - requiresAuth: false + 白名单（src/router/whitelist.ts）→ 免登录，演示厅直接打开
 * - 超宽页通过 meta.bigScreen 声明 9000×1080 设计稿尺寸（缺省 1920×1080）
 *
 * @see [`../views/index.vue`](../views/index.vue) 1920 标准大屏
 * @see [`../views/Wide.vue`](../views/Wide.vue) 9000×1080 超宽拼接屏示例
 * @group 业务模块：BigDemo
 */

import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/big-demo',
    component: () => import('@/layouts/big/index.vue'),
    children: [
      {
        path: '',
        name: 'BigDemo',
        component: () => import('../views/index.vue'),
        meta: {
          title: '数据大屏',
          requiresAuth: false,
          noTags: true, // workbench 直达的验收页，不污染 TagsView
        },
      },
      {
        path: 'wide',
        name: 'BigDemoWide',
        component: () => import('../views/Wide.vue'),
        meta: {
          title: '超宽拼接大屏',
          requiresAuth: false,
          noTags: true, // workbench 直达的验收页，不污染 TagsView
          bigScreen: { width: 9000, height: 1080 },
        },
      },
      {
        // 五态示范页（/autoplan Phase 2 D-SC-1）：异步数据在大屏场景的五种形态集中演示
        path: 'state-demo',
        name: 'BigDemoStateDemo',
        component: () => import('../views/StateDemo.vue'),
        meta: { title: '五态示范', requiresAuth: false, noTags: true },
      },
    ],
  },
]

export default routes
