/**
 * 主题 Composable。
 *
 * 对 `useThemeStore` 的便捷封装，组件中调用更简洁。
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useTheme } from '@composables/useTheme'
 *
 * const { mode, isDark, setMode, toggleMode } = useTheme()
 * </script>
 *
 * <template>
 *   <el-button @click="toggleMode">
 *     {{ isDark ? '☀️ 浅色' : '🌙 深色' }}
 *   </el-button>
 *   <el-radio-group v-model="mode" @change="setMode">
 *     <el-radio-button value="light">浅色</el-radio-button>
 *     <el-radio-button value="dark">深色</el-radio-button>
 *     <el-radio-button value="auto">跟随系统</el-radio-button>
 *   </el-radio-group>
 * </template>
 * ```
 *
 * @see [`src/store/modules/theme`](../store/modules/theme) theme store（持久化、跟随系统）
 * @group 主题组合式 API
 */

import { useThemeStore } from '@store/modules/theme'

/**
 * 获取主题切换相关响应式状态与方法。
 *
 * 返回值：
 * - `mode`：当前主题模式（`'light'` / `'dark'` / `'auto'`）
 * - `isDark`：当前是否为深色（computed；`auto` 模式下跟随系统）
 * - `setMode`：手动设置模式
 * - `toggleMode`：在 `'light'` 与 `'dark'` 间切换
 *
 * @group 主题组合式 API
 */
export function useTheme() {
  const store = useThemeStore()
  const { mode, isDark } = storeToRefs(store)
  return {
    mode,
    isDark,
    setMode: store.setMode,
    toggleMode: store.toggleMode,
  }
}
