// 路由自动注册
//
// 自动扫描 src/modules/**/routes/index.ts 并注册到全局路由。
// 业务模块无需在 router/index.ts 中手动 import —— 新增页面后自动生效。
//
// 使用 Vite import.meta.glob 特性（构建期扫描，不影响运行时性能）：
//   - 路径以 '/' 开头表示项目根
//   - eager: true 表示同步加载（路由配置需要立即可用）
//   - 返回值是 { [path]: Module } 字典
//
// 排除规则：
//   - error 模块（含 catch-all 404 兜底）必须在所有业务路由之后注册，
//     因此单独在 router/index.ts 手动 import，不走自动注册。
//
// 新增业务模块的标准流程（无需改 router 目录）：
//   1. 创建 src/modules/<feature>/routes/index.ts
//   2. 在 types.ts 追加 RouteName
//   3. 在 component-registry.ts 追加映射
//   4. 完成 —— 路由自动可用

import type { RouteRecordRaw } from 'vue-router'

interface RouteModuleExport {
  default: RouteRecordRaw[]
}

// Vite 同步扫描：编译期把所有匹配的 routes/index.ts 加载进来
const modules = import.meta.glob<RouteModuleExport>('/src/modules/**/routes/index.ts', {
  eager: true,
})

export const autoRegisteredRoutes: RouteRecordRaw[] = Object.values(modules).flatMap(
  (m) => m.default
)
