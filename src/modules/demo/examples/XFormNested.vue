<script setup lang="ts">
/**
 * 参考开源 form-schema 实现的 demo（form/nested.vue）—— 复杂布局
 *
 * 场景：用户资料 —— 三个 Card 分组（基本信息 / 联系方式 / 偏好设置）
 *
 * 关键特性：
 * 1. Card 容器分组（每组 column + row + props）
 * 2. slots.header 插槽系统（ElCard 标题 API 是 header，无 title / extra 插槽）
 * 3. 嵌套 children（formItem 内含 input + 'a' HTML）
 * 4. 多列布局（column: 2 / 3）
 */
import { ElMessage } from 'element-plus'
import { reactive } from 'vue'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormNested.vue?raw'

const bem = createNamespace('demo-x-form-nested')

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
    props: { class: bem.e('card') },
    slots: {
      // ElCard 的标题 API 是 header（无 title / extra 插槽）——右上角链接用 float: right 放进 header
      header: [
        { component: 'span', props: { class: bem.e('card-icon') }, children: '👤' },
        ' 基本信息',
        {
          component: 'a',
          children: '更多',
          props: { href: '#', class: bem.e('card-link'), style: 'float: right;' },
        },
      ],
    },
    children: [
      {
        component: 'FormItem',
        props: {
          name: 'nickname',
          label: '昵称',
        },
        children: [
          {
            name: 'nickname',
            component: 'Input',
            formItem: false,
            props: {
              placeholder: '输入昵称',
              clearable: true,
              style: 'width: calc(100% - 5em); margin-right: 1em;',
            },
          },
          {
            component: 'a',
            children: '命名规范',
            props: { href: '#', class: bem.e('card-link') },
          },
        ],
      },
      {
        label: '真实姓名',
        name: 'realName',
        component: 'Input',
        props: { placeholder: '真实姓名', clearable: true },
      },
      {
        label: '性别',
        name: 'gender',
        component: 'RadioGroup',
        props: {
          options: [
            { value: 'male', label: '男' },
            { value: 'female', label: '女' },
          ],
        },
      },
    ],
  },
  {
    component: 'Card',
    column: 2,
    row: { gutter: 24 },
    props: { header: '联系方式', class: bem.e('card') },
    children: [
      {
        label: '手机号',
        name: 'phone',
        component: 'Input',
        props: { placeholder: '手机号', clearable: true },
      },
      {
        label: '邮箱',
        name: 'email',
        component: 'Input',
        props: { placeholder: '邮箱', clearable: true },
      },
      {
        label: '所在城市',
        name: 'city',
        component: 'Select',
        props: {
          placeholder: '请选择城市',
          clearable: true,
          options: ['广州市', '深圳市', '北京市', '上海市'].map((c) => ({ value: c, label: c })),
        },
      },
    ],
  },
  {
    component: 'Card',
    column: 3,
    row: { gutter: 24 },
    props: { header: '偏好设置', class: bem.e('card') },
    children: [
      {
        label: '界面语言',
        name: 'language',
        component: 'Select',
        props: {
          placeholder: '请选择语言',
          clearable: true,
          options: [
            { value: 'zh-CN', label: '简体中文' },
            { value: 'en-US', label: 'English' },
          ],
        },
      },
      {
        label: '时区',
        name: 'timezone',
        component: 'Select',
        props: {
          placeholder: '请选择时区',
          clearable: true,
          options: [
            { value: 'UTC+8', label: 'UTC+8 北京' },
            { value: 'UTC+0', label: 'UTC+0 伦敦' },
          ],
        },
      },
      {
        label: '接收通知',
        name: 'notify',
        component: 'Switch',
      },
    ],
  },
] as unknown as SchemaNode[]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="复杂布局（用户资料 Card 分组）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        '三个 Card 分组：基本信息 / 联系方式 / 偏好设置，分别为 2 列 / 2 列 / 3 列栅格。',
        'slots.header 自定义标题（图标 + 文本 + 右上角链接）——注意 ElCard 的标题 API 是 header，不是 title / extra。',
        '昵称字段含嵌套 children：Input + 「命名规范」HTML 链接。',
        'component 支持原生 HTML 标签（全小写，如 a / span）：直接渲染原生元素，适合链接、图标等轻量内容。',
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
.#{$BEM_PREFIX}-demo-x-form-nested {
  &__card {
    margin-bottom: 16px;
  }

  &__card-icon {
    margin-right: 4px;
  }

  &__card-link {
    color: #409eff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
