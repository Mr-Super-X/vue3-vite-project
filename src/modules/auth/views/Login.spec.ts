import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { ElMessage } from 'element-plus'

// mock 路由 + pinia
const mockPush = vi.fn().mockResolvedValue(undefined)
let mockRedirect: string | undefined = undefined
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { redirect: mockRedirect } }),
  useRouter: () => ({ push: mockPush }),
}))

const mockLogin = vi.fn()
const mockUserStore = { login: mockLogin }
vi.mock('@/store/modules/user', () => ({
  useUserStore: () => mockUserStore,
}))

vi.mock('@/composables/useAppRouter', () => ({
  useAppRouter: () => ({ router: { push: mockPush } }),
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: { success: vi.fn(), error: vi.fn() },
  }
})

// 引入被测组件（必须在 mock 之后）
import Login from './Login.vue'

describe('Login.vue（深色科技感重构）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedirect = undefined
  })

  it('1. 渲染默认结构：品牌区 + 表单 + 按钮 + 版权', () => {
    const w = mount(Login)
    expect(w.find('h1').exists()).toBe(true)
    expect(w.text()).toContain('企业中后台管理')
    expect(w.findAll('input').length).toBeGreaterThanOrEqual(2)
    expect(w.find('button').exists()).toBe(true)
    expect(w.text()).toContain('© 2026')
  })

  it('2. 空表单提交触发校验（不调用 login）', async () => {
    const w = mount(Login)
    // 清空默认值
    const usernameInput = w.find('input[autocomplete="username"]')
    const passwordInput = w.find('input[autocomplete="current-password"]')
    expect(usernameInput.exists()).toBe(true)
    expect(passwordInput.exists()).toBe(true)
    await usernameInput.setValue('')
    await passwordInput.setValue('')
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(mockLogin).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('3. 登录成功：toast success + 跳转到 query.redirect', async () => {
    mockLogin.mockResolvedValueOnce({ token: 'xxx' })
    mockRedirect = '/orders'
    const w = mount(Login)
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', password: '123456' })
    expect(ElMessage.success).toHaveBeenCalledWith('登录成功')
    expect(mockPush).toHaveBeenCalledWith('/orders')
  })

  it('4. 登录失败：toast error + 不跳转（无静默吞错）', async () => {
    mockLogin.mockRejectedValueOnce(new Error('密码错误'))
    const w = mount(Login)
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('密码错误')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('5. 无 redirect 时默认跳 /home', async () => {
    mockLogin.mockResolvedValueOnce({ token: 'xxx' })
    mockRedirect = undefined
    const w = mount(Login)
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(mockPush).toHaveBeenCalledWith('/home')
  })

  it('6. 密码显隐切换：点击 👁 后 input type 切换', async () => {
    const w = mount(Login)
    const pwdInput = w.find('input[autocomplete="current-password"]')
    expect(pwdInput.exists()).toBe(true)
    expect(pwdInput.attributes('type')).toBe('password')
    const toggleBtn = w.find('button[aria-label="显示密码"]')
    expect(toggleBtn.exists()).toBe(true)
    await toggleBtn.trigger('click')
    await nextTick()
    const pwdInputAfter = w.find('input[autocomplete="current-password"]')
    expect(pwdInputAfter.attributes('type')).toBe('text')
  })

  it('7. 提交期间 loading 态：按钮 disabled', async () => {
    let resolveLogin!: (v: unknown) => void
    mockLogin.mockReturnValueOnce(
      new Promise((r) => {
        resolveLogin = r
      })
    )
    const w = mount(Login)
    await w.find('form').trigger('submit.prevent')
    // 等 validate 异步完成 + loading=true
    await flushPromises()
    // 用 BEM class 精准定位提交按钮（排除密码显隐按钮）
    const submitBtn = w.find('button.vv-auth-login__submit')
    expect(submitBtn.exists()).toBe(true)
    expect(submitBtn.attributes('disabled')).toBeDefined()
    resolveLogin({ token: 'xxx' })
    await flushPromises()
  })
})
