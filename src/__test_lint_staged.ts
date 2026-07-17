// 故意用分号风格（违反 prettier 配置）+ 单行长字符串
export const testLintStaged =
  '这是一个故意违反 Prettier 风格的文件，用于验证 lint-staged 是否会自动去掉分号和重新格式化长字符串'
export function foo() {
  return 42
}
