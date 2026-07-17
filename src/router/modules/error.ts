import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/modules/error/views/Forbidden.vue'),
    meta: { title: '403' },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/modules/error/views/NotFound.vue'),
    meta: { title: '404' },
  },
  {
    path: '/500',
    name: 'ServerError',
    component: () => import('@/modules/error/views/ServerError.vue'),
    meta: { title: '500' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/404' },
]

export default routes
