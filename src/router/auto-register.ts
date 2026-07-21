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
//   - error 模块的具名错误页走自动注册（src/modules/error/routes/index.ts）
//   - catch-all 404 兜底单独在 router/fallback.ts 注册（保证最后匹配）
//
// 新增业务模块的标准流程（无需改 router 目录）：
//   1. 创建 src/modules/<feature>/routes/index.ts
//   2. 在 types.ts 追加 RouteName
//   3. 在 component-registry.ts 追加同名映射
//   4. 完成 —— 路由自动可用
//   （scripts/check-routes.ts 可一键校验 3 处一致性）

import type { RouteRecordRaw } from 'vue-router'

interface RouteModuleExport {
  default: RouteRecordRaw[]
}

/**
 * Vite `import.meta.glob` 路径（必须是字面量字符串，Vite 编译期限制）。
 *
 * 命名约束（修改本字符串前请同步更新 docs/07-路由模块设计.md）：
 *   1. 业务模块路由文件必须命名为 `routes/index.ts`（不是 `routes.ts`）
 *   2. 必须放在 `src/modules/<feature>/` 目录下
 *   3. 导出格式必须是 `export default RouteRecordRaw[]`
 *
 * 路径前缀 `/src/` 与 Vite 项目根对应；如调整 src 别名（如改用 `srcDir`），
 * 需要同步修改本字符串。
 *
 * 为什么不能用变量：Vite 在编译期扫描源码中 `import.meta.glob(...)` 的字面量参数，
 * 动态变量无法被静态分析。详见 https://cn.vitejs.dev/guide/features.html#glob-import
 */
const modules = import.meta.glob<RouteModuleExport>('/src/modules/**/routes/index.ts', {
  eager: true,
})

export const autoRegisteredRoutes: RouteRecordRaw[] = Object.values(modules).flatMap(
  (m) => m.default
)
