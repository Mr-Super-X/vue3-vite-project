import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// h5 不配置 coverage 阈值：h5-demo 示例页以浏览器验收为主，
// 单测只覆盖 h5 自有的 composables/config/layouts；设阈值会逼出为凑数而写的断言
export default mergeConfig(
  viteConfig as never,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**', 'tests/e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      globals: true,
      server: {
        deps: {
          inline: ['element-plus', '@element-plus/icons-vue'],
        },
      },
      css: true,
    },
  })
)
