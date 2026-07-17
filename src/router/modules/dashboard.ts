import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: () => import('@/layouts/default/index.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/modules/dashboard/views/Index.vue'),
        meta: { title: '仪表盘', icon: 'odometer', requiresAuth: true },
      },
    ],
  },
]

export default routes