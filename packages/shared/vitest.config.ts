/**
 * @vv/shared 单测配置（vitest）
 *
 * 与 apps/admin/vitest.config.ts 的差异：本包无 .vue 组件、无 vite 插件依赖
 * （组件归 @vv/ui / app 侧），故不合并 vite 工厂配置，最小化到环境 + 根路径。
 *
 * - environment: jsdom —— storage / 指令 / store spec 需要 DOM（localStorage 等）
 * - 别名不需要：包内一律相对路径 + .ts 扩展名（Node 原生 ESM 语义，不补全扩展名）
 * - AutoImport：包源码按 app 约定使用注入式全局（ref / defineStore / ElMessage 等），
 *   运行期必须由同一插件补齐，否则 ReferenceError；dts 关闭——类型层由
 *   src/types/auto-globals.d.ts 手工同构子集承担（避免生成文件随测试抖动）
 */
import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver({ importStyle: false })],
      dts: false,
    }),
  ],
  test: {
    environment: 'jsdom',
    root: fileURLToPath(new URL('./', import.meta.url)),
    globals: true,
    exclude: [...configDefaults.exclude],
  },
})
