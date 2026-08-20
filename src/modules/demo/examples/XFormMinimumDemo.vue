<script setup lang="ts">
/**
 * 最小可运行示例 —— 展示 XForm 最简用法
 * 一个 input + 校验按钮 + 提交反馈
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import DocLayout from '../layouts/DocLayout.vue'
import DemoFrame from '../components/DemoFrame.vue'

const model = reactive<Record<string, unknown>>({})

const schema: SchemaNode = {
  component: 'Input',
  name: 'email',
  label: '邮箱',
  defaultValue: 'user@example.com',
  rules: [
    { required: true, message: '邮箱必填', trigger: 'blur' },
    {
      validator: (_r: unknown, v: unknown, cb: (err?: Error) => void) => {
        const ok = typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        cb(ok ? undefined : new Error('邮箱格式不正确'))
      },
    },
  ],
}

function onSave() {
  ElMessage.success(`提交成功：${JSON.stringify(model)}`)
}
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="XForm 最小可运行示例"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'XForm 最简用法：写 schema + 传 model + 渲梁。',
        'defaultValue 会在挂载时自动填充到 model（如果未设置）。',
        'rules 支原 async-validator 格式，必填 + 正则校验。',
      ]"
    >
      <section id="demo-minimum">
        <XForm :schema="schema" :model="model" />
        <el-button type="primary" class="mt-4" @click="onSave">提交</el-button>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style scoped>
.mt-4 {
  margin-top: 16px;
}
</style>
