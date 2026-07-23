import { defineStore } from 'pinia'
import { ref } from 'vue'
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
