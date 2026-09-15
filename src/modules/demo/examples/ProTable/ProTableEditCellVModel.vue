<script setup lang="ts">
/**
 * ProTable v3.0 单元格 v-model demo（5d）
 *
 * 演示能力：
 * - edit.updateEvent='input'（默认）实时同步 vs 'blur' 失焦同步两种模式
 * - 双击进入编辑 / 外部按钮保存全部
 * - 验证 'blur' 模式：连续输入不触发 save，仅失焦时同步
 *
 * 验证步骤：
 * 1. 双击「商品-1」名称 → 输入框出现
 * 2. 改为「商品-1-新」→ 数据实时变化（input 模式）
 * 3. 翻到「数量」列 → 双击 → 改为 200 → 失焦后数据变化（blur 模式）
 * 4. 点「保存全部」→ 模拟保存 API 触发，console.info 打印
 */
import { ref } from 'vue'
import { ProTable, type ProColumn, type ProTableExpose } from '@/components/ProTable'
import DocLayout from '../../layouts/DocLayout.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import ApiTable from '../../components/ApiTable.vue'
import DocToc from '../../components/DocToc.vue'
import { editCellItemsRequestApi, saveItemApi } from '../../../../../mock/pro-table/edit-cell-items'
import { editCellVModelColumnItems } from './configs/protable-demos-api'

const bem = createNamespace('demo-pro-table-edit-cell-vmodel')

interface Item {
  id: number
  name: string
  quantity: number
  note: string
}

const columns: ProColumn<Item>[] = [
  { prop: 'id', label: 'ID', width: 80 },
  {
    prop: 'name',
    label: '商品名称（默认 input 实时同步）',
    minWidth: 240,
    edit: {
      el: 'input',
      props: { placeholder: '请输入商品名称' },
      // 默认 updateEvent='input'，此处显式声明便于演示对比
      updateEvent: 'input',
    },
  },
  {
    prop: 'quantity',
    label: '数量（blur 同步）',
    width: 200,
    edit: {
      el: 'input-number',
      props: { min: 0, max: 10000 },
      updateEvent: 'blur',
    },
  },
  {
    prop: 'note',
    label: '备注（blur 同步）',
    minWidth: 200,
    edit: {
      el: 'input',
      props: { placeholder: '请输入备注' },
      updateEvent: 'blur',
    },
  },
]

const tableRef = ref<ProTableExpose | null>(null)

async function handleSaveAll(): Promise<void> {
  const ok = await tableRef.value?.saveEdit?.()
  if (ok) {
    alert('保存成功！详情查看 console.info 输出')
  }
}

function handleCancelAll(): void {
  tableRef.value?.cancelEdit?.()
}

/* ───────────── 代码片段 ───────────── */

const basicCode =
  `<template>
  <ProTable
    ref="tableRef"
    :columns="columns"
    :request-api="requestApi"
    :enable-row-edit="{ onSave: saveItemApi }"
    row-key="id"
  />
  <el-button @click="tableRef?.saveEdit?.()">保存全部</el-button>
  <el-button @click="tableRef?.cancelEdit?.()">取消全部</el-button>
</template>

<script setup lang="ts">
const columns: ProColumn[] = [
  {
    prop: 'name',
    label: '商品名称（input 实时同步）',
    edit: { el: 'input', updateEvent: 'input' },
  },
  {
    prop: 'quantity',
    label: '数量（blur 同步）',
    edit: { el: 'input-number', updateEvent: 'blur' },
  },
]
</` + `/script>`

/* ───────────── 目录导航 ───────────── */

const tocItems = [
  { id: 'demo-edit-cell-vmodel', label: '能力演示' },
  { id: 'api-edit-cell-column', label: 'edit.updateEvent 字段' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="ProTableEditCellVModel 单元格 v-model"
      source="src/components/ProTable/components/EditCell.vue"
      :introductions="[
        '基于 EditCell 组件 + edit.updateEvent 字段实现编辑值同步时机控制。',
        '下方演示：双击单元格进入编辑；名称列（input 实时同步）+ 数量/备注列（blur 失焦同步）。',
        'R5 决策：默认 updateEvent 为 input 保持向后兼容；与 ProTable trigger=blur 一致时建议显式声明 blur。',
      ]"
    >
      <section id="demo-edit-cell-vmodel" :class="bem.b()">
        <DemoField label="基本用法" :code="basicCode">
          <ProTable
            ref="tableRef"
            :columns="columns"
            :request-api="editCellItemsRequestApi"
            :enable-row-edit="{ onSave: saveItemApi }"
            table-key="demo-pro-table-edit-cell-vmodel"
            row-key="id"
          />
          <div :class="bem.e('actions')">
            <el-button type="primary" @click="handleSaveAll">保存全部</el-button>
            <el-button @click="handleCancelAll">取消全部</el-button>
          </div>
        </DemoField>
      </section>

      <ApiTable
        title="edit.updateEvent 字段（v3.0 新增）"
        :items="editCellVModelColumnItems"
        anchor="api-edit-cell-column"
      />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-pro-table-edit-cell-vmodel {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
