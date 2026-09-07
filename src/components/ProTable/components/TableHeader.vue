<script setup lang="ts">
/**
 * TableHeader —— 工具栏（spec §五组件树 / §七插槽系统）
 *
 * 职责：刷新按钮 + 密度切换（三档：紧凑/默认/宽松）+ 列设置按钮 +
 * 插槽（tableHeader / toolButton）。
 *
 * @group ProTable 子组件
 */
import { ElButton, ElButtonGroup, ElTooltip } from 'element-plus'
import { Refresh, Setting } from '@element-plus/icons-vue' // 显式 import（§1.6.1 来源注释）
import type { ProColumn, TableDensity } from '../types'

interface Props {
  columns: ProColumn[]
  visibleColumns: ProColumn[]
  density: TableDensity
  colSettingVisible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  refresh: []
  'update:density': [TableDensity]
  'update:colSettingVisible': [boolean]
}>()

const bem = createNamespace('pro-table-header')

const densityList: TableDensity[] = ['compact', 'default', 'loose']
const densityLabels: Record<TableDensity, string> = {
  compact: '紧凑',
  default: '默认',
  loose: '宽松',
}

function handleRefresh(): void {
  emit('refresh')
}

function handleColSetting(): void {
  emit('update:colSettingVisible', !props.colSettingVisible)
}
</script>

<template>
  <div :class="bem.b()">
    <div :class="bem.e('left')">
      <slot name="tableHeader" />
    </div>
    <div :class="bem.e('right')">
      <slot name="toolButton" />
      <ElTooltip content="刷新">
        <ElButton :icon="Refresh" circle data-test="refresh-btn" @click="handleRefresh" />
      </ElTooltip>
      <ElButtonGroup>
        <ElButton
          v-for="d in densityList"
          :key="d"
          :type="props.density === d ? 'primary' : 'default'"
          size="small"
          @click="emit('update:density', d)"
        >
          {{ densityLabels[d] }}
        </ElButton>
      </ElButtonGroup>
      <ElTooltip content="列设置">
        <ElButton :icon="Setting" circle data-test="col-setting-btn" @click="handleColSetting" />
      </ElTooltip>
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
