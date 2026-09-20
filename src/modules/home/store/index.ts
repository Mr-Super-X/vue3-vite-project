/**
 * home 模块私有 store —— 简易统计指标（演示用）。
 *
 * 当前是占位实现，正式指标展示由 `usePortalOverviewStore` 接管（接后端 portal-overview 接口）。
 *
 * @see [`./portal-overview`](./portal-overview.ts) 真实数据源
 * @see [`../views/Index.vue`](../views/Index.vue) 首页消费方
 * @group 业务模块：Home
 */
export const useHomeStore = defineStore('module-home', () => {
  const stats = ref({ userCount: 128, onlineCount: 12, todayVisits: 256 })
  return { stats }
})
