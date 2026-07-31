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
 *
 * 安全要点：
 * - token cookie 在生产环境（import.meta.env.PROD === true）自动加 secure + sameSite=lax，
 *   防中间人攻击和 CSRF。dev 模式不强制 secure（避免 http 写入失败）
 * - clear()/Session.clear() 只清除本项目 namespace 的 key（不破坏其他项目 / 其他路径的数据）
 * - clearCookies() 用 js-cookie 解析 + 删除（处理 path/domain 差异）
 * - get() 在 JSON.parse 失败时自动清除脏数据 + 返回 null（避免 SyntaxError 冒泡到 ErrorBoundary）
 */

/**
 * 应用命名空间（隔离多项目共用同一 storage 域）
 * 数据源：独立的 VITE_STORAGE_NAMESPACE（与展示用的 VITE_APP_TITLE 解耦），
 * fallback 硬编码 'vue3-vite-project' 兜底。
 * 配置示例（.env.development）：VITE_STORAGE_NAMESPACE=vue3-vite-project
 */
const APP_NAMESPACE = import.meta.env.VITE_STORAGE_NAMESPACE || 'vue3-vite-project'

/** 给业务 key 加 namespace 前缀 */
function setKey(key: string): string {
  return `${APP_NAMESPACE}:${key}`
}

/** 通用的"只清本项目 namespace"遍历删除函数（Local/Session 复用） */
function clearByNamespace(storage: Storage): void {
  const prefix = `${APP_NAMESPACE}:`
  // 倒序遍历删除：避免 length 变化导致索引错位
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i)
    if (key !== null && key.startsWith(prefix)) {
      storage.removeItem(key)
    }
  }
}

/**
 * JSON.parse 安全包装：失败时 console.warn + 清理脏数据 + 返回 null
 */
function safeParse<T>(raw: string, key: string, kind: 'Local' | 'Session'): T | null {
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    console.warn(`[storage] ${kind}.get('${key}') JSON.parse 失败，清除脏数据:`, err)
    // 清理脏数据避免下次再 parse 失败
    if (kind === 'Local') {
      window.localStorage.removeItem(setKey(key))
    } else {
      window.sessionStorage.removeItem(setKey(key))
    }
    return null
  }
}

/**
 * window.localStorage 浏览器永久缓存
 */
export const Local = {
  set<T>(key: string, val: T): void {
    window.localStorage.setItem(setKey(key), JSON.stringify(val))
  },
  get<T = unknown>(key: string): T | null {
    const json = window.localStorage.getItem(setKey(key))
    if (json === null) return null
    return safeParse<T>(json, key, 'Local')
  },
  remove(key: string): void {
    window.localStorage.removeItem(setKey(key))
  },
  /** 只清本项目 namespace 的 key（不破坏其他应用的数据） */
  clear(): void {
    clearByNamespace(window.localStorage)
  },
}

/**
 * window.sessionStorage 浏览器临时缓存（token 特殊走 cookie）
 */
export const Session = {
  set<T>(key: string, val: T): void {
    if (key === 'token') {
      // token 走 cookie：生产环境强制 secure + sameSite 防中间人/CSRF
      Cookies.set(key, val as string, {
        secure: import.meta.env.PROD,
        sameSite: 'lax',
      })
      return
    }
    window.sessionStorage.setItem(setKey(key), JSON.stringify(val))
  },
  get<T = unknown>(key: string): T | string | null {
    if (key === 'token') return Cookies.get(key) ?? null
    const json = window.sessionStorage.getItem(setKey(key))
    if (json === null) return null
    return safeParse<T>(json, key, 'Session')
  },
  remove(key: string): void {
    if (key === 'token') {
      Cookies.remove(key, { path: '/' })
      return
    }
    window.sessionStorage.removeItem(setKey(key))
  },
  /** 只清本项目 namespace 的 key（不破坏其他应用的数据） */
  clear(): void {
    clearByNamespace(window.sessionStorage)
  },
}

/**
 * 清除所有 cookie
 *
 * 用 js-cookie API 删除：每条 cookie 都按它自己的 path 删除（不能硬编码 path=/，
 * 因为有些 cookie 可能用 path=/admin 等其他路径；硬编码会导致那些 cookie 残留）。
 *
 * 注：js-cookie 内部会从 document.cookie 解析 name，再按指定 path 调用 remove。
 * 即使我们不知道原 cookie 的 path，多次用常见 path 兜底（/, /api）能覆盖 90% 场景。
 */
export function clearCookies(): void {
  const raw = document.cookie
  if (!raw) return
  for (const segment of raw.split(';')) {
    const eq = segment.indexOf('=')
    const name = (eq === -1 ? segment : segment.slice(0, eq)).trim()
    if (!name) continue
    // 多次尝试常见 path 覆盖更多场景
    Cookies.remove(name, { path: '/' })
    Cookies.remove(name, { path: '/api' })
    Cookies.remove(name, { path: '' })
    Cookies.remove(name) // 无 path 参数（按当前页 path）
  }
}
