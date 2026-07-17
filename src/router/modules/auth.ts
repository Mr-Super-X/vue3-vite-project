import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/layouts/blank/index.vue'),
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/modules/auth/views/Login.vue'),
        meta: { title: '登录', requiresAuth: false },
      },
    ],
  },
]

export default routes
