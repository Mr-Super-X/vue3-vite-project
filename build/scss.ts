import process from 'node:process'

/**
 * SCSS additionalData 注入 + silenceDeprecations 配置
 *
 * bem mixin 通过 $BEM_PREFIX 拼前缀，与 src/utils/bem.ts 的 import.meta.env.VITE_BEM_PREFIX 共享来源
 *
 * silenceDeprecations 白名单：
 *   - 'new-global': bem mixin 的 b() 内 $B: $block !global，Dart Sass 1.78+ 警告
 *   - 'if-function': bem mixin 的 b() 内 if() 拼接前缀，Dart Sass 1.78+ 标记 deprecation
 * 两个 deprecation 在 sass 2.0 升级前必须静默，否则 CI 红。
 *
 * silenceDeprecations 显式标注为字面量联合数组，匹配 vite 的 DeprecationOrId 期望，
 * 同时保持可变（与 vite 的 `SassModernPreprocessBaseOptions` 完全兼容）
 */
export const SCSS_PREPROCESSOR_OPTIONS: {
  silenceDeprecations: Array<'new-global' | 'if-function'>
  additionalData: string
} = {
  silenceDeprecations: ['new-global', 'if-function'],
  additionalData: `@use '@/assets/styles/mixins/bem' as * with ($BEM_PREFIX: '${process.env.VITE_BEM_PREFIX ?? 'vv'}');\n`,
}
