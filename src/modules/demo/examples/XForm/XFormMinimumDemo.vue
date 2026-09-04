<script setup lang="ts">
/**
 * 最小可运行示例 —— 展示 XForm 最简用法
 * 一个 input + 校验按钮 + 提交反馈
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../../composables/useXFormDemo'
import ApiTable from '../../components/ApiTable.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DocToc from '../../components/DocToc.vue'
import ModelPreview from '../../components/ModelPreview.vue'
import { minimumItems } from './configs/xform-demos-api'

const { bem, formRef, onReset, copySchema } = useXFormDemo({
  name: 'minimum',
  schema: () => schema,
})

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
  ElMessage.success('提交成功')
}

const tocItems = [
  { id: 'demo-minimum', label: '最小示例' },
  { id: 'api-minimum', label: '最小示例三要素' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="XForm 最小可运行示例"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'XForm 最简用法：写 schema + 传 model + 渲染。',
        'defaultValue 会在挂载时自动填充到 model（如果未设置）。',
        'rules 支持 async-validator 格式，必填 + 正则校验。',
      ]"
    >
      <section id="demo-minimum" :class="bem.b()">
        <XForm ref="formRef" :schema="schema" :model="model" />
        <div :class="bem.e('actions')">
          <el-button @click="onReset">重置</el-button>
          <el-button type="primary" @click="onSave">提交</el-button>
          <el-button @click="copySchema">复制 schema</el-button>
        </div>
        <ModelPreview :model="model" />
      </section>

      <ApiTable title="最小示例三要素" :items="minimumItems" anchor="api-minimum" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-minimum {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
