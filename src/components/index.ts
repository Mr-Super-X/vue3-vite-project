// src/components/index.ts
import type { App, Component } from 'vue'
import { isExcluded, resolveComponentName } from './common/_internal/naming'
import { autoImport } from '@/utils/autoImport'

/**
 * 在 Vite 构建时同步内联 common 下所有 .vue 模块
 * eager: true 让导入在 build/dev 时立即求值，运行时无异步开销
 */
const modules = import.meta.glob<{ default: Component }>('./common/**/*.{vue,Vue}', {
  eager: true,
})

export default {
  install(app: App) {
    let registered = 0
    let skipped = 0
    const registeredNames = new Set<string>()

    autoImport({
      modules,
      // 第一层过滤：_internal/ 等目录排除
      filter: (filepath) => isExcluded(filepath),
      transform: (filepath, mod) => {
        // 第二层过滤：组件 default 缺失（异常文件）
        const component = mod.default
        if (!component) {
          skipped++
          return
        }
        // 第三层过滤：组件名重复
        const name = resolveComponentName(filepath, component.name ?? undefined)
        if (registeredNames.has(name)) {
          console.warn(`[GlobalComponents] 重复的组件名 "${name}"，跳过: ${filepath}`)
          skipped++
          return
        }
        app.component(name, component)
        registeredNames.add(name)
        registered++
      },
    })

    if (import.meta.env.DEV) {
      console.info(`[GlobalComponents] 注册 ${registered} 个组件（跳过 ${skipped} 个）`)
    }
  },
}
