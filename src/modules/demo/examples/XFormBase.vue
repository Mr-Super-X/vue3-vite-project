<script setup lang="ts">
/**
 * 参考开源 form-schema 实现的 demo（form/base.vue）—— 基础用法
 *
 * 场景：订单查询表单（贴合 orders 模块）
 * 字段：订单号 / 订单状态 / 下单日期区间 / 备注
 * 特性：column 2 列栅格 + rules（'required' 字符串 + validator 函数）
 */
import { ref, reactive } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormBase.vue?raw'

const bem = createNamespace('demo-x-form-base')

// —— 订单状态字典（mock 远程接口） ——
const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'shipped', label: '已发货' },
  { value: 'done', label: '已完成' },
  { value: 'canceled', label: '已取消' },
]

const schema: SchemaNode = {
  // 顶层用 row 而非 column：顶层 column 会把每个节点包进固定 span 的 ElCol，
  // 节点级 col.span 被外层半宽限制无法突破 —— 用 row + 节点级 col.span 分配列宽
  row: { gutter: 24 },
  children: [
    {
      label: '订单号',
      name: 'orderNo',
      col: { span: 6 },
      rules: [
        'required',
        {
          // ORD- 开头 + 6 位数字，如 ORD-202401
          validator: (_rule: unknown, value: unknown, cb: (err?: Error) => void) => {
            if (typeof value === 'string' && !/^ORD-\d{6}$/.test(value)) {
              cb(new Error('订单号格式：ORD- 开头 + 6 位数字'))
            } else {
              cb()
            }
          },
        },
      ],
      component: 'Input',
      props: { placeholder: '如 ORD-202401', clearable: true },
    },
    {
      label: '订单状态',
      name: 'status',
      col: { span: 18 },
      component: 'Select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: ORDER_STATUS_OPTIONS,
      },
    },
    {
      label: '开始日期',
      name: 'startDate',
      col: { span: 12 },
      rules: 'required',
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '选择开始日期' },
    },
    {
      label: '结束日期',
      name: 'endDate',
      col: { span: 12 },
      rules: [
        'required',
        {
          validator: (_rule: unknown, value: unknown, cb: (err?: Error) => void) => {
            const today = dayjs().format('YYYY-MM-DD')
            if (typeof value === 'string' && value > today) {
              cb(new Error('不能晚于今天'))
            } else {
              cb()
            }
          },
        },
      ],
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '选择结束日期' },
    },
    {
      label: '备注',
      name: 'remark',
      component: 'Input',
      col: { span: 24 },
      props: { type: 'textarea', rows: 3, placeholder: '备注信息（整行占满）' },
    },
  ],
}

const model = reactive<Record<string, unknown>>({})
const formRef = ref<{
  validate: (cb?: (valid: boolean) => void) => Promise<boolean>
  resetFields: () => void
} | null>(null)

function onSave() {
  formRef.value?.validate((valid) => {
    if (valid) {
      ElMessage({
        message: '保存成功：\n' + JSON.stringify(model, null, 2),
        type: 'success',
        duration: 0,
        showClose: true,
      })
    } else {
      ElMessage.error('校验失败，请检查字段')
    }
  })
}

function onReset() {
  formRef.value?.resetFields()
}

async function copySchema() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
    ElMessage.success('schema 已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动选择')
  }
}
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="基础用法（订单查询表单）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '订单查询表单：订单号 / 状态 / 日期区间 / 备注 5 字段。',
        '顶层 row.gutter: 24 + 节点级 col.span 分配列宽：前 4 字段各 12 列，备注 24 列整行占满。',
        '注意：顶层 column 会把每个节点包进固定 span 的 ElCol，节点级 col.span 无法突破半宽——混用列宽时用 row + col.span 组合。',
        'rules 支持 「required」字符串 + validator 函数。订单号带格式校验，结束日期不能晚于今天。',
      ]"
    >
      <section id="demo-base">
        <DemoField label="订单查询（2 列栅格）" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-base {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
