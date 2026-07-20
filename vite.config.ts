import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { viteMockServe } from 'vite-plugin-mock'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    UnoCSS(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/components.d.ts',
    }),
    // 仅在 dev/test 环境启用 mock（生产构建剔除）
    viteMockServe({
      mockPath: 'mock',
      enable: process.env.NODE_ENV !== 'production',
      watchFiles: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // src 下子目录别名（告别 ../../../utils/... 这种繁琐相对路径）
      // 与 tsconfig.app.json 的 paths 配置保持同步
      '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@composables': fileURLToPath(new URL('./src/composables', import.meta.url)),
      '@directives': fileURLToPath(new URL('./src/directives', import.meta.url)),
      '@enums': fileURLToPath(new URL('./src/enums', import.meta.url)),
      '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      '@locales': fileURLToPath(new URL('./src/locales', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@router': fileURLToPath(new URL('./src/router', import.meta.url)),
      '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {},
      less: { javascriptEnabled: true },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 手动拆分第三方库（vendor chunk）→ 利用浏览器强缓存
        // 业务代码 (src/) 变化时只更新业务 chunk，第三方库 chunk 命中缓存
        // 注：Vite 8 用 rolldown 替代 rollup，manualChunks 必须是函数（不能是对象）
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Vue 核心：vue / vue-router / pinia / @vue/*
          if (id.includes('/vue/') || id.includes('/pinia/') || id.includes('/@vue/')) {
            return 'vendor-vue'
          }
          // UI 库：element-plus / @element-plus/icons-vue / unplugin-vue-components
          if (id.includes('/element-plus/') || id.includes('/unplugin-vue-components/')) {
            return 'vendor-ui'
          }
          // 其他第三方库：axios / vue-i18n / 等
          return 'vendor-utils'
        },
      },
    },
  },
})
