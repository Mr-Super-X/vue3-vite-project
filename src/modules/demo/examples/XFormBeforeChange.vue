<script setup lang="ts">
/**
 * 演示 XFormProps.beforeChange —— 字段值写入 model 前的统一拦截
 *
 * 场景：提现金额
 *   1. 拦截超额：金额 > 余额 → toast 警告 + 返回旧值（输入框回弹）
 *   2. 自动格式化：金额 > 100 → 四舍五入到百位
 *   3. 收款人字段不受影响（演示按 item.name 分派）
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../composables/useXFormDemo'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { beforeChangePropsItems } from './xform-demos-api'
import xFormSource from './XFormBeforeChange.vue?raw'
import ModelPreview from '../components/ModelPreview.vue'

const { bem, formRef, onReset, copySchema } = useXFormDemo({
  name: 'before-change',
  schema: () => schema,
  model: () => model,
})

const model = reactive<Record<string, unknown>>({
  balance: 500,
  amount: 50,
  recipient: '张三',
})

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      label: '账户余额（元）',
      name: 'balance',
      component: 'InputNumber',
      props: { disabled: true, controlsPosition: 'right' },
    },
    {
      label: '提现金额（元）',
      name: 'amount',
      component: 'InputNumber',
      props: {
        min: 0,
        controlsPosition: 'right',
        placeholder: '试 800（超额拦截）/ 156（>100 自动取百位）',
      },
      // beforeChange 是 XFormProps 级拦截器（不是 schema 节点级字段）
      // 按 item.name 分派到具体字段；非 amount 字段直接放行 newVal
    },
    {
      label: '收款人',
      name: 'recipient',
      component: 'Input',
      props: { placeholder: '姓名', clearable: true },
    },
  ],
}

const tocItems = [
  { id: 'demo-before-change', label: 'beforeChange 拦截演示' },
  { id: 'api-before-change', label: 'beforeChange 字段速查' },
]

/**
 * XFormProps 级拦截器：按 item.name 分派到具体字段
 * - amount: 超额回弹 + >100 自动取百位
 * - 其他字段：放行 newVal
 */
const beforeChange = (item: { name?: string }, newVal: unknown, oldVal: unknown): unknown => {
  if (item.name !== 'amount') return newVal
  const nv = newVal as number
  const bal = model.balance as number
  if (nv > bal) {
    ElMessage.warning(`超过可用余额（¥${bal}）`)
    return oldVal
  }
  if (nv > 100) {
    const rounded = Math.round(nv / 100) * 100
    ElMessage.info(`自动四舍五入到百位：¥${nv} → ¥${rounded}`)
    return rounded
  }
  return newVal
}
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="XFormProps.beforeChange —— 字段值拦截"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'beforeChange 在字段值写入 model 前触发：可同步返回新值替换 / 返回旧值回弹 / 返回 Promise 异步决定。',
        '测试 1: 输入金额 800（余额 500）→ toast 警告 + 输入框回弹（oldVal）',
        '测试 2: 输入金额 156 → 自动取整为 200 写入 model（自动格式化）',
        'XFormProps 级拦截，按 item.name 分派到具体字段的 beforeChange 函数',
      ]"
    >
      <section id="demo-before-change">
        <DemoField label="提现金额（拦截 + 格式化）" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" :before-change="beforeChange" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <ModelPreview :model="model" />
        </DemoField>
      </section>
      <ApiTable
        title="beforeChange 字段速查"
        :items="beforeChangePropsItems"
        anchor="api-before-change"
      />
    </DemoFrame>
    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-before-change {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
