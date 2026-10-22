import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// auth 不配置 coverage 阈值：app 只含登录页 + blank 布局（经浏览器人工验收），
// 单测只覆盖 auth 模块随迁的 spec；设阈值会逼出为凑数而写的无意义断言
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
