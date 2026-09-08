<script setup lang="ts">
/**
 * EditCell —— ProTable 行内编辑单元格控件（v2.0 自 ProTable.vue 模板抽取）
 *
 * 承接列 edit 配置的四种控件分支（input / input-number / select / 自定义组件名），
 * 让 ProTable.vue 模板不再内联四段编辑控件渲染。
 * 数据流：父级传入当前编辑值（rowEdit.getValue 的结果），用户输入经 update 事件
 * 回传父级写回 rowEdit.setValue —— 本组件不直接持有 rowEdit 实例（保持展示组件纯粹）。
 *
 * @see [`../composables/useRowEdit`](../composables/useRowEdit.ts) 编辑态与值管理
 * @group ProTable 组件
 */
import { computed } from 'vue'
import type { ProColumn } from '../types'

const props = defineProps<{
  /** 当前编辑行的 rowKey 值（仅透传给 update 事件，便于父级写回） */
  rowKey: string | number
  /** 列定义 —— edit 配置（控件类型 + 透传 props）从这里读取 */
  col: ProColumn
  /** 当前编辑值（父级 rowEdit.getValue 的结果，受控） */
  value: unknown
}>()

const emit = defineEmits<{
  /** 编辑值变化 —— 父级据此调用 rowEdit.setValue 写回 */
  (e: 'update', prop: string, value: unknown): void
}>()

/** 列编辑配置（父级模板 v-else-if 已保证 col.edit 存在，此处仅做类型收窄） */
const editConfig = computed(() => props.col.edit)

/**
 * 解析编辑控件（el: 'input' | 'select' | 'input-number' | 自定义组件名）
 * —— 内置三种映射到 element-plus 组件，其余按组件名字符串原样交给 <component :is>。
 */
function resolveEditComp(el: string): string {
  switch (el) {
    case 'input':
      return 'el-input'
    case 'select':
      return 'el-select'
    case 'input-number':
      return 'el-input-number'
    default:
      return el
  }
}

/** 输入变化统一出口：携带列 prop 回传，父级无需再闭包列名 */
function handleUpdate(v: unknown): void {
  emit('update', props.col.prop, v)
}
</script>

<template>
  <el-input
    v-if="editConfig?.el === 'input'"
    :model-value="value as string"
    @update:model-value="handleUpdate"
    v-bind="editConfig.props ?? {}"
    size="small"
  />
  <el-input-number
    v-else-if="editConfig?.el === 'input-number'"
    :model-value="value as number"
    @update:model-value="handleUpdate"
    v-bind="editConfig.props ?? {}"
    size="small"
  />
  <!-- TODO v2.1: el-select 类型适配后改回 el-option 列表 -->
  <el-select
    v-else-if="editConfig?.el === 'select'"
    :model-value="value as never"
    @update:model-value="handleUpdate"
    v-bind="editConfig.props ?? {}"
  />
  <component
    v-else-if="editConfig"
    :is="resolveEditComp(editConfig.el)"
    :model-value="value"
    @update:model-value="handleUpdate"
  />
</template>
