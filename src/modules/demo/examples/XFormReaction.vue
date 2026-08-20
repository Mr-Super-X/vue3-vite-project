<script setup lang="ts">
/**
 * 复刻 datact-web/demo/pages/form/reaction.vue —— 响应式联动
 */
import { ElMessage } from 'element-plus'
/**
 *
 * 演示 reaction 三种联动：
 * 1. ignoreControl → field1.ignore（控制显隐）
 * 2. ruleControl → field2.label + rules（控制标签 + 校验）
 * 3. ruleControl → field2.props.optionType（控制 RadioGroup 按钮 / 普通模式）
 */
import { reactive } from 'vue'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormReaction.vue?raw'

const bem = createNamespace('demo-dgm-form-reaction')

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      label: '联动表单项的显隐',
      name: 'ignoreControl',
      component: 'Switch',
    },
    {
      label: '显示了',
      name: 'field1',
      component: 'Input',
      reaction: {
        ignore: (model: Record<string, unknown>) => !model.ignoreControl,
      },
      props: { placeholder: '切换开关控制我的显示', clearable: true },
    },
    {
      label: '联动表单项的校验规则、标签和属性',
      name: 'ruleControl',
      component: 'Switch',
    },
    {
      component: 'RadioGroup',
      name: 'field2',
      children: [
        { component: 'Radio', props: { value: 'a' }, children: 'A' },
        { component: 'Radio', props: { value: 'b' }, children: 'B' },
      ],
      reaction: {
        label: (model: Record<string, unknown>) => (model.ruleControl ? '必填' : '非必填'),
        rules: (model: Record<string, unknown>) =>
          (model.ruleControl ? 'required' : undefined) as
            | string
            | import('@/components/form-schema/types').RuleItem
            | Array<string | import('@/components/form-schema/types').RuleItem>
            | undefined,
        props: {
          optionType: (model: Record<string, unknown>) => (model.ruleControl ? 'button' : ''),
        },
      },
    },
  ],
}

const model = reactive<Record<string, unknown>>({ ignoreControl: false, ruleControl: false })

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
      title="响应式联动（3 种 reaction）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '三个 reaction 联动示例：',
        '1. ignoreControl → field1.ignore（开关切换控制 field1 显示/隐藏）',
        '2. ruleControl → field2.label + rules（开关切换控制标签文字和是否必填）',
        '3. ruleControl → field2.props.optionType（开关切换控制 RadioGroup 按钮 / 普通模式）',
      ]"
    >
      <section id="demo-reaction">
        <DemoField label="响应式联动" :code="xFormSource">
          <XForm :schema="schema" :model="model" />
          <el-button @click="copySchema" class="mt-2">复制 schema</el-button>
          <div :class="bem.e('state')">
            当前状态：
            <code>{{ JSON.stringify(model) }}</code>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-dgm-form-reaction {
  &__state {
    margin-top: 16px;
    font-size: 12px;
    color: #909399;

    code {
      background: #f5f7fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Menlo', 'Consolas', monospace;
    }
  }
}
</style>
