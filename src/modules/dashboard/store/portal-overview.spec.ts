import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePortalOverviewStore } from './portal-overview'
import * as apiModule from '@/api/modules/portal-overview'
import type { OverviewCardDto } from '@/modules/dashboard/types/portal-overview'

describe('usePortalOverviewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('初始状态：loading=false, error=null, cards=[]', () => {
    const store = usePortalOverviewStore()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
    expect(store.cards).toEqual([])
  })

  it('fetch 成功：写入 cards, loading 收尾为 false', async () => {
    vi.spyOn(apiModule.portalOverviewApi, 'getOverview').mockResolvedValue([
      {
        code: 'law',
        title: '执法监管',
        iconName: 'odometer',
        iconBg: 'var(--x)',
        metrics: [],
      },
    ])
    const store = usePortalOverviewStore()
    await store.fetch()
    expect(store.cards).toHaveLength(1)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('fetch 失败：写入 error, cards 清空, loading 收尾', async () => {
    vi.spyOn(apiModule.portalOverviewApi, 'getOverview').mockRejectedValue(new Error('网络异常'))
    const store = usePortalOverviewStore()
    await store.fetch()
    expect(store.error?.message).toBe('网络异常')
    expect(store.cards).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('fetch 期间 loading=true', async () => {
    let resolve!: (v: OverviewCardDto[]) => void
    vi.spyOn(apiModule.portalOverviewApi, 'getOverview').mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    const store = usePortalOverviewStore()
    const p = store.fetch()
    expect(store.loading).toBe(true)
    resolve([])
    await p
    expect(store.loading).toBe(false)
  })

  it('非 Error 类型抛出被规范化为 Error 实例', async () => {
    vi.spyOn(apiModule.portalOverviewApi, 'getOverview').mockRejectedValue('字符串异常')
    const store = usePortalOverviewStore()
    await store.fetch()
    expect(store.error).toBeInstanceOf(Error)
    expect(store.error?.message).toBe('字符串异常')
  })
})
