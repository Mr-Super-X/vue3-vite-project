<script setup lang="ts">
/**
 * SearchForm —— P0 占位 stub，P2 替换为完整实现。
 *
 * @group ProTable 子组件
 */
defineProps<{
  columns: unknown[]
  searchParams: Record<string, unknown>
  searchRows: number
}>()
defineEmits<{ search: []; reset: [] }>()

const bem = createNamespace('pro-table-search')
</script>

<template>
  <div :class="bem.b()">
    <!-- P0 stub：完整搜索表单在 P2 实现 -->
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-table-search {
}
</style>
