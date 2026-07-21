import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  theme: {
    colors: {
      primary: 'var(--el-color-primary)',
      success: 'var(--el-color-success)',
      warning: 'var(--el-color-warning)',
      danger: 'var(--el-color-danger)',
    },
  },
  // 复合工具类（.gm-flex-* / .gm-ellipsis-* / .gm-clearfix 等）统一在
  // src/assets/styles/custom.scss 中定义（见 docs/05-BEM样式规范.md）。
  // 此处不定义 BEM 命名空间的快捷类，避免与项目样式规范冲突。
})
