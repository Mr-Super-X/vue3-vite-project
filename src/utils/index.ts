/**
 * 在 src/utils/index.ts 中统一导出 utils 下的所有工具函数，方便在其他地方直接使用
 *
 * 例如：
 * import { Local, Session, clearByNamespace } from '@/utils'
 * Local.set('token', 'xxx')
 * Session.get('userInfo')
 */

export * from './bem' // 导出 bem 模块所有的配置
export * from './dayjs' // 导出 dayjs 模块所有的配置
export * from './storage' // 导出 storage 模块所有的配置
export * from './validate' // 导出 validate 模块所有的配置
export * from './consoleBadge' // 导出 consoleBadge 模块所有的配置
