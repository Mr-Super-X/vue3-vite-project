import Cookies from 'js-cookie'

/**
 * storage 工具（Local + Session + clearCookies）
 *
 * 命名空间：所有 key 自动加 `<APP_NAMESPACE>:` 前缀，避免多项目共用
 * localStorage 时冲突（多团队 / 多应用部署在同一域名下尤其重要）。
 *
 * 设计要点：
 * - Local：localStorage 浏览器永久缓存（关闭浏览器后仍保留）
 * - Session：sessionStorage 浏览器临时缓存（关闭标签页即失效）；
 *   特殊处理：'token' 走 cookie 而非 sessionStorage，原因是 token 需能被
 *   后端中间件 / nginx 等非 JS 环境读取
 * - clearCookies：辅助函数，遍历 document.cookie 全部 expire
 *
 * 与 src/store/modules/user.ts 的关系：userStore.token 仍用 localStorage 直接读写
 * （localStorage.getItem('token')），本工具的 Session.set('token') 用于其他模块
 * 如需 cookie 形式 token。两套并存不冲突（key 不同：'token' vs `${APP_NAMESPACE}:token`）。
 */

/**
 * 应用命名空间（隔离多项目共用同一 storage 域）
 * 数据源：独立的 VITE_STORAGE_NAMESPACE（与展示用的 VITE_APP_TITLE 解耦），
 * fallback 硬编码 'gm-portal-fe' 兜底。
 * 配置示例（.env.development）：VITE_STORAGE_NAMESPACE=gm-portal-fe
 */
const APP_NAMESPACE = import.meta.env.VITE_STORAGE_NAMESPACE || 'gm-portal-fe'

/** 给业务 key 加 namespace 前缀 */
function setKey(key: string): string {
  return `${APP_NAMESPACE}:${key}`
}

/**
 * window.localStorage 浏览器永久缓存
 */
export const Local = {
  // 设置永久缓存
  set<T>(key: string, val: T): void {
    window.localStorage.setItem(setKey(key), JSON.stringify(val))
  },
  // 获取永久缓存
  get<T = unknown>(key: string): T | null {
    const json = window.localStorage.getItem(setKey(key))
    if (json === null) return null
    return JSON.parse(json) as T
  },
  // 移除永久缓存
  remove(key: string): void {
    window.localStorage.removeItem(setKey(key))
  },
  // 移除全部永久缓存
  clear(): void {
    window.localStorage.clear()
  },
}

/**
 * window.sessionStorage 浏览器临时缓存（token 特殊走 cookie）
 */
export const Session = {
  // 设置临时缓存
  set<T>(key: string, val: T): void {
    if (key === 'token') {
      Cookies.set(key, val as string)
      return
    }
    window.sessionStorage.setItem(setKey(key), JSON.stringify(val))
  },
  // 获取临时缓存
  get<T = unknown>(key: string): T | string | null {
    if (key === 'token') return Cookies.get(key) ?? null
    const json = window.sessionStorage.getItem(setKey(key))
    if (json === null) return null
    return JSON.parse(json) as T
  },
  // 移除临时缓存
  remove(key: string): void {
    if (key === 'token') {
      Cookies.remove(key)
      return
    }
    window.sessionStorage.removeItem(setKey(key))
  },
  // 移除全部临时缓存
  clear(): void {
    Cookies.remove('token')
    clearCookies()
    window.sessionStorage.clear()
  },
}

/**
 * 清除所有 cookie（遍历 document.cookie 全部 expire）
 */
export function clearCookies(): void {
  document.cookie.split(';').forEach((c) => {
    document.cookie = c
      .replace(/^ +/, '')
      .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
  })
}
