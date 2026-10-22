/**
 * Vite 工程配置（portal 消费端）
 *
 * 插件装配 / 别名 / css 预处理 / 构建分包全部收敛到 @vv/config 的 createViteConfig 工厂
 * （packages/config/src/create-vite-config.ts，单一来源）；本文件只声明 app 参数。
 * 与 admin 的差异：无 vueDevTools / visualizer 私有插件、无 h5Rem（h5 布局归 admin）、
 * 端口偏移 +2（admin 5174 / docs 5175 / portal 5176 可并行 dev）。
 *
 * base 经 VITE_BASE 注入：gh-pages 多应用聚合构建（scripts/build-pages.ts 自动发现
 * apps/*）按 /vue3-vite-project/portal/ 注入；CLI --base 优先级更高（vite 语义）。
 *
 * 历史：
 *   - 2026-10-22: P3-1 新建（企业官网门户从 apps/admin 的 home 模块独立，Monorepo 迁移）
 */
import { fileURLToPath } from 'node:url'
import { createViteConfig } from '@vv/config'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default createViteConfig({
  appRoot,
  appName: 'portal',
  base: process.env.VITE_BASE ?? '/',
  // vite-plugin-mock 以 isAbsPath 判定 mockPath（dist/index.mjs:224），绝对路径安全；
  // mock 数据源在 @vv/mock 包（packages/mock/src），骨架与 docs 同构保留（官网暂无
  // HTTP 请求，mock 仅作 gh-pages 演示产物的能力预留）
  mockPath: fileURLToPath(new URL('../../packages/mock/src', import.meta.url)),
  portOffset: 2,
})
