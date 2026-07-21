import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

    it('clear 清空全部 localStorage', () => {
      Local.set('a', 1)
      Local.set('b', 2)
      Local.clear()
      expect(window.localStorage.length).toBe(0)
    })

    it('get 不存在的 key 返回 null', () => {
      expect(Local.get('not-exists')).toBeNull()
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
      // 不应写入 sessionStorage
      expect(window.sessionStorage.getItem('gm-portal-fe:token')).toBeNull()
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

    it('clear 同时清空 sessionStorage 和 token cookie', () => {
      Session.set('foo', 'bar')
      Session.set('token', 'mock-jwt-123')
      Session.clear()
      expect(window.sessionStorage.length).toBe(0)
      expect(Cookies.get('token')).toBeUndefined()
    })

    it('Session.get 不存在的 key 返回 null', () => {
      expect(Session.get('not-exists')).toBeNull()
    })
  })

  describe('clearCookies', () => {
    it('清除所有 cookie', () => {
      Cookies.set('a', '1')
      Cookies.set('b', '2')
      clearCookies()
      expect(Cookies.get('a')).toBeUndefined()
      expect(Cookies.get('b')).toBeUndefined()
    })

    it('无 cookie 时不抛错', () => {
      expect(() => clearCookies()).not.toThrow()
    })
  })
})
