import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick, ref, reactive } from 'vue'

// mock useAppRouter（auto-import 在 vitest 走同一 vite 管线，解析到 '@composables/useAppRouter'）
const mockGoLogin = vi.fn()
vi.mock('@composables/useAppRouter', () => ({
  useAppRouter: () => ({ goLogin: mockGoLogin }),
}))

// mock useUserStore（组件仅消费 profile）
const mockProfile = ref<{ name: string } | null>({ name: '张三' })
const mockUserStore = reactive({
  profile: mockProfile,
  permissions: [] as string[],
  isLoggedIn: true,
})
vi.mock('@store/modules/user', () => ({
  useUserStore: () => mockUserStore,
}))

// mock useLogout
const mockLoggingOut = ref(false)
const mockConfirmLogout = vi.fn()
vi.mock('@/composables/useLogout', () => ({
  useLogout: () => ({ loggingOut: mockLoggingOut, confirmLogout: mockConfirmLogout }),
}))

const map: Record<string, string> = { 'auth.logout': '退出' }
const mockT = (key: string): string => map[key] ?? key

import PortalHeader from './PortalHeader.vue'

describe('PortalHeader 企业官网顶栏', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfile.value = { name: '张三' }
    mockLoggingOut.value = false
  })

  it('1. 渲染品牌名与全部锚点导航', () => {
    const w = mount(PortalHeader, { global: { mocks: { $t: mockT } } })
    expect(w.text()).toContain('星澜科技')
    // 品牌 logo 锚点(1) + 导航锚点(4)
    expect(w.findAll('a')).toHaveLength(5)
    expect(w.text()).toContain('产品')
  })

  it('2. 未登录显示「登录」按钮，点击调 goLogin', async () => {
    mockProfile.value = null
    const w = mount(PortalHeader, { global: { mocks: { $t: mockT } } })
    const btn = w.find('.vv-portal-header__login')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(mockGoLogin).toHaveBeenCalledTimes(1)
  })

  it('3. 已登录显示用户菜单，下拉「退出」触发 confirmLogout', async () => {
    const w = mount(PortalHeader, {
      global: { mocks: { $t: mockT } },
      attachTo: document.body,
    })
    expect(w.find('.vv-portal-header__login').exists()).toBe(false)
    const trigger = w.find('.vv-portal-header__user')
    expect(trigger.text()).toContain('张三')
    await trigger.trigger('click')
    await nextTick()
    const item = document.querySelector('.el-dropdown-menu__item') as HTMLElement | null
    expect(item?.textContent).toContain('退出')
    item?.click()
    await nextTick()
    expect(mockConfirmLogout).toHaveBeenCalledTimes(1)
    w.unmount()
  })

  it('4. loggingOut=true 时退出项禁用', async () => {
    mockLoggingOut.value = true
    const w = mount(PortalHeader, {
      global: { mocks: { $t: mockT } },
      attachTo: document.body,
    })
    await w.find('.vv-portal-header__user').trigger('click')
    await nextTick()
    expect(
      document.querySelector('.el-dropdown-menu__item')?.classList.contains('is-disabled')
    ).toBe(true)
    w.unmount()
    mockLoggingOut.value = false
  })
})
