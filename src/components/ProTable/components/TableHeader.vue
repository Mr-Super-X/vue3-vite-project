<script setup lang="ts">
/**
 * TableHeader —— 工具栏（spec §五组件树 / §七插槽系统）
 *
 * 职责：刷新按钮 + 密度切换（三档：紧凑/默认/宽松）+ 列设置按钮 +
 * 全屏切换（v3.1）+ 插槽（tableHeader / toolButton）。
 *
 * @group ProTable 子组件
 */
import { ElButton, ElButtonGroup, ElTooltip } from 'element-plus'
import { Refresh, Setting, FullScreen } from '@element-plus/icons-vue' // 显式 import（§1.6.1 来源注释）
import type { ProColumn, TableDensity } from '../types'

interface Props {
  columns: ProColumn[]
  visibleColumns: ProColumn[]
  density: TableDensity
  colSettingVisible: boolean
  /** v3.1：当前全屏状态（按钮高亮用） */
  fullscreen?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  fullscreen: false,
})
const emit = defineEmits<{
  refresh: []
  'update:density': [TableDensity]
  'update:colSettingVisible': [boolean]
  /** v3.1：全屏切换请求（编排层 useFullscreen 执行实际切换） */
  toggleFullscreen: []
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
      <!-- 刷新 + 全屏：同类 icon 操作紧贴成组（vben / vue-pure-admin 工具栏惯例），组间由 __right 的 gap 分隔 -->
      <div :class="bem.e('actions')">
        <ElTooltip content="刷新">
          <ElButton :icon="Refresh" circle data-test="refresh-btn" @click="handleRefresh" />
        </ElTooltip>
        <!-- v3.1 全屏切换：紧邻刷新按钮；实际切换逻辑在编排层 useFullscreen（Esc 也可退出） -->
        <ElTooltip :content="props.fullscreen ? '退出全屏' : '全屏'">
          <ElButton
            :icon="FullScreen"
            circle
            :type="props.fullscreen ? 'primary' : 'default'"
            data-test="fullscreen-btn"
            @click="emit('toggleFullscreen')"
          />
        </ElTooltip>
      </div>
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
  &__actions {
    display: inline-flex;
    align-items: center;
    /* 组内紧贴：相邻 circle 按钮边框合并（等价 el-button-group 拼接效果）；
       依赖 ElTooltip 经 el-only-child 透传触发元素、不生成额外 wrapper DOM */
    .el-button + .el-button {
      margin-left: 8px;
    }
  }
}
</style>
