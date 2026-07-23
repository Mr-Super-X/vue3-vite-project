// 大小写命名转换工具
//
// 命名约定：
//   - PascalCase：每个单词首字母大写，**不加分隔符**（如 AsyncState）
//   - kebab-case：全小写，**单词间用 - 分隔**（如 async-state）
//
// 适用场景：
//   - 文件名 ↔ 路由 path 转换（如 `MyButton.vue` → `/demo/my-button`）
//   - 组件名 ↔ 标签名转换

/**
 * kebab-case / snake_case → PascalCase
 *
 * @example
 * pascalCase('async-state')   // 'AsyncState'
 * pascalCase('error_boundary') // 'ErrorBoundary'
 * pascalCase('my-button')     // 'MyButton'
 */
export function pascalCase(s: string): string {
  return s.replace(/(^|[-_])(\w)/g, (_, _p, c: string) => c.toUpperCase())
}

/**
 * PascalCase / camelCase → kebab-case
 *
 * @example
 * kebabCase('AsyncState')     // 'async-state'
 * kebabCase('ErrorBoundary')  // 'error-boundary'
 * kebabCase('myButton')       // 'my-button'
 */
export function kebabCase(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
