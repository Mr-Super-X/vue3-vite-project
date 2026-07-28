/// <reference types="vite/client" />

// 业务侧自定义环境变量（Vite 只会把 VITE_ 前缀的变量暴露给客户端代码）。
// 通过 interface merging 给 Vite 内置的 ImportMetaEnv 追加字段，让 import.meta.env.VITE_BEM_PREFIX
// 在 TS 端有类型推断；同时也是整个项目对"环境变量白名单"的统一入口。
interface ImportMetaEnv {
  /** BEM 类名前缀；空串表示无前缀。详见 src/utils/bem.ts。 */
  readonly VITE_BEM_PREFIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
