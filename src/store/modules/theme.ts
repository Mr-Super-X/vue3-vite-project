/**
 * 主题 store（持久化）。
 *
 * 持久化：mode 字段通过 pinia-plugin-persistedstate 自动写入 localStorage
 * 跟随系统：mode === 'auto' 时监听 prefers-color-scheme 媒体查询
 *
 * 切换 API：
 *   useThemeStore().setMode('dark')   // 强制深色
 *   useThemeStore().setMode('light')  // 强制浅色
 *   useThemeStore().setMode('auto')   // 跟随系统
 *   useThemeStore().toggleMode()      // 智能切换（auto → 显式；light ↔ dark）
 *
 * 推荐在组件中使用 useTheme() composable（@composables/useTheme），更简洁。
 *
 * @see [`@composables/useTheme`](../composables/useTheme.ts) 推荐消费入口
 * @group 状态管理：主题
 */

import { namespacedStorageKey } from '@/utils/storage'

/** 主题模式：light（强制浅色）/ dark（强制深色）/ auto（跟随系统） */
export type ThemeMode = 'light' | 'dark' | 'auto'

// persist key 与 utils/storage 的 Local/Session 共用同一命名空间规则
// （vue3-vite-project:theme-mode），避免多项目同域部署时互相覆盖
const STORAGE_KEY = namespacedStorageKey('theme-mode')
// 2026-09-09 之前 persist key 是裸 'theme-mode'，老用户 localStorage 可能残留该 key，
// 一次性读取兜底并在命中后清除（persist 订阅随后只写新 key）
const LEGACY_STORAGE_KEY = 'theme-mode'

/**
 * 从 localStorage 读取初始 mode，非法值兜底为 'auto'。
 */
function readInitialMode(): ThemeMode {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (legacy === 'light' || legacy === 'dark' || legacy === 'auto') {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return legacy
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

export const useThemeStore = defineStore(
  'theme',
  () => {
    const mode = ref<ThemeMode>(readInitialMode())
    const isDark = ref(false)

    /**
     * 把 mode 应用到 <html> 上：auto 移除属性（让 CSS @media 接管），
     * 其他值设置 data-theme 属性（CSS 选择器精确命中）。
     */
    function applyTheme(value: ThemeMode) {
      if (typeof document === 'undefined') return // SSR 安全

      const root = document.documentElement
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      if (value === 'auto') {
        root.removeAttribute('data-theme')
        isDark.value = prefersDark
      } else {
        root.setAttribute('data-theme', value)
        isDark.value = value === 'dark'
      }
    }

    /**
     * 设置主题模式并应用。
     */
    function setMode(value: ThemeMode) {
      mode.value = value
      applyTheme(value)
    }

    /**
     * 智能切换：
     *   - 当前深色（含 auto + 系统深色） → 切换到 light
     *   - 当前浅色 → 切换到 dark
     */
    function toggleMode() {
      const next: ThemeMode = isDark.value ? 'light' : 'dark'
      setMode(next)
    }

    // 初始化应用主题
    applyTheme(mode.value)

    // 监听系统主题变化（仅 mode === 'auto' 时响应）
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      mql.addEventListener('change', (e) => {
        if (mode.value === 'auto') {
          isDark.value = e.matches
        }
      })
    }

    return { mode, isDark, setMode, toggleMode }
  },
  {
    persist: {
      key: STORAGE_KEY,
      storage: localStorage,
      pick: ['mode'],
    },
  }
)
