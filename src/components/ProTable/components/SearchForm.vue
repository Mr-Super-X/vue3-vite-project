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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue' // vue（生命周期/底层 API）
import './../styles/element-protable-overwrite.scss' // Element Plus 样式覆盖（BEM 嵌套，对齐 XForm 模式）
import { ElForm, ElFormItem, ElRow, ElCol, ElOption, ElButton } from 'element-plus' // v3.1.4 review：6 个搜索控件组件改由 searchControlRegistry 注册表提供
import { Search, Refresh, ArrowUp, ArrowDown } from '@element-plus/icons-vue' // 显式 import（§1.6.1 来源注释）
import type { ProColumn } from '../types'
import { SEARCH_CONTROL_MAP } from '../composables/_utils/searchControlRegistry' // v3.1.4 review：控件注册表（替代 v-if 链）

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

/**
 * v3.1.4 review：阻止 native form implicit submit（按回车触发页面刷新 + URL 加 ?）
 *
 * 问题背景：SearchForm 用 ElForm 包裹搜索控件。无 rules 时 ElForm 不 emit submit，
 * 但浏览器 native `<form>` 仍会按 HTML 规范在用户按回车时触发 implicit submit：
 * - 跳转到 form action（无 action = 当前 URL）
 * - form data 作为 query string 序列化（即使空数据也加 `?`）
 * - vue-router 后续去掉 `?` 但 search 请求未发出
 *
 * 修复方案：拿 ElForm root 元素（native `<form>`）+ onMounted 绑定 native submit 监听
 * - 拦截 preventDefault 阻止页面导航
 * - 主动调用 handleSearch 触发 search emit（与点「搜索」按钮行为完全一致）
 * - onBeforeUnmount 清理监听避免泄漏
 *
 * 为什么不用 @submit.prevent on ElForm：EP 2.x ElForm 声明了 emits: ['submit']，
 * 但只在 async-validator 通过后 emit。无 rules 时不 emit → @submit 不会触发。
 * 同时 native submit 仍会触发 implicit navigation。ref + native listener 才是稳路径。
 */
const elFormRef = ref<InstanceType<typeof ElForm> | null>(null)
let detachSubmitListener: (() => void) | null = null

onMounted(() => {
  // ElForm 组件实例的 $el 是 native <form> 元素（EP 内部用 <form> 渲染）
  const formEl = (elFormRef.value as unknown as { $el?: HTMLFormElement } | null)?.$el
  if (!formEl || formEl.tagName !== 'FORM') return
  const onNativeSubmit = (e: Event): void => {
    e.preventDefault()
    handleSearch()
  }
  formEl.addEventListener('submit', onNativeSubmit)
  detachSubmitListener = () => formEl.removeEventListener('submit', onNativeSubmit)
})

onBeforeUnmount(() => {
  detachSubmitListener?.()
  detachSubmitListener = null
})

/** input placeholder —— v3.1.4 review：根据控件 prefix 动态生成（替代原 inputPlaceholder/selectPlaceholder 两个分支） */
function buildPlaceholder(col: ProColumn, prefix: '请输入' | '请选择' | undefined): string {
  return prefix ? `${prefix}${col.label}` : ''
}
</script>

<template>
  <div :class="bem.b()">
    <ElForm ref="elFormRef" :model="localParams" inline label-position="left">
      <ElRow :gutter="16">
        <ElCol v-for="col in visibleColumns" :key="col.prop" :span="col.search?.span ?? 6">
          <slot :name="`search-${col.prop}`" :column="col">
            <ElFormItem :label="col.label">
              <!--
                v3.1.4 review：搜索控件改用「注册表 + 动态 component」编排（替代 v3.1.3 的 v-if/v-else-if 链）

                重构动机：6 段 v-if 链 + 6 段 @clear + 6 段 @update:model-value + 2 个 placeholder
                函数分支 = 「下楼梯式」代码，每加一个控件要改 5 处。

                重构后：SEARCH_CONTROL_MAP[col.search.el] 查表 → component / clearable / placeholder
                一次性拿到。新增控件仅在注册表加 1 条（参照 _utils/searchControlRegistry.ts）。

                共性行为（@clear + @update:model-value + clearable）在统一处声明，模板不再重复。
                select 特有的 ElOption children 用 v-if 条件渲染（避免给所有控件加空 slot）。

                行为不变：clearable / placeholder 文本 / @clear / @update:model-value 与重构前完全一致。
              -->
              <component
                :is="SEARCH_CONTROL_MAP[col.search!.el].component"
                v-bind="{
                  modelValue: localParams[col.prop] as never,
                  ...(SEARCH_CONTROL_MAP[col.search!.el].clearable ? { clearable: true } : {}),
                  ...(SEARCH_CONTROL_MAP[col.search!.el].placeholderPrefix
                    ? {
                        placeholder: buildPlaceholder(
                          col,
                          SEARCH_CONTROL_MAP[col.search!.el].placeholderPrefix
                        ) as never,
                      }
                    : {}),
                  ...col.search!.props,
                }"
                @update:model-value="(v: unknown) => (localParams[col.prop] = v as never)"
                @clear="handleSearch"
              >
                <!-- select 类控件渲染 enum 选项列表（其他控件忽略此 slot） -->
                <template v-if="SEARCH_CONTROL_MAP[col.search!.el].hasOptions" #default>
                  <ElOption
                    v-for="opt in col.enum ?? []"
                    :key="String(opt.value)"
                    :label="opt.label as never"
                    :value="opt.value as never"
                    :disabled="opt.disabled as never"
                  />
                </template>
              </component>
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
