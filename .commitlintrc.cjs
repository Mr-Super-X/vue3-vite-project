// commitlint 配置：基于 @commitlint/config-conventional（Angular 规范）
// type 必须在 types 列表中，subject 不超过 72 字符
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 关键：不允许空 type（commitlint 默认放过"无 type 前缀"消息，加这条才严格）
    'type-empty': [2, 'never'],
    // subject 长度限制（不含 type 前缀）
    'header-max-length': [2, 'always', 72],
    // 不强制 scope（保持灵活）
    'scope-empty': [0],
  },
}
