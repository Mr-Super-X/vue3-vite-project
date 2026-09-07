<script setup lang="ts">
/**
 * ColSetting —— 列设置抽屉（spec §五组件树 / 附录 A #6 "恢复默认"按钮）
 *
 * 职责：复选框切换可见性 + "恢复默认"按钮（附录 A #6）。
 * 拖拽功能由 sortablejs 接管（spec 决策 2）；本版提供占位列表，
 * 完整 sortablejs 拖拽在后续迭代补充（P4 骨架）。
 *
 * @group ProTable 子组件
 */
import { ElDrawer, ElCheckbox, ElCheckboxGroup, ElButton } from 'element-plus'
import type { ProColumn } from '../types'

interface Props {
  visible: boolean
  columns: ProColumn[]
  visibleKeys: string[]
  fixedKeys: string[]
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [boolean]
  'update:visibleKeys': [string[]]
  'update:fixedKeys': [string[]]
  reorder: [{ from: string; to: string }]
  resetToDefault: []
}>()

const bem = createNamespace('pro-table-col-setting')

/** 包装 v-model:visibleKeys（避免 vue/no-mutating-props lint） */
function handleVisibleChange(keys: string[]): void {
  emit('update:visibleKeys', keys)
}

function handleClose(): void {
  emit('update:visible', false)
}

function handleReset(): void {
  emit('resetToDefault')
  handleClose()
}

/** 检查某列是否可见（用于 ElCheckbox 默认勾选态） */
function isChecked(prop: string): boolean {
  return props.visibleKeys.includes(prop)
}
</script>

<template>
  <ElDrawer
    :model-value="props.visible"
    title="列设置"
    direction="rtl"
    size="360px"
    @update:model-value="handleClose"
  >
    <div :class="bem.e('list')">
      <ElCheckboxGroup
        :model-value="props.visibleKeys"
        @update:model-value="(v) => handleVisibleChange(v as string[])"
      >
        <div
          v-for="col in props.columns"
          :key="col.prop"
          :class="bem.e('item')"
          :data-prop="col.prop"
        >
          <ElCheckbox :value="col.prop" :data-test="`col-check-${col.prop}`">
            {{ isChecked(col.prop) ? '☑' : '☐' }} {{ col.label }}
          </ElCheckbox>
        </div>
      </ElCheckboxGroup>
    </div>
    <template #footer>
      <ElButton data-test="reset-btn" @click="handleReset">恢复默认</ElButton>
      <ElButton data-test="close-btn" @click="handleClose">关闭</ElButton>
    </template>
  </ElDrawer>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-table-col-setting {
  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__item {
    padding: 8px 12px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
    background: var(--el-fill-color-blank);
    transition: background 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }
}
</style>
