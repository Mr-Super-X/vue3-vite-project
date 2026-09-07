<script setup lang="ts">
/**
 * ColSetting —— P0 占位 stub，P4 替换为完整实现。
 *
 * @group ProTable 子组件
 */
defineProps<{
  visible: boolean
  columns: unknown[]
  visibleKeys: string[]
  fixedKeys: string[]
}>()
defineEmits<{
  'update:visible': [boolean]
  'update:visibleKeys': [string[]]
  'update:fixedKeys': [string[]]
  reorder: [{ from: string; to: string }]
  resetToDefault: []
}>()

const bem = createNamespace('pro-table-col-setting')
</script>

<template>
  <div :class="bem.b()" v-if="visible">
    <!-- P0 stub：完整列设置抽屉在 P4 实现 -->
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-table-col-setting {
}
</style>
