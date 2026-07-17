import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from './modules/auth'
import dashboardRoutes from './modules/dashboard'
import userRoutes from './modules/user'
import errorRoutes from './modules/error'
import { setupAuthGuard } from './guards/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [...authRoutes, ...dashboardRoutes, ...userRoutes, ...errorRoutes],
})

setupAuthGuard(router)

export default router