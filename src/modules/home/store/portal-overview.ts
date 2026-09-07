/**
 * home 模块私有 store —— 门户总览数据（卡片 + loading + error）。
 *
 * 与 `useHomeStore` 的区别：useHomeStore 是占位统计；本 store 接真实后端接口，
 * 通过 `fetch()` 异步拉取 OverviewCardDto[]。
 *
 * 错误归一化：非 Error 实例包装为 Error，避免上游 narrowing 失败。
 *
 * @see [`@/api/modules/portal-overview`](../../../api/modules/portal-overview.ts) 接口
 * @see [`../types/portal-overview`](../types/portal-overview.ts) OverviewCardDto 类型
 * @see [`../components/OverviewSection.vue`](../components/OverviewSection.vue) 消费方
 * @group 业务模块：Home
 */
import { portalOverviewApi } from '@/api/modules/portal-overview'
import type { OverviewCardDto } from '@/modules/home/types/portal-overview'

export const usePortalOverviewStore = defineStore('module-portal-overview', () => {
  const cards = ref<OverviewCardDto[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetch(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      cards.value = await portalOverviewApi.getOverview()
    } catch (err: unknown) {
      // 非 Error 实例归一为 Error，避免上层 narrowing 失效
      error.value = err instanceof Error ? err : new Error(String(err))
      cards.value = []
    } finally {
      loading.value = false
    }
  }

  return { cards, loading, error, fetch }
})
