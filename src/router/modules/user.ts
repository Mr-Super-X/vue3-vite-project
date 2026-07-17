import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/user',
    component: () => import('@/layouts/default/index.vue'),
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/modules/user/views/List.vue'),
        meta: { title: '用户管理', icon: 'user', requiresAuth: true, permissions: ['user:view'] },
      },
    ],
  },
]

export default routes