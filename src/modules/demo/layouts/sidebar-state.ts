import { ref } from 'vue'

/**
 * DocLayout sidebar 的模块级状态：
 * DocLayout 随路由切换销毁重建，组件内状态会归零——宽度与折叠状态
 * 提升到模块级，跨 demo 页面切换保留。
 */
export const sidebarWidth = ref(200)
export const collapsedGroups = ref<Set<string>>(new Set())
