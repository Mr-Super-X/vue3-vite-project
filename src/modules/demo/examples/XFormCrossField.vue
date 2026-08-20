<script setup lang="ts">
/**
 * 演示跨字段校验（crossValidator）
 *
 * 场景：
 * 1. 密码 = 确认密码（dependsOn: ['password']）
 * 2. 开始日期 ≤ 结束日期（双向：互相依赖）
 * 3. 主联系人 / 备用联系人不能同时为空（A xor B）
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'
import xFormSource from './XFormCrossField.vue?raw'

const bem = createNamespace('demo-dgm-form-cross-field')

const CONTACT_OPTIONS = [
  { value: 'email', label: '邮箱' },
  { value: 'phone', label: '手机' },
  { value: 'wechat', label: '微信' },
]

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      label: '密码',
      name: 'password',
      component: 'Input',
      props: { type: 'password', placeholder: '请输入密码', clearable: true },
      rules: [{ required: true, message: '请输入密码', trigger: 'blur' }],
    },
    {
      label: '确认密码',
      name: 'passwordConfirm',
      component: 'Input',
      props: { type: 'password', placeholder: '再次输入密码', clearable: true },
      rules: [
        { required: true, message: '请再次输入密码', trigger: 'blur' },
        {
          dependsOn: ['password'],
          // 返回 true = 通过；返回 string = 错误信息
          crossValidator: (value: unknown, password: unknown) =>
            value === password || '两次密码不一致',
          trigger: 'blur',
        },
      ],
    },
    {
      label: '开始日期',
      name: 'startDate',
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '选择开始日期' },
      rules: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
    },
    {
      label: '结束日期',
      name: 'endDate',
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '选择结束日期' },
      rules: [
        { required: true, message: '请选择结束日期', trigger: 'change' },
        {
          dependsOn: ['startDate'],
          crossValidator: (value: unknown, startDate: unknown) =>
            !value ||
            !startDate ||
            (value as string) >= (startDate as string) ||
            '结束日期不能早于开始日期',
          trigger: 'change',
        },
      ],
    },
    {
      label: '主联系人方式',
      name: 'primaryContact',
      component: 'Select',
      props: { placeholder: '选择主联系人方式', clearable: true, options: CONTACT_OPTIONS },
      rules: [
        {
          dependsOn: ['backupContact'],
          crossValidator: (value: unknown, backup: unknown) =>
            Boolean(value) || Boolean(backup) || '主联系人 / 备用联系人至少填一个',
        },
      ],
    },
    {
      label: '备用联系人方式',
      name: 'backupContact',
      component: 'Select',
      props: { placeholder: '选择备用联系人方式', clearable: true, options: CONTACT_OPTIONS },
      rules: [
        {
          dependsOn: ['primaryContact'],
          crossValidator: (value: unknown, primary: unknown) =>
            Boolean(value) || Boolean(primary) || '主联系人 / 备用联系人至少填一个',
        },
      ],
    },
  ],
}

const model = reactive<Record<string, unknown>>({
  password: '',
  passwordConfirm: '',
  startDate: '',
  endDate: '',
  primaryContact: '',
  backupContact: '',
})

const formRef = ref<XFormExpose | null>(null)

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败，请检查红字提示')
    return
  }
  ElMessage({
    message: '保存成功：\n' + JSON.stringify(model, null, 2),
    type: 'success',
    duration: 0,
    showClose: true,
  })
}

/** 演示 validateDetail：同步返回所有跨字段错误（用于调试或自定义展示） */
function onInspectDetail() {
  const detail = formRef.value?.validateDetail()
  if (!detail) return
  if (detail.isValid) {
    ElMessage.success('跨字段校验通过')
  } else {
    ElMessage({
      message: '跨字段错误：\n' + JSON.stringify(detail.errors, null, 2),
      type: 'warning',
      duration: 0,
      showClose: true,
    })
  }
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
      title="跨字段校验（crossValidator）"
      source="src/components/form-schema/XForm.vue"
      :introductions="[
        'RuleItem 新增 dependsOn + crossValidator 两个字段,声明式跨字段校验:',
        '1. 密码 = 确认密码 — dependsOn: [\'password\']',
        '2. 开始日期 ≤ 结束日期 — 结束日期 dependsOn: [\'startDate\']',
        '3. 主/备用联系人至少填一个 — 双向 dependsOn 互相校验',
        'crossValidator 返回 true 表示通过,返回 string 作为错误信息(form-schema 自动写入对应 form-item)',
        'validateDetail() 同步返回完整跨字段错误列表(用于调试或自定义展示)',
      ]"
    >
      <section id="demo-cross-field">
        <DemoField label="跨字段校验" :code="xFormSource">
          <XForm ref="formRef" :schema="schema" :model="model" />
          <div :class="bem.e('actions')">
            <el-button @click="onReset">重置</el-button>
            <el-button type="primary" @click="onSave">保存</el-button>
            <el-button @click="onInspectDetail">查看跨字段详情</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <div :class="bem.e('state')">
            <div>当前 model：</div>
            <pre>{{ JSON.stringify(model, null, 2) }}</pre>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-dgm-form-cross-field {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }

  &__state {
    margin-top: 16px;
    font-size: 12px;
    color: #909399;

    pre {
      background: #f5f7fa;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Menlo', 'Consolas', monospace;
      overflow-x: auto;
      margin: 4px 0;
    }
  }
}
</style>
