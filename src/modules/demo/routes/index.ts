// demo 模块路由（仅开发环境）
//
// 全部自动化：扫描 examples/ 下所有 .vue 入口自动注册 children 路由。
// 加新 demo 组件**只需在 examples/ 目录新建 PascalCase.vue**（或 PascalCase/index.vue）——
// 路由名 / path / meta.title 自动派生，sidebar 自动出现，无需改本文件。
//
// 支持两种文件组织方式（glob 同时扫）：
//   examples/AsyncState.vue         → path: 'async-state',    name: 'DemoAsyncState'
//   examples/ErrorBoundary/index.vue → path: 'error-boundary', name: 'DemoErrorBoundary'
//                                     （剥掉 index.vue 后缀，取父目录名）
//
// DEV 门控：生产构建时 import.meta.env.DEV === false，整个数组被替换为 []，
// Rollup tree-shake 会把整个模块连同其依赖的视图组件一并剔除。

import type { RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import { pascalCase, kebabCase, autoImport } from '@/utils'

// Vite import.meta.glob 扫描 examples 下所有 .vue 入口
// 路径相对当前文件（routes/index.ts），examples 在父目录 → 用 '../examples/...'
// 路径必须是字面量字符串（Vite 编译期限制）。
//
// DEV 门控：prod 构建时整个表达式替换为 {}，import.meta.glob 不展开，
// examples 文件不进 bundle，整模块 tree-shake 干净。
const exampleModules: Record<string, () => Promise<{ default: Component }>> = import.meta.env.DEV
  ? import.meta.glob<{ default: Component }>(['../examples/*.vue', '../examples/*/index.vue'])
  : {}

/** 从 glob 返回的 key 中提取组件名（剥目录与 .vue 后缀） */
function deriveComponentName(filePath: string): string {
  // '../examples/AsyncState.vue'         → ['..', 'examples', 'AsyncState.vue']
  // '../examples/MyButton/index.vue'     → ['..', 'examples', 'MyButton', 'index.vue']
  const segments = filePath.split('/')
  const last = segments[segments.length - 1]!
  // 文件夹 + index.vue 形式：取父目录名
  if (last === 'index.vue') return segments[segments.length - 2]!
  // 直接 .vue 文件：去掉后缀
  return last.replace(/\.vue$/, '')
}

/** 把 glob 扫描结果转为 RouteRecordRaw 数组 */
function buildExampleRoutes(): RouteRecordRaw[] {
  return autoImport({
    modules: exampleModules,
    transform: (filePath, component) => {
      const fileName = deriveComponentName(filePath)
      return {
        path: kebabCase(fileName),
        name: 'Demo' + pascalCase(fileName),
        component: component as () => Promise<unknown>,
        meta: { title: pascalCase(fileName), icon: 'document' },
      }
    },
  }).sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

const exampleRoutes = buildExampleRoutes()
// 默认 redirect 到按文件名字母序的第一个 children 路由
// 用对象形式 + name 跳转，避开字符串 redirect 的路径解析歧义
const defaultChildName = exampleRoutes[0]?.name

const routes: RouteRecordRaw[] = import.meta.env.DEV
  ? [
      {
        path: '/demo',
        name: 'Demo',
        component: () => import('@/layouts/blank/index.vue'),
        redirect: defaultChildName ? { name: defaultChildName } : '/demo',
        meta: { title: '组件示例', icon: 'magic-stick' },
        children: exampleRoutes,
      },
    ]
  : []

/**
 * 自动从 routes 数组提取所有 demo 路由名（供 whitelist 吸收）。
 * 递归处理嵌套 children，输出扁平 name 列表。
 */
export const routeNames: readonly string[] = (() => {
  const names: string[] = []
  const visit = (rs: RouteRecordRaw[]): void => {
    for (const r of rs) {
      if (typeof r.name === 'string') names.push(r.name)
      if (r.children?.length) visit(r.children)
    }
  }
  visit(routes)
  return names
})()

export default routes
