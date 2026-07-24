/**
 * 在 src/utils/index.ts 中统一导出 utils 下的所有工具函数，方便在其他地方直接使用
 *
 * 例如：
 * import { Local, Session, clearByNamespace } from '@/utils'
 * Local.set('token', 'xxx')
 * Session.get('userInfo')
 */

export * from './autoImport' // 通用 auto-import helper（filter + transform）
export * from './bem' // 导出 bem 模块所有的配置
export * from './caseConvert' // 命名转换（pascalCase / kebabCase）
export * from './dayjs' // 导出 dayjs 模块所有的配置
export * from './format' // 导出 format 模块所有的配置（formatDate / formatMoney / truncate）
export * from './safeAsync' // 导出 safeAsync 模块所有的配置（safeAsync / trySafeSync）
export * from './storage' // 导出 storage 模块所有的配置
export * from './validate' // 导出 validate 模块所有的配置
export * from './consoleBadge' // 导出 consoleBadge 模块所有的配置
