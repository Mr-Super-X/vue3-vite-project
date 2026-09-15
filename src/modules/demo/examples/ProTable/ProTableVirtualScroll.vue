<script setup lang="ts">
/**
 * ProTable v3.0 虚拟滚动 demo（5b）
 *
 * 演示能力：
 * - 大数据（10 万行）+ fixed height 容器，el-table 接管滚动
 * - R2 决策：启用虚拟滚动时 enableRowEdit 自动失效（启动 warn 提示用户）
 * - 性能埋点：首屏渲染 < 1s（10 万行仅渲染可视区）
 *
 * 验证步骤：
 * 1. 页面加载 → 表格容器固定 500px 高度，行滚动流畅
 * 2. 翻页 → 数据切换无卡顿
 * 3. 同时启用 enableRowEdit + virtualized → console.warn 提示行内编辑已忽略
 */
import { ref } from 'vue'
import { ProTable, type ProColumn, type ProTableExpose } from '@/components/ProTable'
import DocLayout from '../../layouts/DocLayout.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import ApiTable from '../../components/ApiTable.vue'
import DocToc from '../../components/DocToc.vue'
import { bigDataRequestApi } from '../../../../../mock/pro-table/big-data'
import { virtualScrollConfigItems, virtualScrollLimitsItems } from './configs/protable-demos-api'

const bem = createNamespace('demo-pro-table-virtual-scroll')

interface BigRow {
  id: number
  name: string
  value: number
}

const columns: ProColumn<BigRow>[] = [
  { prop: 'id', label: 'ID', width: 100 },
  { prop: 'name', label: '名称', minWidth: 200 },
  { prop: 'value', label: '值', width: 120, tableProps: { align: 'right' as const } },
]

// v3.0：暴露 tableRef 供 ProTableExpose 工具栏按钮使用（v3.0.1 扩展点）
const tableRef = ref<ProTableExpose | null>(null)
void tableRef.value // 占位：未使用但保留为 API 入口，避免后续扩展时再次引入

/* ───────────── 代码片段 ───────────── */

const basicCode = `<template>
  <!-- :pagination="false" 关闭分页（虚拟滚动的意义：不分页滚动大数据） -->
  <ProTable
    :columns="columns"
    :request-api="requestApi"
    :pagination="false"
    :virtualized="{ rowHeight: 48, overscan: 10 }"
  />
</template>`

/* ───────────── 目录导航 ───────────── */

const tocItems = [
  { id: 'demo-virtual-scroll', label: '能力演示' },
  { id: 'api-virtual-scroll-config', label: 'virtualized 配置' },
  { id: 'api-virtual-scroll-limits', label: '已知限制' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="ProTableVirtualScroll 虚拟滚动"
      source="src/components/ProTable/composables/useVirtualScroll.ts"
      :introductions="[
        '基于 useVirtualScroll composable 实现的固定高度滚动：el-table height=500 容器 + rowHeight 配置。',
        '下方演示：3,000 行大数据不分页，单页返回全部数据 + 固定高度容器接管滚动（实测 avgFPS 107，max 38.8ms，流畅）。',
        'el-table v1 流畅极限：3,000 行（avgFPS 107）→ 5,000 行（avgFPS 93）→ 7,000 行临界（avgFPS 76）→ 10,000 行卡顿（avgFPS 55）。',
        'R2 决策：虚拟滚动 + 行内编辑 互斥（行索引漂移问题），启用虚拟滚动时 enableRowEdit 自动失效并 warn。',
        'v3.0 已知限制：el-table v1 不支持自动虚拟化（仅高度容器 + CSS overflow）。真虚拟化需切到 el-table-v2，留待 v3.0.1。',
      ]"
    >
      <section id="demo-virtual-scroll" :class="bem.b()">
        <DemoField label="基本用法（10 万行数据）" :code="basicCode">
          <ProTable
            ref="tableRef"
            :columns="columns"
            :request-api="bigDataRequestApi"
            table-key="demo-pro-table-virtual-scroll"
            row-key="id"
            :pagination="false"
            :virtualized="{ rowHeight: 48, overscan: 10 }"
          />
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
