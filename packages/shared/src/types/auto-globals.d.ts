/**
 * 包内 type-check 用的 auto-import 全局声明。
 *
 * 背景：本包源码按 app 侧约定书写——vue / pinia / vue-router 高频 API 与 ElMessage
 * 由 app 的 unplugin-auto-import 在转换期注入，源码不写显式 import。
 * 包独立编译（vue-tsc --build）时没有该转换，需同名全局声明才能闭合类型。
 *
 * 与 app 侧生成的 src/types/auto-imports.d.ts 是「同构子集」关系：
 * 只声明本包实际用到的标识符；app 编译单元内以 app 自己的生成版为准
 * （同名全局声明内容一致，不冲突）。
 *
 * 新增全局标识符时：同步本文件 + 确认工厂 AutoImport imports 列表已覆盖。
 */
// 载入 pinia-plugin-persistedstate 的模块增强（DefineSetupStoreOptions.persist），
// store/modules/{app,theme}.ts 的 persist 选项类型依赖它
import 'pinia-plugin-persistedstate'

declare global {
  const ref: typeof import('vue').ref
  const computed: typeof import('vue').computed
  const watch: typeof import('vue').watch
  const watchEffect: typeof import('vue').watchEffect
  const onUnmounted: typeof import('vue').onUnmounted
  const defineStore: typeof import('pinia').defineStore
  const storeToRefs: typeof import('pinia').storeToRefs
  const useRouter: typeof import('vue-router').useRouter
  const ElMessage: typeof import('element-plus/es').ElMessage
}

export {}
