<script setup lang="ts">
/**
 * 演示 schema 字段 formItem —— 自定义 form-item 包装
 *
 * 场景：用户录入（含特殊 label / 必填样式 / 提示语）
 *   1. formItem: false —— 裸渲染组件（无 form-item 包装，作为展示型 UI 块）
 *   2. formItem: { props: { labelWidth } } —— 单字段 label 宽度独立于全局
 *   3. formItem: { slots: { label } } —— 自定义 label 内容（如加 icon）
 *   4. formItem: { component: 'FormItemPlus' } —— 用自定义组件替代 ElFormItem
 */
import { reactive, h } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../composables/useXFormDemo'
import ApiTable from '../components/ApiTable.vue'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import DocToc from '../components/DocToc.vue'
import { customFormItemItems } from './xform-demos-api'
import xFormSource from './XFormCustomFormItem.vue?raw'
import ModelPreview from '../components/ModelPreview.vue'

const { bem, formRef, onReset, copySchema } = useXFormDemo({
  name: 'custom-form-item',
  schema: () => schema,
  model: () => model,
})

const model = reactive<Record<string, unknown>>({
  username: '',
  password: '',
  bio: '',
  agreement: false,
})

const schema: SchemaNode = {
  column: 1,
  children: [
    // ① formItem: false —— 裸渲染展示块（不是表单字段，仅展示）
    {
      label: '系统说明',
      component: 'div',
      formItem: false,
      children: '📌 本 demo 展示 4 种 formItem 自定义写法',
    },
    // ② 字段 1：自定义 label 插槽 + 加宽 label
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      rules: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      formItem: {
        props: { labelWidth: '220px' },
        slots: {
          // ⭐ 用 bem 实例生成 class——确保 BEM 前缀与 SCSS 根选择器匹配
          // 修复前手写 'demo-x-form-custom-form-item__label' 导致 .vv- 前缀不匹配，样式不生效
          label: () =>
            h('span', { class: bem.e('label') }, [
              '👤 用户名（自定义 label）',
              h(InfoFilled, { class: bem.e('label-icon') }),
            ]),
        },
      },
      props: { placeholder: '独立 label 宽度 180px + 自定义插槽', clearable: true },
    },
    // ③ 字段 2：默认 formItem 包装
    {
      label: '密码',
      name: 'password',
      component: 'InputPassword',
      rules: [{ required: true, message: '请输入密码', trigger: 'blur' }],
      props: { placeholder: '默认 ElFormItem 包装' },
    },
    // ④ 字段 3：自定义 formItem 组件（演示 project 内 FormItemPlus）
    {
      label: '个人简介',
      name: 'bio',
      component: 'InputTextArea',
      rules: [{ required: true, message: '请输入简介', trigger: 'blur' }],
      formItem: {
        component: 'FormItemPlus' as never, // 演示场景：业务侧实现 FormItemPlus 后注册
        props: { showWordLimit: true, maxWordCount: 200, highlight: true },
      },
      props: { rows: 3, maxlength: 200, placeholder: '使用 FormItemPlus 包装' },
    },
    // ⑤ 字段 4：必填图标增强
    {
      label: '同意协议',
      name: 'agreement',
      component: 'Switch',
      rules: [
        {
          validator: (_r: unknown, v: unknown, cb: (err?: Error) => void) => {
            cb(v === true ? undefined : new Error('请同意用户协议'))
          },
        },
      ],
      formItem: {
        slots: {
          label: () => '📜 同意《用户协议》（formItem 包装 + 必填校验）',
        },
      },
    },
  ],
}

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败')
    return
  }
  ElMessage.success('保存成功')
}

const tocItems = [
  { id: 'demo-custom-form-item', label: 'formItem 自定义演示' },
  { id: 'api-custom-form-item', label: 'formItem 字段速查' },
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="schema 字段 formItem —— 自定义 form-item 包装"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'formItem: false —— 不包 form-item，裸渲染组件（展示型 UI 块）',
        'formItem: { props } —— 单字段 label 宽度 / 必填样式独立于全局',
        'formItem: { slots } —— 自定义 label 内容（如加 icon / 提示）',
        'formItem: { component } —— 用业务自定义 FormItemPlus 替代 ElFormItem（需在 components 注册）',
      ]"
    >
      <section id="demo-custom-form-item">
        <DemoField label="用户录入（formItem 自定义）" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <ModelPreview :model="model" />
        </DemoField>
      </section>
      <ApiTable
        title="formItem 字段速查"
        :items="customFormItemItems"
        anchor="api-custom-form-item"
      />
    </DemoFrame>
    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-custom-form-item {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }

  &__label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  &__label-icon {
    color: var(--el-color-primary);
    font-size: 14px;
    // 显式限制 svg 宽高 —— Element Plus Icon 的 size prop 通过 CSS 变量传递，
    // 但 svg 元素本身不识别 CSS 变量，必须显式 width/height attribute
    width: 20px;
    height: 20px;
  }
}
</style>
