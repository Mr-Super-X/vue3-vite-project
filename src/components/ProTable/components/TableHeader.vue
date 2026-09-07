<script setup lang="ts">
/**
 * TableHeader —— P0 占位 stub，P3 替换为完整实现。
 *
 * @group ProTable 子组件
 */
import type { ProColumn, TableDensity } from '../types'

// P0 stub：放宽 props 类型让 ProTable.vue 透传；P3 实现时收紧
defineProps<{
  columns: ProColumn[]
  visibleColumns: ProColumn[]
  density: TableDensity
  colSettingVisible: boolean
}>()
defineEmits<{
  refresh: []
  'update:density': [TableDensity]
  'update:colSettingVisible': [boolean]
}>()

const bem = createNamespace('pro-table-header')
</script>

<template>
  <div :class="bem.b()">
    <div :class="bem.e('left')">
      <slot name="tableHeader" />
    </div>
    <div :class="bem.e('right')">
      <slot name="toolButton" />
    </div>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
