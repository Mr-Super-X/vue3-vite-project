import pluginVue from 'eslint-plugin-vue'
// import vueTsEslintConfig from '@vue/eslint-config-typescript'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// 单一职责：组合 Vue/TS/Prettier 三层规则
// Prettier 规则必须放最后，避免与 Prettier 冲突
//
// 用 withVueTs（v14.9+ 推荐 API）替代旧的 vueTsEslintConfig()：旧 API 声明 scriptLangs 要靠
// configureVueProject 改全局状态，而 demo 的 JSX 插槽示例需要 <script setup lang="tsx">。
// 规则等级保持 vueTsConfigs.recommended（与迁移前的 vueTsEslintConfig() 默认值一致）——
// 升级到 recommendedTypeChecked 会给全项目引入类型感知规则并显著拖慢 lint，属独立议题。
export default withVueTs(
  // scriptLangs 默认 ['ts']，显式加 'tsx' 才允许 .vue 内写 JSX。
  // 代价：lang="tsx" 的 .vue 会落入 typescript-eslint 的 disableTypeChecked 名单——
  // 本项目未启用 type-aware 规则（recommended 而非 recommendedTypeChecked），故该名单为空集；
  // .vue 的类型安全由 `pnpm type-check:full`（vue-tsc）全量保证，不依赖 eslint。
  // 不加 'tsx' 的话，.vue 内写 JSX 会被 vue-eslint-plugin 误报为 "Parsing error: Unexpected token"。
  // 导致 pre-commit 阶段的 lint-fix 失败，阻塞提交。
  { scriptLangs: ['ts', 'tsx'] },
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
      '**/scripts/**/*.cjs',
    ],
  },
  // Vue 官方基础规则
  ...pluginVue.configs['flat/essential'],
  // TypeScript 规则等级，vueTsConfigs.recommended = vueTsEslintConfig()
  vueTsConfigs.recommended,
  // 业务目录强制使用项目封装
  // - 拦截 useRouter：业务代码必须用 @composables/useAppRouter
  // - 拦截 axios：业务代码必须用 @composables/useRequest 或 @api/_http
  // - 白名单：composables/router/plugins/main.ts 默认不受限
  {
    name: 'app/business-wrap-rule',
    files: ['src/modules/**/*.{ts,vue}', 'src/components/**/*.{ts,vue}'],
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
  skipFormatting
)
