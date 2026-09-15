<script setup lang="ts">
/**
 * ProTable v3.0.1 虚拟滚动 demo（升级：el-table-v2 真虚拟化）
 *
 * 演示能力：
 * - 10 万行 × 10 列（含 ID + Department 左固定列），首屏 < 1s，滚动 avgFPS ≥ 100
 * - 列设置：勾选/重排（响应式更新 el-table-v2 columns）
 * - 排序：score / level 服务端排序
 * - 强隔离策略演示：开启虚拟化时其他能力被忽略
 *
 * 验证步骤：
 * 1. 页面加载 → 表格容器固定 500px 高度，滚动流畅
 * 2. 列设置 → 隐藏 remark 列 → 表格立即刷新
 * 3. 列设置 → 重排 columns → 表格列序变化
 * 4. 排序 → 点击「评分」/「等级」表头 → 数据按该列升降序（服务端排序）
 * 5. 密度 → 切换 紧凑/默认/宽松 → 行高即时变化（32/48/64）
 * 6. 搜索 → 姓名搜索框输入关键字 → 表格只显示匹配行；重置 → 恢复全量
 * 7. console 演示：当 virtualized + enableSummary 命中时输出 warn
 */
import { ref } from 'vue'
import { ProTable, type ProColumn, type ProTableExpose } from '@/components/ProTable'
import DocLayout from '../../layouts/DocLayout.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import ApiTable from '../../components/ApiTable.vue'
import DocToc from '../../components/DocToc.vue'
import { bigDataRequestApi, type BigRow } from '../../../../../mock/pro-table/big-data'
import { virtualScrollConfigItems, virtualScrollLimitsItems } from './configs/protable-demos-api'

const bem = createNamespace('demo-pro-table-virtual-scroll')

/** 10 列定义：ID + Department 左固定，其余自适应；name 列挂搜索（对应 mock 的 name 参数） */
const columns: ProColumn<BigRow>[] = [
  { prop: 'id', label: 'ID', width: 80, fixed: 'left', sortable: 'custom' },
  {
    prop: 'name',
    label: '姓名',
    minWidth: 160,
    sortable: 'custom',
    search: { el: 'input', defaultValue: '', span: 6 },
  },
  { prop: 'email', label: '邮箱', minWidth: 220 },
  { prop: 'department', label: '部门', width: 120, fixed: 'left' },
  { prop: 'status', label: '状态', width: 100 },
  {
    prop: 'score',
    label: '评分',
    width: 100,
    sortable: 'custom',
    tableProps: { align: 'right' as const },
  },
  { prop: 'city', label: '城市', width: 100 },
  { prop: 'joinDate', label: '入职日期', width: 120 },
  {
    prop: 'level',
    label: '等级',
    width: 80,
    sortable: 'custom',
    tableProps: { align: 'right' as const },
  },
  { prop: 'remark', label: '备注', minWidth: 200 },
]

const tableRef = ref<ProTableExpose | null>(null)
void tableRef.value // 占位：未使用但保留为 API 入口

/** 代码片段 */
const basicCode = `<template>
  <!-- 启用 virtualized 即切换到 el-table-v2 真虚拟化引擎 -->
  <!-- :pagination="false" 关闭分页（虚拟化场景：单次返回全量） -->
  <ProTable
    :columns="columns"
    :request-api="requestApi"
    :pagination="false"
    :virtualized="{ rowHeight: 48, height: 500, width: 'auto' }"
  />
</template>`

const tocItems = [
  { id: 'demo-virtual-scroll', label: '能力演示' },
  { id: 'demo-virtual-scroll-limits', label: '强隔离策略' },
  { id: 'api-virtual-scroll-config', label: 'virtualized 配置' },
  { id: 'api-virtual-scroll-limits', label: '已知限制' },
]

/** 强隔离策略代码片段（用于 DemoField.code 渲染） */
const limitsCode = `// 同时启用 virtualized + enableRowEdit + enableSummary
<ProTable
  :columns="columns"
  :request-api="api"
  :virtualized="true"
  :enable-row-edit="true"
  :enable-summary="true"
/>
// console 输出：
// [ProTable] virtualized + tableEngine="element-plus" ...
// [ProTable] virtualized 模式下以下能力被忽略: enableRowEdit, enableSummary
`
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="ProTableVirtualScroll 虚拟滚动（el-table-v2）"
      source="src/components/ProTable/composables/useVirtualScroll.ts"
      :introductions="[
        'v3.0.1 升级：从假虚拟化（CSS overflow）切换到 el-table-v2 真虚拟化引擎，支持 10 万行 × 10 列流畅渲染。',
        '强隔离策略：启用 virtualized 时其他能力（行内编辑/树形/汇总/合并/拖拽）一律 warn + 忽略，vxe-table 引擎自动回落 element-plus。',
        '列设置 / 排序 / 搜索 / 密度切换在虚拟化分支保留可用。',
        '性能目标：首屏渲染 < 1s，滚动 avgFPS ≥ 100。',
      ]"
    >
      <section id="demo-virtual-scroll" :class="bem.b()">
        <DemoField label="基本用法（10 万行 × 10 列含固定列）" :code="basicCode">
          <ProTable
            ref="tableRef"
            :columns="columns"
            :request-api="bigDataRequestApi"
            table-key="demo-pro-table-virtual-scroll"
            row-key="id"
            :pagination="false"
            :virtualized="{ rowHeight: 48, height: 500, width: 'auto' }"
          />
        </DemoField>
      </section>

      <section id="demo-virtual-scroll-limits" :class="bem.b()">
        <DemoField label="强隔离策略：开启虚拟化时其他能力被忽略" :code="limitsCode">
          <ul style="line-height: 1.8; padding-left: 20px">
            <li>
              <strong>enableRowEdit</strong>
              （行内编辑）：行索引漂移破坏 edit state，禁用
            </li>
            <li>
              <strong>enableTree</strong>
              （树形数据）：el-table-v2 无 tree-props，禁用
            </li>
            <li>
              <strong>enableSummary</strong>
              （汇总行）：el-table-v2 无 show-summary，禁用
            </li>
            <li>
              <strong>enableCellSpan</strong>
              （单元格合并）：el-table-v2 无 span-method，禁用
            </li>
            <li>
              <strong>enableRowDrag</strong>
              （行拖拽）：Sortable.js 找不到 tbody，禁用
            </li>
            <li>
              <strong>tableEngine="vxe-table"</strong>
              ：虚拟化仅 element-plus 引擎支持，自动回落
            </li>
          </ul>
        </DemoField>
      </section>

      <ApiTable
        title="virtualized 配置"
        :items="virtualScrollConfigItems"
        anchor="api-virtual-scroll-config"
      />
      <ApiTable
        title="已知限制"
        :items="virtualScrollLimitsItems"
        anchor="api-virtual-scroll-limits"
      />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-pro-table-virtual-scroll {
  // 此 demo 不需要额外样式
}
</style>
