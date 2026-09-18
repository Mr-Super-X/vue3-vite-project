<script setup lang="ts" generic="T extends object = Record<string, unknown>">
/**
 * TableHeader —— 工具栏（spec §五组件树 / §七插槽系统）
 *
 * 职责：刷新按钮 + 密度切换（三档：紧凑/默认/宽松）+ 列设置按钮 +
 * 全屏切换（v3.1）+ 插槽（tableHeader / toolButton）+
 * toolbar 配置式按钮组渲染（2026-09-18：slot 内容在前，ToolbarRenderer 渲染配置在后）。
 *
 * 2026-09-18 review：补 generic<T> 透传——原声明落为默认 Record 泛型，
 * 行类型在 ProTable → TableHeader → ToolbarRenderer 链上断层（hover 丢 T 提示），
 * 编排层被迫写 `as unknown as` 双断言。
 *
 * @group ProTable 子组件
 */
import { ElButton, ElButtonGroup, ElTooltip } from 'element-plus'
import { Refresh, Setting, FullScreen } from '@element-plus/icons-vue' // 显式 import（§1.6.1 来源注释）
import ToolbarRenderer from './ToolbarRenderer.vue' // 2026-09-18：toolbar 配置统一渲染器
import type { ProColumn, TableDensity, ToolbarAction, ToolbarCtx } from '../types'

interface Props {
  columns: ProColumn[]
  visibleColumns: ProColumn[]
  density: TableDensity
  colSettingVisible: boolean
  /** v3.1：当前全屏状态（按钮高亮用） */
  fullscreen?: boolean
  /** 2026-09-18：toolbar 配置式按钮组（编排层 props.toolbar 投影；缺省不渲染） */
  toolbar?: ToolbarAction<T>[]
  /** 2026-09-18：slot 作用域 + ToolbarRenderer 共用的上下文（选中行/loading/refresh） */
  toolbarCtx: ToolbarCtx<T>
  /** 2026-09-18：toolbar 直出上限（透传 ToolbarRenderer，默认 3）；`| undefined` 兼容 exactOptionalPropertyTypes 显式传 undefined */
  maxVisibleActions?: number | undefined
}
const props = withDefaults(defineProps<Props>(), {
  fullscreen: false,
  toolbar: () => [],
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
  <div :class="bem.b()" role="toolbar" aria-label="表格工具栏">
    <div :class="bem.e('left')">
      <!-- 2026-09-18：slot 作用域下发 ToolbarCtx（向后兼容：不带 scope 的旧用法不受影响） -->
      <slot name="tableHeader" v-bind="props.toolbarCtx" />
      <ToolbarRenderer
        v-if="props.toolbar.length > 0"
        :actions="props.toolbar"
        :ctx="props.toolbarCtx"
        :max-visible="props.maxVisibleActions"
      />
    </div>
    <div :class="bem.e('right')">
      <slot name="toolButton" v-bind="props.toolbarCtx" />
      <!-- 刷新 + 全屏：同类 icon 操作紧贴成组（vben / vue-pure-admin 工具栏惯例），组间由 __right 的 gap 分隔 -->
      <div :class="bem.e('actions')">
        <ElTooltip content="刷新">
          <ElButton
            :icon="Refresh"
            circle
            aria-label="刷新表格"
            data-test="refresh-btn"
            @click="handleRefresh"
          />
        </ElTooltip>
        <!-- v3.1 全屏切换：紧邻刷新按钮；实际切换逻辑在编排层 useFullscreen（Esc 也可退出） -->
        <ElTooltip :content="props.fullscreen ? '退出全屏' : '全屏'">
          <ElButton
            :icon="FullScreen"
            circle
            :type="props.fullscreen ? 'primary' : 'default'"
            :aria-label="props.fullscreen ? '退出全屏' : '进入全屏'"
            :aria-pressed="props.fullscreen ? 'true' : 'false'"
            data-test="fullscreen-btn"
            @click="emit('toggleFullscreen')"
          />
        </ElTooltip>
      </div>
      <ElButtonGroup role="group" aria-label="表格密度切换">
        <ElButton
          v-for="d in densityList"
          :key="d"
          :type="props.density === d ? 'primary' : 'default'"
          size="small"
          :aria-label="`切换表格密度为${densityLabels[d]}`"
          :aria-pressed="props.density === d ? 'true' : 'false'"
          @click="emit('update:density', d)"
        >
          {{ densityLabels[d] }}
        </ElButton>
      </ElButtonGroup>
      <ElTooltip content="列设置">
        <ElButton
          :icon="Setting"
          circle
          aria-label="打开列设置"
          :aria-expanded="props.colSettingVisible ? 'true' : 'false'"
          data-test="col-setting-btn"
          @click="handleColSetting"
        />
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
