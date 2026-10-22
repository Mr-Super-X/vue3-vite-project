import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// docs 不配置 coverage 阈值：站点内容几乎全是 demo 示例（经浏览器人工验收），
// 单测只覆盖 demo 自有的 composables/config；设阈值会逼出为凑数而写的 demo 断言
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
