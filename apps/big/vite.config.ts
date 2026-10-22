/**
 * Vite 工程配置（big 消费端）
 *
 * 插件装配 / 别名 / css 预处理 / 构建分包全部收敛到 @vv/config 的 createViteConfig 工厂
 * （packages/config/src/create-vite-config.ts，单一来源）；本文件只声明 app 参数。
 * 与 admin 的差异：无 vueDevTools / visualizer 私有插件、无 h5Rem（h5 布局归 admin）、
 * 端口偏移 +4（admin 5174 / docs 5175 / big 5178 可并行 dev）。
 *
 * base 经 VITE_BASE 注入；CLI --base 优先级更高（vite 语义）。
 *
 * 历史：
 *   - 2026-10-22: P3-3 新建（big layout + big-demo 模块自 admin 物理独立，Monorepo 迁移）
 */
import { fileURLToPath } from 'node:url'
import { createViteConfig } from '@vv/config'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default createViteConfig({
  appRoot,
  appName: 'big',
  base: process.env.VITE_BASE ?? '/',
  // vite-plugin-mock 以 isAbsPath 判定 mockPath（dist/index.mjs:224），绝对路径安全；
  // mock 数据源在 @vv/mock 包（packages/mock/src）；big-demo 数据层为静态 mock（apis/index.ts），
  // 保留 mockPath 只为与 docs 骨架同口径（工厂统一装配，prod 构建整分支 tree-shake）
  mockPath: fileURLToPath(new URL('../../packages/mock/src', import.meta.url)),
  portOffset: 4,
})
