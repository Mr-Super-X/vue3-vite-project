/**
 * apps-registry 的类型声明（供 scripts/*.ts 与 tsconfig.node.json 类型检查消费）
 *
 * 实现本体是 apps-registry.mjs（纯 ESM、无 TS 语法）：eslint.config.mjs 由 ESLint
 * 直接加载，Node 不带 --experimental-strip-types，读不了 .ts——注册表必须以 .mjs 形态
 * 作为运行时单一事实来源；本文件只镜像其形状，改注册表字段时必须同步改这里。
 */

/** app 注册表条目：app 名 + dev 端口 + 系统兜底路由名单（单源约束见 apps-registry.mjs 头注） */
export interface RegistryAppEntry {
  /** app 目录名（apps/<name>），同时是网关路径前缀（VITE_BASE=/<name>/）与 ESLint 边界规则粒度 */
  name: string
  /** dev server 端口 = packages/config/src/server.ts SERVER_DEFAULTS.port(5174) + 各 app vite.config portOffset */
  port: number
  /** 系统兜底路由 name（B/C 校验语义：必须可匿名访问 + 必须有真实路由实现），未列出的 app 不注册 = 不校验 */
  requiredRoutes: readonly string[]
}

export const APPS: readonly RegistryAppEntry[]
