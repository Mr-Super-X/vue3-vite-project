<script setup lang="ts">
/**
 * 演示 addItem / removeItem / moveItem 实例方法
 *
 * 场景：订单明细 + 外部按钮编程式操控
 *   1. XFormArray demo 演示了 UI 内按钮（上移/下移/删除/新增）
 *   2. 本 demo 演示外部代码通过 formRef 调用相同 API 实现编程式操控
 *   3. 应用场景：批量导入、模板填充、撤销/重做、第三方按钮触发等
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { xArray } from '@/components/form-schema/builders'
import { useXFormDemo } from '../composables/useXFormDemo'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { arrayApiItems } from './xform-demos-api'
import xFormSource from './XFormArrayApi.vue?raw'
import ModelPreview from '../components/ModelPreview.vue'

const { bem, formRef, copySchema } = useXFormDemo({
  name: 'array-api',
  schema: () => schema,
  model: () => model,
})

const PRODUCT_OPTIONS = [
  { value: 'sku-001', label: 'Vue 3 实战', price: 89 },
  { value: 'sku-002', label: 'TypeScript 进阶', price: 69 },
  { value: 'sku-003', label: 'Vite 工程化', price: 59 },
]

const orderItemSchema: SchemaNode = {
  column: 3,
  row: { gutter: 12 },
  children: [
    {
      label: '商品',
      name: 'product',
      component: 'Select',
      rules: [{ required: true, message: '请选择商品', trigger: 'change' }],
      props: { placeholder: '商品', clearable: true, options: PRODUCT_OPTIONS },
    },
    {
      label: '数量',
      name: 'qty',
      component: 'InputNumber',
      rules: [{ required: true, message: '请输入数量', trigger: 'blur' }],
      props: { min: 1, controlsPosition: 'right' },
    },
    {
      label: '单价',
      name: 'price',
      component: 'InputNumber',
      rules: [{ required: true, message: '请输入单价', trigger: 'blur' }],
      props: { min: 0, precision: 2, controlsPosition: 'right' },
    },
  ],
}

const schema: SchemaNode = {
  children: [
    xArray('items')
      .label('订单明细')
      .item(orderItemSchema)
      .initialLength(2)
      .minItems(1)
      .maxItems(10)
      .labels({ add: '新增明细', remove: '删除', moveUp: '上移', moveDown: '下移' })
      .build(),
  ],
}

const model = reactive<Record<string, unknown>>({
  items: [
    { product: 'sku-001', qty: 1, price: 89 },
    { product: 'sku-002', qty: 2, price: 69 },
  ],
})

// —— 编程式操控（外部按钮）——

/**
 * 自定义重置：useXFormDemo 默认的 onReset 只调 resetFields()，不清 array 节点
 * 这里显式重置 model.items → 回到 initialLength 状态
 */
const INITIAL_ITEMS = [
  { product: 'sku-001', qty: 1, price: 89 },
  { product: 'sku-002', qty: 2, price: 69 },
]
function onResetOverride() {
  model.items = INITIAL_ITEMS.map((it) => ({ ...it }))
  formRef.value?.clearValidate()
  formRef.value?.resetDirty()
}

async function onAppend() {
  await formRef.value?.addItem('items', { product: 'sku-003', qty: 1, price: 59 })
  ElMessage.success('已追加一行（默认值来自 initial 参数）')
}

async function onPrepend() {
  // addItem 总是追加到末尾——若要插入到头部，需用 moveItem
  const oldLen = (model.items as unknown[]).length
  await formRef.value?.addItem('items', { product: '', qty: 1, price: 0 })
  await formRef.value?.moveItem('items', oldLen, 0)
  ElMessage.success('已插入到头部')
}

async function onRemoveLast() {
  const len = (model.items as unknown[]).length
  if (len <= 1) {
    ElMessage.warning(`已达 minItems=1 限制，无法删除最后一行`)
    return
  }
  await formRef.value?.removeItem('items', len - 1)
  ElMessage.success('已删除最后一行')
}

async function onMoveFirstToLast() {
  const len = (model.items as unknown[]).length
  if (len <= 1) return
  await formRef.value?.moveItem('items', 0, len - 1)
  ElMessage.success('已将首行移到末尾')
}

async function onBatchImport() {
  // 批量导入：连续 addItem 5 行
  for (let i = 0; i < 5; i++) {
    await formRef.value?.addItem('items', { product: 'sku-001', qty: i + 1, price: 89 })
  }
  ElMessage.success('已批量导入 5 行')
}

const tocItems = [
  { id: 'demo-array-api', label: '编程式数组操控演示' },
  { id: 'api-array-api', label: 'addItem / removeItem / moveItem 字段速查' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="addItem / removeItem / moveItem 实例方法"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'XFormArray demo 演示了 UI 按钮；本 demo 演示外部代码通过 formRef 调用相同 API',
        '应用场景：批量导入、模板填充、撤销/重做、第三方按钮触发、AI 助手编程式编辑等',
        'addItem 总追加到末尾（要插头部 → addItem + moveItem）',
        'removeItem 受 minItems 限制；addItem 不受 maxItems 限制（业务侧自行控制）',
        'moveItem 与 array.draggable 拖拽 drop handler 内部调用一致',
      ]"
    >
      <section id="demo-array-api">
        <DemoField label="编程式操控数组节点" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onResetOverride">重置</el-button>
            <el-button @click="onAppend">追加</el-button>
            <el-button @click="onPrepend">插到头部</el-button>
            <el-button @click="onRemoveLast">删除最后</el-button>
            <el-button @click="onMoveFirstToLast">首行→末行</el-button>
            <el-button @click="onBatchImport">批量导入 5 行</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <ModelPreview :model="model" />
        </DemoField>
      </section>
      <ApiTable
        title="addItem / removeItem / moveItem 字段速查"
        :items="arrayApiItems"
        anchor="api-array-api"
      />
    </DemoFrame>
    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-array-api {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}
</style>
