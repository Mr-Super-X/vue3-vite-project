<script setup lang="ts">
/**
 * 参考开源 form-schema 实现的 demo（form/base.vue）—— 基础用法
 *
 * 字段：输入框 / 选择框 / 字典 / 日期 / 多行输入
 * 特性：column 2 列栅格 + rules（字符串 + validator 函数）
 *
 * 与原参考实现差异：
 * - XSelect → ElSelect + 硬编码选项（模拟远程 fetchOption）
 * - XDict   → ElSelect + 硬编码部门字典（模拟 code: 'user_dept_type'）
 * - Textarea → ElInput type="textarea"
 * - dayjs 日期校验 → toLocaleDateString 比较
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

// —— 字典数据（mock 远程接口） ——
const SELECT_OPTIONS = [
  { value: 'option1', label: '选项一' },
  { value: 'option2', label: '选项二' },
  { value: 'option3', label: '选项三' },
]
const DEPT_OPTIONS = [
  { value: 'tech', label: '研发部' },
  { value: 'product', label: '产品部' },
  { value: 'design', label: '设计部' },
  { value: 'ops', label: '运营部' },
]

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      label: '输入框',
      name: 'input',
      rules: 'required',
      component: 'Input',
      props: { placeholder: '请输入', clearable: true },
    },
    {
      label: '选择框',
      name: 'select',
      rules: 'required',
      component: 'Select',
      props: {
        placeholder: '请选择',
        clearable: true,
        options: SELECT_OPTIONS, // 模拟 fetchOption.extractData
      },
    },
    {
      label: '字典',
      name: 'dict',
      component: 'Select',
      props: {
        placeholder: '请选择部门（来自字典 user_dept_type）',
        clearable: true,
        options: DEPT_OPTIONS,
      },
    },
    {
      label: '日期',
      name: 'date',
      rules: [
        'required',
        {
          validator: (_rule: unknown, value: unknown, cb: (err?: Error) => void) => {
            const today = dayjs().format('YYYY-MM-DD')
            if (typeof value === 'string' && value < today) {
              cb(new Error('不能早于今天'))
            } else {
              cb()
            }
          },
        },
      ],
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '选择日期' },
    },
    {
      label: '多行输入',
      name: 'textarea',
      component: 'Input',
      props: { type: 'textarea', rows: 3, placeholder: '请输入多行文本' },
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
      title="基础用法（5 字段 + 校验）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '基础表单：5 字段（输入框 / 选择框 / 字典 / 日期 / 多行输入）。',
        'column: 2 顶层栅格 + row.gutter: 24 列间距。',
        'rules 支持 「required」 + validator 函数。日期字段带自定义 validator：不能早于今天。',
      ]"
    >
      <section id="demo-base">
        <DemoField label="表单（2 列栅格）" :code="xFormSource">
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
