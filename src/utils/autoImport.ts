/**
 * 通用 auto-import helper：扫描模块 + 过滤 + 转换。
 *
 * 设计要点：
 * - 调用方负责 `import.meta.glob(...)`（Vite 编译期字面量要求，无法 mock）
 * - 本 helper 只负责 filter + transform，逻辑可单测覆盖
 * - 适用于：路由聚合、组件注册、指令安装、插件加载等场景
 *
 * @example 路由聚合
 * ```ts
 * // 注：实际 glob 模式带通配符（避免在 JSDoc 内书写以免提前关闭注释）
 * const modules = import.meta.glob<RouteModuleExport>('/src/modules/MODULE/routes/index.ts', { eager: true })
 * export const autoRegisteredRoutes = autoImport({
 *   modules,
 *   transform: (_, m) => m.default,
 * }).flat()
 * ```
 *
 * @example Vue 组件注册
 * ```ts
 * // 注：glob 模式带通配符（避免在 JSDoc 内书写以免提前关闭注释）
 * const modules = import.meta.glob<{ default: Component }>('./common/COMPONENT.{vue,Vue}', { eager: true })
 * for (const _ of autoImport({
 *   modules,
 *   filter: (path) => isExcluded(path),
 *   transform: (path, mod) => app.component(deriveName(path), mod.default),
 * })) {}
 * ```
 *
 * @example 指令安装
 * ```ts
 * const modules = import.meta.glob<DirectiveModule>('./*.ts', { eager: true })
 * export default (app: App) => {
 *   autoImport({
 *     modules,
 *     filter: (path) => path.endsWith('/index.ts') || path.includes('/_'),
 *     transform: (_, mod) => mod.default?.install(app),
 *   })
 * }
 * ```
 */

export interface AutoImportOptions<M, R = void> {
  /** Vite import.meta.glob 扫描结果（key 为模块路径，value 为模块对象） */
  modules: Record<string, M>
  /**
   * 跳过模块的过滤器（基于路径）。
   * 返回 true 跳过；返回 false 继续处理。
   */
  filter?: (path: string) => boolean
  /**
   * 对每个未被过滤的模块执行的处理。
   * 返回值会收集到结果数组中。
   */
  transform: (path: string, mod: M) => R
}

/**
 * 遍历已过滤的模块，对每个模块调用 transform，返回所有结果。
 *
 * 与 `import.meta.glob` 配合：
 * - glob 表达式必须是字面量字符串（Vite 编译期要求）
 * - 本函数仅做 filter + transform 编排，与构建解耦便于测试
 */
export function autoImport<M, R = void>(options: AutoImportOptions<M, R>): R[] {
  const results: R[] = []
  for (const [path, mod] of Object.entries(options.modules)) {
    if (options.filter?.(path)) continue
    results.push(options.transform(path, mod))
  }
  return results
}
