/**
 * ProTable 公共入口（参考 form-schema/index.ts barrel 模式）。
 *
 * 项目角色：ProTable 组件库对外唯一出口，业务方通过
 * `import { ProTable, type ProColumn } from '@/components/ProTable'`。
 *
 * JSDoc IDE 提示规范：所有 re-export 上方必须有 JSDoc（CLAUDE.md §5.1 陷阱 #3）。
 *
 * @see [`./types/index.ts`](./types/index.ts) 类型定义
 * @group ProTable 入口
 */
import type { App, Component } from 'vue'
import ProTable from './ProTable.vue'

/** ProTable 组件（具名导出；默认导出是插件形式） @group ProTable 入口 */
export { ProTable }

/**
 * ProTable 完整类型索引（spec §4 / §八）—— 业务方按需 import。
 *
 * JSDoc IDE 提示规范：barrel 用 `export { type X }` 保留真实定义位置的注释（§5.1 陷阱 #3）。
 *
 * @see [`./types/index.ts`](./types/index.ts) 完整定义
 * @group ProTable 入口
 */
export {
  type ProColumn,
  type ProTableProps,
  type ProTableExpose,
  type ProTableRequestApi,
  type ProTableResponse,
  type EnumProps,
  type SearchConfig,
  type SearchElType,
  type TableEngine,
  type TableDensity,
} from './types'

/**
 * Vue 插件形式：app.use(ProTablePlugin) 注册全局 <ProTable> 组件。
 *
 * @group ProTable 入口
 */
const ProTablePlugin: { install: (app: App) => void } & Component = {
  install(app) {
    app.component('ProTable', ProTable)
  },
}

export default ProTablePlugin
