import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// 单一职责：组合 Vue/TS/Prettier 三层规则
// Prettier 规则必须放最后，避免与 Prettier 冲突
export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.husky/**',
      '**/mock/**',
      '**/scripts/**/*.cjs'
    ],
  },
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),
  // 业务目录强制使用项目封装
  // - 拦截 useRouter：业务代码必须用 @composables/useAppRouter
  // - 拦截 axios：业务代码必须用 @composables/useRequest 或 @api/_http
  // - 白名单：composables/router/plugins/main.ts 默认不受限
  {
    name: 'app/business-wrap-rule',
    files: [
      'src/modules/**/*.{ts,vue}',
      'src/components/**/*.{ts,vue}'
    ],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['vue-router'],
              importNames: ['useRouter'],
              message:
                '业务代码禁止直接使用 vue-router 的 useRouter，请改用 @composables/useAppRouter',
            },
            {
              group: ['axios', 'axios/*'],
              message:
                '业务代码禁止直接使用 axios 包，请通过 @composables/useRequest 或 @api/_http 调用',
            },
          ],
        },
      ],
    },
  },
  // 项目级规则覆盖：
  // - 关闭单字组件名（项目刻意保持简洁命名）
  // - 允许 _ 前缀变量被忽略（用于"解构但暂不使用"的场景）
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  skipFormatting,
]
