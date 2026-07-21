import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Cookies from 'js-cookie'
import { Local, Session, clearCookies } from './storage'

// 测试期间 vitest 加载 .env.development，VITE_STORAGE_NAMESPACE 是配置的 storage
// 隔离标识（如 'gm-portal-fe'）。fallback 'gm-portal-fe' 与 storage.ts 保持一致。
const APP_NAMESPACE = (import.meta.env.VITE_STORAGE_NAMESPACE || 'gm-portal-fe') + ':'

// 清理 storage 状态避免跨用例污染
beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  clearCookies()
})

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  clearCookies()
  vi.restoreAllMocks()
})

describe('storage 工具', () => {
  describe('Local（localStorage 包装）', () => {
    it('set + get 写入并读取对象', () => {
      Local.set('user', { name: 'Admin', id: 1 })
      expect(Local.get('user')).toEqual({ name: 'Admin', id: 1 })
    })

    it('set + get 写入并读取字符串', () => {
      Local.set('theme', 'dark')
      expect(Local.get('theme')).toBe('dark')
    })

    it('key 会被 namespace 前缀化（避免多项目冲突）', () => {
      Local.set('key1', 'value1')
      const raw = window.localStorage.getItem(APP_NAMESPACE + 'key1')
      expect(raw).not.toBeNull()
      expect(Local.get('key1')).toBe('value1')
    })

    it('remove 移除指定 key', () => {
      Local.set('tmp', 123)
      Local.remove('tmp')
      expect(window.localStorage.getItem(APP_NAMESPACE + 'tmp')).toBeNull()
    })

    it('get 不存在的 key 返回 null', () => {
      expect(Local.get('not-exists')).toBeNull()
    })

    it('get 遇到脏数据（非 JSON）返回 null + 自动清理', () => {
      // 手动塞入非 JSON 字符串
      window.localStorage.setItem(APP_NAMESPACE + 'corrupt', 'not valid json {')
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(Local.get('corrupt')).toBeNull()
      expect(warn).toHaveBeenCalled()
      // 脏数据被自动清理
      expect(window.localStorage.getItem(APP_NAMESPACE + 'corrupt')).toBeNull()
    })

    describe('clear 命名空间隔离（不破坏其他应用数据）', () => {
      it('只清本 namespace 的 key，保留其他 prefix 的 key', () => {
        // 本项目数据
        Local.set('mine', '1')
        // 模拟其他应用的数据
        window.localStorage.setItem('other-app:foo', 'other-value')
        window.localStorage.setItem('unrelated-key', 'unrelated-value')

        Local.clear()

        expect(window.localStorage.getItem(APP_NAMESPACE + 'mine')).toBeNull()
        // 其他 prefix 的数据保留
        expect(window.localStorage.getItem('other-app:foo')).toBe('other-value')
        expect(window.localStorage.getItem('unrelated-key')).toBe('unrelated-value')
      })

      it('空 storage 时不抛错', () => {
        expect(() => Local.clear()).not.toThrow()
      })
    })
  })

  describe('Session（sessionStorage 包装 + token 走 cookie）', () => {
    it('普通 key 走 sessionStorage', () => {
      Session.set('lastVisited', '/dashboard')
      expect(Session.get('lastVisited')).toBe('/dashboard')
      expect(window.sessionStorage.getItem(APP_NAMESPACE + 'lastVisited')).not.toBeNull()
      // 不应写入 cookie
      expect(Cookies.get(APP_NAMESPACE + 'lastVisited')).toBeUndefined()
    })

    it('token 走 cookie 而非 sessionStorage', () => {
      Session.set('token', 'mock-jwt-123')
      // 写入 cookie
      expect(Cookies.get('token')).toBe('mock-jwt-123')
      // 不应写入 sessionStorage（token 走 cookie 路径，与 namespace 无关）
      expect(window.sessionStorage.getItem('token')).toBeNull()
    })

    it('普通对象能 round-trip', () => {
      Session.set('userProfile', { id: 1, name: 'Admin' })
      expect(Session.get('userProfile')).toEqual({ id: 1, name: 'Admin' })
    })

    it('remove 普通 key 走 sessionStorage.removeItem', () => {
      Session.set('foo', 'bar')
      Session.remove('foo')
      expect(window.sessionStorage.getItem(APP_NAMESPACE + 'foo')).toBeNull()
    })

    it('remove token 走 Cookies.remove', () => {
      Session.set('token', 'mock-jwt-123')
      Session.remove('token')
      expect(Cookies.get('token')).toBeUndefined()
    })

    it('Session.get 不存在的 key 返回 null', () => {
      expect(Session.get('not-exists')).toBeNull()
    })

    it('Session.get 遇到脏数据返回 null + 自动清理（与 Local 行为一致）', () => {
      window.sessionStorage.setItem(APP_NAMESPACE + 'corrupt', '}{ invalid json')
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(Session.get('corrupt')).toBeNull()
      expect(warn).toHaveBeenCalled()
      // 脏数据被自动清理（与 Local 行为一致）
      expect(window.sessionStorage.getItem(APP_NAMESPACE + 'corrupt')).toBeNull()
    })

    describe('Session.clear 命名空间隔离', () => {
      it('只清本 namespace 的 sessionStorage key，保留其他 prefix', () => {
        Session.set('mine', '1')
        window.sessionStorage.setItem('other-app:foo', 'other-value')

        Session.clear()

        expect(window.sessionStorage.getItem(APP_NAMESPACE + 'mine')).toBeNull()
        expect(window.sessionStorage.getItem('other-app:foo')).toBe('other-value')
      })
    })
  })

  describe('clearCookies', () => {
    it('清除所有 cookie（用 js-cookie API）', () => {
      Cookies.set('a', '1')
      Cookies.set('b', '2')
      clearCookies()
      expect(Cookies.get('a')).toBeUndefined()
      expect(Cookies.get('b')).toBeUndefined()
    })

    it('无 cookie 时不抛错', () => {
      expect(() => clearCookies()).not.toThrow()
    })

    it('对每条 cookie 尝试多个常见 path 兜底删除（js-cookie 内部调用）', () => {
      // 注：jsdom 不支持跨 path 访问 cookie（path=/api 的 cookie 在 path=/ 页面不可见），
      // 所以无法端到端测真实删除效果，改测 clearCookies 内部 js-cookie.remove 的调用模式。
      document.cookie = 'test-cookie=1'
      const removeSpy = vi.spyOn(Cookies, 'remove')
      clearCookies()
      // 验证对每条 cookie 调用了 4 次 remove（path: '/'、'/api'、''、无参）
      const testCalls = removeSpy.mock.calls.filter(([name]) => name === 'test-cookie')
      expect(testCalls.length).toBe(4)
    })
  })

  describe('Session token cookie 安全属性', () => {
    it('dev 环境（import.meta.env.PROD=false）不强制 secure', () => {
      // dev 模式 PROD=false，应允许 http 写入
      Session.set('token', 'dev-token')
      // 写入成功（js-cookie dev 时即使 secure=true 也会写但读会受限）
      expect(Cookies.get('token')).toBe('dev-token')
    })
  })
})
