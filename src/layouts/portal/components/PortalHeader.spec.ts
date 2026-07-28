import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick, ref, reactive } from 'vue'

// mock 路由
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: mockPush }),
}))

// mock useUserStore
const mockProfile = ref<{ name: string } | null>({ name: '张三' })
// 用 reactive 包装让 mockUserStore 具备 ref unwrapping 行为
const mockUserStore = reactive({
  profile: mockProfile,
  token: 'mock-token',
  permissions: [] as string[],
  isLoggedIn: true,
  login: vi.fn(),
  logout: vi.fn(),
  fetchProfile: vi.fn(),
})
vi.mock('@/store/modules/user', () => ({
  useUserStore: () => mockUserStore,
}))

// mock useLogout（关键：返回响应式 loggingOut + mock confirmLogout）
const mockLoggingOut = ref(false)
const mockConfirmLogout = vi.fn().mockImplementation(async () => {
  mockLoggingOut.value = true
  try {
    // 模拟 userStore.logout()
  } finally {
    mockLoggingOut.value = false
  }
})
vi.mock('@/composables/useLogout', () => ({
  useLogout: () => ({
    loggingOut: mockLoggingOut,
    confirmLogout: mockConfirmLogout,
  }),
}))

// mock useRouterStore（避免实际导航副作用）
vi.mock('@/store/modules/router', () => ({
  useRouterStore: () => ({ $reset: vi.fn() }),
}))

// i18n mock
const mockT = (key: string): string => {
  const map: Record<string, string> = {
    'auth.logout': '退出',
  }
  return map[key] ?? key
}

// 引入被测组件（必须在所有 mock 之后）
import PortalHeader from './PortalHeader.vue'

describe('PortalHeader 退出登录入口', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfile.value = { name: '张三' }
    mockLoggingOut.value = false
  })

  it('1. 渲染 el-dropdown + 用户区显示用户名', () => {
    const w = mount(PortalHeader, {
      global: { mocks: { $t: mockT } },
    })
    expect(w.text()).toContain('张三')
    const dropdown = w.find('.el-dropdown')
    expect(dropdown.exists()).toBe(true)
  })

  it('2. 点击 trigger 区打开下拉菜单，显示"退出"项', async () => {
    const w = mount(PortalHeader, {
      global: { mocks: { $t: mockT } },
      attachTo: document.body,
    })
    const trigger = w.find('.gm-portal-header__user')
    expect(trigger.exists()).toBe(true)
    await trigger.trigger('click')
    await nextTick()
    const dropdownItem = document.querySelector('.el-dropdown-menu__item')
    expect(dropdownItem).toBeTruthy()
    expect(dropdownItem?.textContent).toContain('退出')
  })

  it('3. 点击"退出"菜单项触发 confirmLogout', async () => {
    const w = mount(PortalHeader, {
      global: { mocks: { $t: mockT } },
      attachTo: document.body,
    })
    const trigger = w.find('.gm-portal-header__user')
    await trigger.trigger('click')
    await nextTick()
    const dropdownItem = document.querySelector('.el-dropdown-menu__item') as HTMLElement | null
    expect(dropdownItem).toBeTruthy()
    dropdownItem?.click()
    await flushPromises()
    expect(mockConfirmLogout).toHaveBeenCalledTimes(1)
  })

  it('4. loggingOut=true 时菜单项 :disabled', async () => {
    mockLoggingOut.value = true
    const w = mount(PortalHeader, {
      global: { mocks: { $t: mockT } },
      attachTo: document.body,
    })
    const trigger = w.find('.gm-portal-header__user')
    await trigger.trigger('click')
    await nextTick()
    const dropdownItem = document.querySelector('.el-dropdown-menu__item')
    expect(dropdownItem?.classList.contains('is-disabled')).toBe(true)
    mockLoggingOut.value = false
  })
})
