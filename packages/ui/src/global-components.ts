/**
 * 全局组件自动注册插件工厂（@vv/ui 出口，P1-4 起归包内）。
 *
 * 自动扫描 `src/components/common/**` 下所有 .vue 文件（eager），按 BEM 命名注册到 app。
 * 工厂形态原因：包化后插件不再持有 app 侧默认导出语义，各 app 入口按需
 * `app.use(createGlobalComponents())`（多 app 各自实例化，互不共享注册计数）。
 *
 * 三层过滤：
 * 1. glob 排除（仅 import 阶段）：排除 `*.spec.ts` / `*.d.ts`
 * 2. `_internal` 目录（`./components/common/_internal/naming` 提供 `isExcluded`）
 * 3. 组件 default 缺失 / 组件名重复
 *
 * dev 模式：console 输出注册数 / 跳过数（GitHub 风格徽章）
 * prod 模式：静默，仅 console.warn 真正异常
 *
 * @see [`./components/common/_internal/naming`](./components/common/_internal/naming.ts) 命名工具
 * @see `@vv/shared` utils/autoImport —— 通用 autoImport 工具
 * @group 全局组件注册
 */
import type { App, Component } from 'vue'
import { isExcluded, resolveComponentName } from './components/common/_internal/naming.ts'
import { autoImport, showBadge } from '@vv/shared'

/**
 * 在 Vite 构建时同步内联 common 下所有 .vue 模块
 * eager: true 让导入在 build/dev 时立即求值，运行时无异步开销
 * 注意：glob 相对本文件位置解析（@vv/ui/src/），迁入包后必须带 components/ 段
 */
const modules = import.meta.glob<{ default: Component }>('./components/common/**/*.{vue,Vue}', {
  eager: true,
})

/**
 * 创建全局组件注册插件实例（每个 app 调用一次）。
 * @returns 标准 Vue 插件对象（{ install }）
 */
export function createGlobalComponents(): { install: (app: App) => void } {
  return {
    install(app: App) {
      let registered = 0
      let skipped = 0
      const registeredNames = new Set<string>()
      const skippedReasons: string[] = [] // 收集跳过组件的 filepath 或 name，便于排查

      autoImport({
        modules,
        // 业务特定排除（_internal 等目录）
        filter: (filepath) => isExcluded(filepath),
        transform: (filepath, mod) => {
          // 第二层过滤：组件 default 缺失（异常文件）
          const component = mod.default
          if (!component) {
            skipped++
            skippedReasons.push(`${filepath} (无 default export)`)
            return
          }
          // 第三层过滤：组件名重复
          const name = resolveComponentName(filepath, component.name ?? undefined)
          if (registeredNames.has(name)) {
            console.warn(`[GlobalComponents] 重复的组件名 "${name}"，跳过: ${filepath}`)
            skipped++
            skippedReasons.push(`${name} (重名 → ${filepath})`)
            return
          }
          app.component(name, component)
          registeredNames.add(name)
          registered++
        },
      })

      if (import.meta.env.DEV && !import.meta.env.VITE_QUIET_DEV) {
        // dev 模式用 GitHub 风格徽章汇总；标签深灰与 Web Vitals（深紫）拉开
        // 关闭方式：.env.local 加 VITE_QUIET_DEV=1（适合专注调试时减少噪音）
        showBadge('GlobalComponents（common） · 已注册', `${registered} 个`, '#1f2937', '#0e9f6e')
        showBadge('GlobalComponents（common） · 已跳过', `${skipped} 个`, '#1f2937', '#6b7280')

        if (skippedReasons.length > 0) {
          console.warn('[GlobalComponents] 跳过详情：\n  - ' + skippedReasons.join('\n  - '))
        }
      }
    },
  }
}
