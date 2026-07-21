// 主题 Composable
//
// 对 useThemeStore 的便捷封装，组件中调用更简洁。
//
// @example
// ```vue
// <script setup lang="ts">
// import { useTheme } from '@composables/useTheme'
//
// const { mode, isDark, setMode, toggleMode } = useTheme()
// </script>
//
// <template>
//   <el-button @click="toggleMode">
//     {{ isDark ? '☀️ 浅色' : '🌙 深色' }}
//   </el-button>
//   <el-radio-group v-model="mode" @change="setMode">
//     <el-radio-button value="light">浅色</el-radio-button>
//     <el-radio-button value="dark">深色</el-radio-button>
//     <el-radio-button value="auto">跟随系统</el-radio-button>
//   </el-radio-group>
// </template>
// ```

import { storeToRefs } from 'pinia'
import { useThemeStore } from '@store/modules/theme'

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
