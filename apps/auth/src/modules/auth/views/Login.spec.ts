import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { ElMessage } from 'element-plus'

// P4 跨应用统一登录协议：登录成功改整页 location.href 回跳（跨 app 无共享 router），
// 不再有 vue-router push；jsdom 的 Location.href 不可拦截，经 stubGlobal 整体替换
const fakeLocation = { href: 'http://localhost/login', search: '' }

const mockLogin = vi.fn()
const mockUserStore = { login: mockLogin }
vi.mock('@store/modules/user', () => ({
  useUserStore: () => mockUserStore,
}))

// resolvePostLoginRedirect 归 @vv/shared 根 barrel；importOriginal 保留其余导出
// （createNamespace 等 AutoImport 注入标识符的真实实现不受影响）
const { mockResolvePostLoginRedirect } = vi.hoisted(() => ({
  mockResolvePostLoginRedirect: vi.fn(() => '/admin/'),
}))
vi.mock('@vv/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vv/shared')>()
  return { ...actual, resolvePostLoginRedirect: mockResolvePostLoginRedirect }
})

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: { success: vi.fn(), error: vi.fn() },
  }
})

// 引入被测组件（必须在 mock 之后）
import Login from './Login.vue'

describe('Login.vue（apps/auth 统一登录页）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeLocation.href = 'http://localhost/login'
    fakeLocation.search = ''
    vi.stubGlobal('location', fakeLocation)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('1. 渲染默认结构：品牌区 + 表单 + 按钮 + 版权', () => {
    const w = mount(Login)
    expect(w.find('h1').exists()).toBe(true)
    expect(w.text()).toContain('统一登录')
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
    expect(mockResolvePostLoginRedirect).not.toHaveBeenCalled()
  })

  it('3. 登录成功：toast success + 整页回跳（resolvePostLoginRedirect 解析目标）', async () => {
    mockLogin.mockResolvedValueOnce({ token: 'xxx' })
    fakeLocation.search = '?redirect=%2Fworkbench'
    mockResolvePostLoginRedirect.mockReturnValueOnce('/workbench')
    const w = mount(Login)
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', password: '123456' })
    expect(ElMessage.success).toHaveBeenCalledWith('登录成功')
    expect(mockResolvePostLoginRedirect).toHaveBeenCalledWith('/admin/')
    expect(window.location.href).toBe('/workbench')
  })

  it('4. 登录失败：toast error + 不回跳（无静默吞错）', async () => {
    mockLogin.mockRejectedValueOnce(new Error('密码错误'))
    const w = mount(Login)
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('密码错误')
    expect(mockResolvePostLoginRedirect).not.toHaveBeenCalled()
    expect(window.location.href).toBe('http://localhost/login')
  })

  it('5. 回跳 fallback 由 resolvePostLoginRedirect 承担（/admin/ 默认回管理端）', async () => {
    mockLogin.mockResolvedValueOnce({ token: 'xxx' })
    // 无 redirect 查询参数：组件固定传 '/admin/' 作 fallback，防开放重定向校验在 shared 层
    const w = mount(Login)
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(mockResolvePostLoginRedirect).toHaveBeenCalledWith('/admin/')
    expect(window.location.href).toBe('/admin/')
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
    const submitBtn = w.find('button.vv-login__submit')
    expect(submitBtn.exists()).toBe(true)
    expect(submitBtn.attributes('disabled')).toBeDefined()
    resolveLogin({ token: 'xxx' })
    await flushPromises()
  })
})
