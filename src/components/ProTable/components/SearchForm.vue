<script setup lang="ts">
/**
 * SearchForm —— 自动生成的搜索区（spec §五组件树 / §九错误处理 #9 / 附录 A #4）
 *
 * 职责：根据 columns.search 自动生成 el-input / el-select 等搜索控件；
 * 展开/收起（默认前 searchRows×2 行）、搜索/重置按钮（搜索在前，附录 A #4）、
 * 自定义插槽 search-[prop]（spec §七插槽系统）。
 *
 * 6 列布局：每个 el-col 默认 span=6（即 4 列布局）；窄容器（≤900px）由
 * element-protable-overwrite.scss 的容器查询自动降为 2 列（≤560px 降 1 列）。
 *
 * @see [`../composables/useSearch`](../composables/useSearch.ts) 数据源
 * @group ProTable 子组件
 */
import { ref, computed } from 'vue' // vue（生命周期/底层 API）
import './../styles/element-protable-overwrite.scss' // Element Plus 样式覆盖（BEM 嵌套，对齐 XForm 模式）
import {
  ElForm,
  ElFormItem,
  ElRow,
  ElCol,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElTreeSelect,
  ElCascader,
  ElInputNumber,
  ElButton,
} from 'element-plus'
import { Search, Refresh, ArrowUp, ArrowDown } from '@element-plus/icons-vue' // 显式 import（§1.6.1 来源注释）
import type { ProColumn } from '../types'

interface Props {
  columns: ProColumn[]
  searchParams: Record<string, unknown>
  /** 默认显示行数；超出可展开（spec §搜索区） */
  searchRows: number
}
const props = defineProps<Props>()
const emit = defineEmits<{
  search: []
  reset: []
  /** v-model:searchParams 双向绑定（避免直接修改 prop 触发 lint） */
  'update:searchParams': [Record<string, unknown>]
}>()

/** 包装 v-model：子组件修改本地副本 + emit 到父组件 */
const localParams = new Proxy(props.searchParams, {
  set(target, key, value) {
    ;(target as Record<string, unknown>)[key as string] = value
    emit('update:searchParams', { ...target })
    return true
  },
})

const bem = createNamespace('pro-table-search')

const collapsed = ref(false)
/** 可见列：折叠态下显示 searchRows×2 行；展开态显示全部 */
const visibleColumns = computed(() =>
  collapsed.value ? props.columns.slice(0, props.searchRows * 2) : props.columns
)

/** 是否显示展开/收起按钮（仅当列数 > searchRows×2 时显示） */
const showToggle = computed(() => props.columns.length > props.searchRows * 2)

function handleSearch(): void {
  emit('search')
}

function handleReset(): void {
  emit('reset')
}

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value
}

/** input placeholder（类型断言规避 vue-tsc 模板表达式推断问题） */
function inputPlaceholder(col: ProColumn): string {
  return `请输入${col.label}`
}

/** select placeholder */
function selectPlaceholder(col: ProColumn): string {
  return `请选择${col.label}`
}
</script>

<template>
  <div :class="bem.b()">
    <ElForm :model="localParams" inline label-position="left">
      <ElRow :gutter="16">
        <ElCol v-for="col in visibleColumns" :key="col.prop" :span="col.search?.span ?? 6">
          <slot :name="`search-${col.prop}`" :column="col">
            <ElFormItem :label="col.label">
              <ElInput
                v-if="col.search?.el === 'input'"
                :model-value="localParams[col.prop] as never"
                :placeholder="inputPlaceholder(col) as never"
                clearable
                v-bind="col.search.props"
                @update:model-value="(v) => (localParams[col.prop] = v as never)"
              />
              <ElSelect
                v-else-if="col.search?.el === 'select'"
                :model-value="localParams[col.prop] as never"
                :placeholder="selectPlaceholder(col) as never"
                clearable
                v-bind="col.search.props"
                @update:model-value="(v) => (localParams[col.prop] = v as never)"
              >
                <ElOption
                  v-for="opt in col.enum ?? []"
                  :key="String(opt.value)"
                  :label="opt.label as never"
                  :value="opt.value as never"
                  :disabled="opt.disabled as never"
                />
              </ElSelect>
              <ElDatePicker
                v-else-if="col.search?.el === 'date-picker'"
                :model-value="localParams[col.prop] as never"
                v-bind="col.search.props"
                @update:model-value="(v) => (localParams[col.prop] = v as never)"
              />
              <ElTreeSelect
                v-else-if="col.search?.el === 'tree-select'"
                :model-value="localParams[col.prop] as never"
                v-bind="col.search.props"
                @update:model-value="
                  (v: number | undefined) => (localParams[col.prop] = v as never)
                "
              />
              <ElCascader
                v-else-if="col.search?.el === 'cascader'"
                :model-value="localParams[col.prop] as never"
                v-bind="col.search.props"
                @update:model-value="(v) => (localParams[col.prop] = v as never)"
              />
              <ElInputNumber
                v-else-if="col.search?.el === 'input-number'"
                :model-value="localParams[col.prop] as never"
                v-bind="col.search.props"
                @update:model-value="(v) => (localParams[col.prop] = v as never)"
              />
            </ElFormItem>
          </slot>
        </ElCol>
        <ElCol :span="6" :class="bem.e('actions')">
          <!-- 搜索按钮在前，重置按钮在后（附录 A #4） -->
          <ElButton type="primary" :icon="Search" data-test="search-btn" @click="handleSearch">
            搜索
          </ElButton>
          <ElButton :icon="Refresh" data-test="reset-btn" @click="handleReset">重置</ElButton>
          <ElButton
            v-if="showToggle"
            text
            :icon="collapsed ? ArrowDown : ArrowUp"
            data-test="toggle-btn"
            @click="toggleCollapsed"
          >
            {{ collapsed ? '展开' : '收起' }}
          </ElButton>
        </ElCol>
      </ElRow>
    </ElForm>
  </div>
</template>
