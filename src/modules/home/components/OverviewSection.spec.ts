import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import OverviewSection from './OverviewSection.vue'
import OverviewCardSkeleton from './OverviewCardSkeleton.vue'
import OverviewCard from './OverviewCard.vue'
import { usePortalOverviewStore } from '@/modules/home/store/portal-overview'
import type { OverviewCardDto } from '@/modules/home/types/portal-overview'

// 沿用 Phase 3 store spec 的手写 pinia 模式（项目未装 @pinia/testing）
function mountSection(opts: {
  loading?: boolean
  error?: Error | null
  cards?: OverviewCardDto[]
}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = usePortalOverviewStore()
  store.loading = opts.loading ?? false
  store.error = opts.error ?? null
  store.cards = opts.cards ?? []

  return mount(OverviewSection, {
    global: {
      plugins: [pinia],
      stubs: {
        OverviewCardSkeleton: false,
        OverviewErrorState: false,
        OverviewEmptyState: false,
        OverviewCard: false,
      },
    },
  })
}

describe('OverviewSection 三态分发', () => {
  it('Loading：渲染 5 个骨架', () => {
    const w = mountSection({ loading: true })
    // 2 + 3 两行布局
    expect(w.findAllComponents(OverviewCardSkeleton)).toHaveLength(5)
  })

  it('Error：渲染错误组件', () => {
    const w = mountSection({ error: new Error('网络异常') })
    expect(w.find('[role="alert"]').exists()).toBe(true)
  })

  it('Empty：渲染空状态', () => {
    const w = mountSection({ cards: [] })
    expect(w.text()).toContain('暂无数据')
  })

  it('Normal：渲染 N 张卡片', () => {
    const cards: OverviewCardDto[] = [
      {
        code: 'law',
        title: '执法监管',
        iconName: 'odometer',
        iconBg: 'rgba(1, 107, 230, 0.10)',
        metrics: [],
      },
    ]
    const w = mountSection({ cards })
    expect(w.findAllComponents(OverviewCard)).toHaveLength(1)
  })
})
