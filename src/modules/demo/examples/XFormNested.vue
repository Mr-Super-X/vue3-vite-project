<script setup lang="ts">
/**
 * 复刻 datact-web/demo/pages/form/nested.vue —— 复杂布局
 */
import { ElMessage } from 'element-plus'
/**
 *
 * 关键特性：
 * 1. Card 容器分组（每组 column + row + props）
 * 2. slots.title / slots.extra 插槽系统
 * 3. 嵌套 children（formItem 内含 input + 'a' HTML）
 * 4. 多列布局（column: 2 / 3）
 *
 * 与原 datact-web 差异：
 * - Card 组件用 ElCard（element-plus 内置）
 * - slots.title 用 Moon 图标替换（element-plus 无等效图标，用 '⚙️' 文本替代）
 */
import { reactive } from 'vue'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormNested.vue?raw'

// 必须用 reactive 包装 model，否则 XForm 内的 v-model 赋值后无法触发响应式更新
const model = reactive<Record<string, unknown>>({})

async function copySchema() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
    ElMessage.success('schema 已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动选择')
  }
}

const schema = [
  {
    component: 'Card',
    column: 2,
    row: { gutter: 24 },
    props: { class: 'demo-card' },
    slots: {
      title: [
        { component: 'span', props: { class: 'demo-card__icon' }, children: '⚙️' },
        ' 基本属性',
      ],
      extra: { component: 'a', children: '更多', props: { href: '#' } },
    },
    children: [
      {
        component: 'FormItem',
        props: {
          name: 'field1',
          label: '附带额外元素',
        },
        children: [
          {
            name: 'field1',
            component: 'Input',
            formItem: false,
            props: {
              placeholder: '输入 field1',
              clearable: true,
              style: 'width: calc(100% - 5em); margin-right: 1em;',
            },
          },
          {
            component: 'a',
            children: '一个链接',
            props: { href: '#', class: 'demo-card__link' },
          },
        ],
      },
      {
        label: '字段2',
        name: 'field2',
        component: 'Input',
        props: { placeholder: '字段2', clearable: true },
      },
      {
        label: '字段3',
        name: 'field3',
        component: 'Input',
        props: { placeholder: '字段3', clearable: true },
      },
      {
        label: '字段4',
        name: 'field4',
        component: 'Input',
        props: { placeholder: '字段4', clearable: true },
      },
    ],
  },
  {
    component: 'Card',
    column: 3,
    row: { gutter: 24 },
    props: { title: '补充属性', class: 'demo-card' },
    children: [
      {
        label: '字段5',
        name: 'field5',
        component: 'Input',
        props: { placeholder: '字段5', clearable: true },
      },
      {
        label: '字段6',
        name: 'field6',
        component: 'Input',
        props: { placeholder: '字段6', clearable: true },
      },
      {
        label: '字段7',
        name: 'field7',
        component: 'Input',
        props: { placeholder: '字段7', clearable: true },
      },
      {
        label: '字段8',
        name: 'field8',
        component: 'Input',
        props: { placeholder: '字段8', clearable: true },
      },
    ],
  },
] as unknown as SchemaNode[]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="复杂布局（Card 分组 + slots 插槽）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '两个 Card 容器分组，分别 2 列 / 3 列栅格。',
        'slots.title 自定义标题（图标 + 文本），slots.extra 自定义右上角（链接）。',
        'field1 含嵌套 children：Input + 「一个链接」HTML 标签。',
      ]"
    >
      <section id="demo-nested">
        <DemoField label="嵌套布局" :code="xFormSource">
          <XForm :schema="schema" :model="model" />
          <el-button @click="copySchema" class="mt-2">复制 schema</el-button>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.demo-card {
  margin-bottom: 16px;

  &__icon {
    margin-right: 4px;
  }

  &__link {
    color: #409eff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
