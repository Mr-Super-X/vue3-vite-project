import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { resolveBasePath, createDefaultScrollBehavior, withRepoPrefix } from './base.ts'

beforeEach(() => {
  // bem.spec.ts 同款模式：每个用例前清掉 env 存根，避免用例间泄漏
  vi.unstubAllEnvs()
})

describe('resolveBasePath', () => {
  it('未设置 VITE_BASE 时默认 /', () => {
    // vitest 默认不注入 VITE_* 变量，不 stub 即「未设置」语义
    expect(resolveBasePath()).toBe('/')
  })

  it('已合规的 /sub-path/ 原样返回', () => {
    vi.stubEnv('VITE_BASE', '/vue3-vite-project/')
    expect(resolveBasePath()).toBe('/vue3-vite-project/')
  })

  it('缺尾斜杠时补全（vue-router basename 要求 / 结尾）', () => {
    vi.stubEnv('VITE_BASE', '/app')
    expect(resolveBasePath()).toBe('/app/')
  })

  it('缺首斜杠时补全（vue-router basename 要求 / 开头）', () => {
    vi.stubEnv('VITE_BASE', 'app/')
    expect(resolveBasePath()).toBe('/app/')
  })

  it('裸路径只补头（首个分支即 return——忠实原 6 份拷贝的同构语义）', () => {
    vi.stubEnv('VITE_BASE', 'app')
    expect(resolveBasePath()).toBe('/app')
  })
})

describe('withRepoPrefix（跨 app 跳链加部署前缀，gh-pages 不 404）', () => {
  it('网关形态 VITE_BASE=/<app>/ → 仓库根 /，路径不变', () => {
    vi.stubEnv('VITE_BASE', '/admin/')
    expect(withRepoPrefix('/admin/')).toBe('/admin/')
    expect(withRepoPrefix('/h5/h5-demo')).toBe('/h5/h5-demo')
  })

  it('gh-pages 形态 VITE_BASE=/<repo>/<app>/ → 前缀 /<repo>/', () => {
    vi.stubEnv('VITE_BASE', '/vue3-vite-project/portal/')
    expect(withRepoPrefix('/admin/')).toBe('/vue3-vite-project/admin/')
    expect(withRepoPrefix('/big/big-demo')).toBe('/vue3-vite-project/big/big-demo')
  })

  it('单段 base（如 /admin/）根为 /（不叠 //）', () => {
    vi.stubEnv('VITE_BASE', '/admin/')
    expect(withRepoPrefix('/portal/home')).toBe('/portal/home')
  })

  it('不带 / 开头的 path 自动补', () => {
    vi.stubEnv('VITE_BASE', '/repo/admin/')
    expect(withRepoPrefix('admin/')).toBe('/repo/admin/')
  })
})

describe('createDefaultScrollBehavior', () => {
  const to = { path: '/x', hash: '' } as RouteLocationNormalized

  it('浏览器前进/后退（savedPosition 存在）→ 恢复记录位置', () => {
    const behavior = createDefaultScrollBehavior()
    expect(behavior(to, to, { top: 120, left: 0 })).toEqual({ top: 120, left: 0 })
  })

  it('目标路由带 hash 锚点 → 平滑滚动到锚点元素', () => {
    const behavior = createDefaultScrollBehavior()
    const hashed = { ...to, hash: '#section-2' } as RouteLocationNormalized
    expect(behavior(hashed, to, null)).toEqual({ el: '#section-2', behavior: 'smooth' })
  })

  it('无 savedPosition 且无 hash → 回页面顶部', () => {
    const behavior = createDefaultScrollBehavior()
    expect(behavior(to, to, null)).toEqual({ top: 0, left: 0 })
  })
})
