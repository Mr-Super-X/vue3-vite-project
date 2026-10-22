import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

// Hero 内部按钮依赖 useAppRouter（auto-import），mock 掉避免路由副作用
vi.mock('@composables/useAppRouter', () => ({
  useAppRouter: () => ({ goLogin: vi.fn() }),
}))

import HomeIndex from './index.vue'

describe('home 官网首页（smoke）', () => {
  it('渲染 4 个锚点区块 + 页脚，且品牌名可见', () => {
    const w = mount(HomeIndex)
    for (const id of ['hero', 'features', 'stats', 'about']) {
      expect(w.find(`#${id}`).exists()).toBe(true)
    }
    expect(w.find('footer').exists()).toBe(true)
    expect(w.text()).toContain('星澜科技')
  })
})
