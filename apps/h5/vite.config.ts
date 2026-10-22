/**
 * Vite 工程配置（h5 移动端消费端）
 *
 * 插件装配 / 别名 / css 预处理 / 构建分包全部收敛到 @vv/config 的 createViteConfig 工厂
 * （packages/config/src/create-vite-config.ts，单一来源）；本文件只声明 app 参数。
 * 与 admin 的差异：无 vueDevTools / visualizer 私有插件；h5Rem: true——
 * h5-demo 模块与 h5 layout 自 P3-2 起物理独立到本 app（admin 已摘除并关 h5Rem），
 * postcss-pxtorem 转换范围锚定本 appRoot（见 packages/config/src/postcss.ts）；
 * 端口偏移 +3（admin 5174 / docs 5175 / h5 5177 可并行 dev）。
 *
 * 历史：
 *   - 2026-10-22: P3-2 新建（h5 移动端独立为 apps/h5，Monorepo 迁移）
 */
import { fileURLToPath } from 'node:url'
import { createViteConfig } from '@vv/config'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default createViteConfig({
  appRoot,
  appName: 'h5',
  base: process.env.VITE_BASE ?? '/',
  // vite-plugin-mock 以 isAbsPath 判定 mockPath（dist/index.mjs:224），绝对路径安全；
  // mock 数据源在 @vv/mock 包（packages/mock/src），与 admin / docs 同源
  mockPath: fileURLToPath(new URL('../../packages/mock/src', import.meta.url)),
  portOffset: 3,
  // h5 rem 适配：仅转换本 app src/layouts/h5 与 src/modules/h5-*（postcss.ts 约定）
  h5Rem: true,
})
