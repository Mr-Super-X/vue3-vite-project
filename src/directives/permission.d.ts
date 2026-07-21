// permission 指令类型定义（与 permission.ts 配套）
// 分离类型到 .d.ts：与 inputDebounce/buttonDebounce 同范式

/**
 * 扩展 HTMLElement（兼容 Element Plus 等 UI 库封装的元素）
 */
export type ElHTMLElement = HTMLElement

/**
 * v-permission 指令的 binding 类型
 *
 * 用法：v-permission="['user:edit']" 或 v-permission:any="['user:edit']"
 * - value：需要的权限列表（任意一个匹配即通过；AND/OR 由后续实现决定）
 * - arg：可选模式（'all' / 'any' 等）
 * - modifiers：修饰符对象（如 .has 改 has 操作）
 */
export interface PermissionBinding {
  value: string[]
  arg?: string
  modifiers?: Record<string, boolean>
}
