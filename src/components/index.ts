// src/components/index.ts
import type { App, Component } from 'vue'
import { isExcluded, resolveComponentName } from './common/_internal/naming'

/**
 * 在 Vite 构建时同步内联 common 下所有 .vue 模块
 * eager: true 让导入在 build/dev 时立即求值，运行时无异步开销
 */
const modules = import.meta.glob<{ default: Component }>('./common/**/*.{vue,Vue}', { eager: true })

export default {
  install(app: App) {
    let registered = 0
    let skipped = 0
    const registeredNames = new Set<string>()

    for (const [filepath, mod] of Object.entries(modules)) {
      if (isExcluded(filepath)) {
        skipped++
        continue
      }
      const component = mod.default
      if (!component) {
        skipped++
        continue
      }
      const name = resolveComponentName(filepath, component.name ?? undefined)
      if (registeredNames.has(name)) {
        console.warn(`[GlobalComponents] 重复的组件名 "${name}"，跳过: ${filepath}`)
        skipped++
        continue
      }
      app.component(name, component)
      registeredNames.add(name)
      registered++
    }

    if (import.meta.env.DEV) {
      console.info(`[GlobalComponents] 注册 ${registered} 个组件（跳过 ${skipped} 个）`)
    }
  },
}
