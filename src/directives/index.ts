import type { App } from 'vue'
import { autoImport } from '@/utils/autoImport'

/**
 * 自动扫描当前目录下所有指令文件并全局注册。
 *
 * 设计要点（参考 D:\work\应急水利\am-portal-mobile-yzy-fe\src\plugins\autoImportGlobalDirectivePlugin.js）：
 * - Vite 适配：import.meta.glob 替代 webpack require.context
 * - 自动跳过 index.ts 自身和下划线开头的内部工具文件（如 _utils.ts）
 * - 自动跳过 .d.ts 类型声明文件
 * - 指令文件必须 default export `{ install(app) }`（与项目内现有指令一致）
 * - 业务侧零改动：新增 v-foo.ts 后无需修改本文件
 *
 * 注册的指令（v- 前缀）：
 * - v-inputDebounce:    input 输入防抖（v-inputDebounce:1000="onInput"）
 * - v-buttonDebounce:   button 点击节流防重（v-buttonDebounce:500="onClick"）
 * - v-permission:       权限控制（v-permission="['user:edit']"）
 *
 * 未来新增指令：直接在 src/directives/ 下添加 v-xxx.ts 即可，
 * 无需在本文件 import，也无需修改 main.ts。
 */
interface DirectiveModule {
  default: { install: (app: App) => void }
}

// Vite equivalent of webpack require.context：
// 1. 扫描同目录所有 .ts 文件
// 2. eager 模式：同步导入（Vite 编译时已 inline）
// 3. 泛型指定模块 default export 形状
const modules = import.meta.glob<DirectiveModule>('./*.ts', { eager: true })

/**
 * Vue 3 插件：注册所有指令到 app。
 */
const install = (app: App): void => {
  autoImport({
    modules,
    filter: (path) => path.endsWith('/index.ts') || path.includes('/_') || path.endsWith('.d.ts'),
    transform: (path, mod) => {
      const plugin = mod.default
      if (plugin && typeof plugin.install === 'function') {
        plugin.install(app)
      } else {
        // 防御：模块不符合约定时打印警告，不中断应用启动
        console.warn(`[directives] 跳过非标准模块：${path}（应 default export { install(app) }）`)
      }
    },
  })
}

export default install
