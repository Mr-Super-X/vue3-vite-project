import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGoLogin = vi.fn()
vi.mock('@/composables/useAppRouter', () => ({
  useAppRouter: () => ({ goLogin: mockGoLogin }),
}))

import SiteHero from './SiteHero.vue'
import { SITE_HERO } from '../config/site'

describe('SiteHero 官网首屏', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. 渲染 kicker / 主标题 / 副文案', () => {
    const w = mount(SiteHero)
    expect(w.text()).toContain(SITE_HERO.kicker)
    expect(w.text()).toContain(SITE_HERO.titleLines[0])
    expect(w.text()).toContain(SITE_HERO.subtitle)
  })

  it('2. 两个 CTA 按钮点击均跳登录', async () => {
    const w = mount(SiteHero)
    const btns = w.findAll('button')
    expect(btns).toHaveLength(2)
    await btns[0].trigger('click')
    await btns[1].trigger('click')
    expect(mockGoLogin).toHaveBeenCalledTimes(2)
  })
})
