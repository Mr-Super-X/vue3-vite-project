<script setup lang="ts">
/**
 * Element Plus 图标解析器：图标名字符串 → 组件。
 *
 * 设计取舍：参考仓用 iconify 的 `<Icon icon="mdi:xxx">`，本项目统一
 * `@element-plus/icons-vue`（无新增依赖），菜单/面包屑/页签的 meta.icon
 * 存 EP 图标名（如 'odometer'），由本组件解析渲染。
 * 全量 `import * as` 的 bundle 代价已被旧 Sidebar 接受，保持现状（YAGNI，
 * 未来可换 unplugin-icons 按需加载）。
 *
 * @group 布局：Default
 */
import * as ElIcons from '@element-plus/icons-vue'

const props = defineProps<{
  /** Element Plus 图标名（如 'odometer'）；空/未命中不渲染 */
  // 显式允许 undefined：调用方常用 `v-if="node.icon"` 后传 `string | undefined`（exactOptionalPropertyTypes）
  name?: string | undefined
}>()

const iconComponent = computed(() => {
  if (!props.name) return undefined
  return (ElIcons as Record<string, unknown>)[props.name]
})
</script>

<template>
  <el-icon v-if="iconComponent"><component :is="iconComponent" /></el-icon>
</template>
