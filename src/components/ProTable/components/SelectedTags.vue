<script setup lang="ts">
/**
 * SelectedTags —— 已选条件回显区（v3.2 升级）
 *
 * 设计动机：用户筛选后往往忘记自己设置了哪些条件，tag 回显能：
 * 1) 直观看到当前生效的查询条件
 * 2) 一键清除单个条件（tag 右上角 × 按钮）
 * 3) 一键清除全部（右侧「清除全部」按钮）
 *
 * 位置：在 ProTable 搜索区与表格区之间，视觉上不干扰搜索区
 *
 * 行为约定：
 * - 监听 props.searchParams 变化，自动重算 tag 列表
 * - 不显示空值（undefined / null / '' / 空数组）
 * - select 类字段的 enum 值自动翻译为 label（避免显示数字 ID）
 * - 单个 tag × 点击：emit('clear-one', prop) 让父组件清字段
 * - 「清除全部」点击：emit('clear-all') 让父组件清所有
 */
import { computed, ref, watch } from 'vue' // vue（生命周期/底层 API）
import { ElTag, ElButton } from 'element-plus' // element-plus 按需注入
import type { ProColumn } from '../types'

interface Props {
  /** 完整 columns（用于 prop → label 翻译 + select 枚举值翻译） */
  columns: ProColumn[]
  /** 当前 searchParams（响应式） */
  searchParams: Record<string, unknown>
  /**
   * v3.2 升级：枚举值翻译 Map（select 字段值 → label）
   * 例：{ 'paid': '已支付', 'shipped': '已发货' }
   * 不传则用原始值显示
   */
  enumMaps?: Record<string, Record<string | number, string>>
}
interface Emits {
  /** 清除单个条件（父组件收到后清字段 + 触发搜索） */
  (e: 'clear-one', prop: string): void
  /** 清除全部条件 */
  (e: 'clear-all'): void
}
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const bem = createNamespace('pro-table-selected-tags')

/**
 * v3.2 升级：deep watch 强制重算
 *
 * 背景：useSearch.searchParams 是 `ref<Record<string, unknown>>`，ref 的 .value
 * 是普通对象，Vue 3 不会对普通对象做深度响应式追踪。当 SearchForm 的 Proxy
 * 或 useSearch.updateParams() 原地 mutate 对象属性时，下游 computed（selectedTags）
 * 不会重算，导致 tag 不显示。
 *
 * 修复：用 deep watch 监听 searchParams 任何属性变化 + 用一个本地 ref 作为
 * 「版本计数器」，让 selectedTags computed 显式依赖它，从而触发重算。
 *
 * 这是局部修复，避免改动 useSearch 的 ref → reactive 大重构。
 */
const version = ref(0)
watch(
  () => props.searchParams,
  () => {
    version.value++
  },
  { deep: true }
)

/**
 * 已选 tag 列表：[{ prop, label, value, displayValue }]
 * - prop: 字段名（用于清除时定位）
 * - label: 字段显示名（如「订单状态」）
 * - displayValue: 用户可读的值（select 翻译后的 label）
 */
interface SelectedTag {
  prop: string
  label: string
  displayValue: string
  rawValue: unknown
}
const selectedTags = computed<SelectedTag[]>(() => {
  void version.value // 显式依赖版本号，触发 deep watch 后的重算
  const tags: SelectedTag[] = []
  for (const col of props.columns) {
    if (!col.search) continue // 无 search 配置的列不参与 tag
    const v = props.searchParams[col.prop]
    // 跳过空值
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    // 翻译显示值
    let displayValue: string
    if (col.search.el === 'select' && props.enumMaps?.[col.prop]) {
      const enumMap = props.enumMaps[col.prop]
      // 收紧 null 检查避免 TS18048 + 运行时崩溃
      displayValue = enumMap ? String(enumMap[v as string | number] ?? v) : String(v)
    } else if (Array.isArray(v)) {
      displayValue = `[${v.length} 项]`
    } else if (typeof v === 'object' && v !== null) {
      // date range / 复杂对象 → JSON 简略
      displayValue = JSON.stringify(v).slice(0, 30)
    } else {
      displayValue = String(v)
    }
    tags.push({
      prop: col.prop,
      label: col.label,
      displayValue,
      rawValue: v,
    })
  }
  return tags
})

function handleClearOne(prop: string): void {
  emit('clear-one', prop)
}

function handleClearAll(): void {
  emit('clear-all')
}
</script>

<template>
  <div v-if="selectedTags.length > 0" :class="bem.b()">
    <span :class="bem.e('label')">当前筛选：</span>
    <ElTag
      v-for="tag in selectedTags"
      :key="tag.prop"
      closable
      :class="bem.e('tag')"
      :data-test="`selected-tag-${tag.prop}`"
      @close="handleClearOne(tag.prop)"
    >
      {{ tag.label }}: {{ tag.displayValue }}
    </ElTag>
    <ElButton
      text
      type="primary"
      :class="bem.e('clear-all')"
      data-test="clear-all-tags"
      @click="handleClearAll"
    >
      清除全部
    </ElButton>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-table-selected-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;

  &__label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-right: 4px;
  }

  &__tag {
    font-size: 12px;
  }

  &__clear-all {
    margin-left: auto;
    font-size: 12px;
  }
}
</style>
