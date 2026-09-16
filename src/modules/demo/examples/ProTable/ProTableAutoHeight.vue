<script setup lang="ts">
/**
 * ProTable v3.1 自动高度 demo —— autoHeight + 工具栏全屏（布局能力复合）
 *
 * 演示能力：
 * - autoHeight：表格区撑满视口剩余高度（视口高 - 根容器 top - 搜索区 - 工具栏 -
 *   分页器 - 固定余量），窗口缩放 / 容器尺寸变化自动重算，下限钳制 100px
 * - 与 virtualized 互斥：virtualized 自带高度管理，同开时 autoHeight 忽略 + console.warn
 * - 工具栏全屏（v3.1 内置）：与刷新按钮紧贴成组（组内边框合并），CSS fixed 铺满
 *   （z-index 1500 低于 el-dialog），Esc 或再次点击退出
 *
 * 验证步骤：
 * 1. 缩小浏览器窗口高度 → 表体出现纵向滚动条、分页器始终可见不滚出视口
 * 2. 拖回窗口 → 表体高度跟随伸缩
 * 3. 点工具栏全屏按钮 → 表格铺满视口、按钮高亮；Esc 退出
 *
 * 路由：自动注册为 /demo/pro-table-auto-height
 */
import { ProTable, type ProColumn } from '@/components/ProTable'
import DocLayout from '../../layouts/DocLayout.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import { projectRequestApi, type ProjectRow } from './configs/projects'

const bem = createNamespace('demo-pro-table-auto-height')

const columns: ProColumn<ProjectRow>[] = [
  { prop: 'id', label: 'ID', width: 70, sortable: true },
  { prop: 'title', label: '项目', minWidth: 140 },
  { prop: 'amount', label: '金额', width: 140, formatter: 'amount' },
  { prop: 'createdAt', label: '创建时间', width: 170, formatter: 'dateTime' },
]

const autoHeightCode = `<!-- 表格区撑满视口剩余高度：视口高 - 根容器 top - 搜索区 - 工具栏 - 分页器 - 固定余量 -->
<!-- 窗口缩放 / 容器尺寸变化（ResizeObserver）自动重算；下限钳制 100px -->
<ProTable :columns="columns" :request-api="requestApi" auto-height />

<!-- 与 virtualized 同开属配置冲突：virtualized 自带高度管理，autoHeight 被忽略并 console.warn -->`

const fullscreenCode = `<!-- 工具栏全屏按钮（v3.1 内置）：与刷新按钮紧贴成组（组内边框合并、组间 8px） -->
<!-- 点击切换 CSS fixed 全屏（z-index 1500，低于 el-dialog 2000）；Esc 或再次点击退出 -->`
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="ProTableAutoHeight 自动高度 + 全屏"
      source="src/components/ProTable/composables/useAutoHeight.ts"
      :introductions="[
        'autoHeight 让表格区撑满视口剩余高度（表头固定 + 表体滚动 + 分页器常驻）。',
        '工具栏全屏按钮与刷新按钮紧贴成组，复合在本页一起验证布局能力。',
      ]"
    >
      <DemoField label="autoHeight（缩小窗口验证）" :code="autoHeightCode">
        <p :class="bem.e('hint')">
          验证：① 缩小浏览器窗口高度 → 表体出现纵向滚动条、分页器始终可见 ② 拖回窗口 →
          表体高度跟随伸缩 ③ 与 virtualized 同开会 console.warn（互斥，本页未同开）
        </p>
        <ProTable
          :columns="columns"
          :request-api="projectRequestApi"
          table-key="demo-v31-autoheight"
          row-key="id"
          auto-height
        />
      </DemoField>

      <DemoField label="工具栏全屏（与刷新按钮紧贴成组）" :code="fullscreenCode">
        <p :class="bem.e('hint')">
          验证：① 工具栏右侧「⟳ 刷新 ⛶ 全屏」两圆按钮紧贴、与密度组间 8px ② 点击全屏 → 表格 fixed
          铺满视口、按钮高亮 ③ Esc 或再次点击退出 ④ 全屏内打开 el-dialog 不被遮挡（z-index 1500 &lt;
          2000）
        </p>
        <ProTable
          :columns="columns"
          :request-api="projectRequestApi"
          table-key="demo-v31-fullscreen"
          row-key="id"
          :page-size="5"
        />
      </DemoField>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-pro-table-auto-height {
  &__hint {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.7;
    color: var(--el-text-color-regular);
  }
}
</style>
