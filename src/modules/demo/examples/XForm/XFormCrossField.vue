<script setup lang="ts">
/**
 * 演示跨字段校验（crossValidator）
 *
 * 场景：
 * 1. 密码 = 确认密码（dependsOn: ['password']）
 * 2. 开始日期 ≤ 结束日期（双向：互相依赖）
 * 3. 主联系人 / 备用联系人不能同时为空（A xor B）
 *
 * ⚠️ 已知限制（element-plus 2.14 shallowRef 内部响应式限制）:
 * - 密码 / 确认密码等 Input 字段:失焦立即实时校验 ✅
 * - 日期 / Select / Cascader 等复杂控件:跨字段红字**只在点击保存时显示**(失焦不显示)
 *   - v-model 写入 + crossValidator 跑通,但 element-plus 2.x 内部 setFieldError 不触发 UI 重渲染
 *   - 这是 element-plus 自身的实现限制,form-schema 已尽力(提供 v-model 主动触发 + nextTick splice)
 *   - 后续可通过升级 element-plus 或改造 setFieldError 集成方式解决
 *
 * 实际校验仍生效:点击「保存」时 validateForm() 跑 el-form.validate + runCrossFieldValidation,
 * 失败时 setFieldError 写入错误 + toast 提示
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../../composables/useXFormDemo'
import ApiTable from '../../components/ApiTable.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import { crossFieldItems } from './configs/xform-demos-api'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import DocToc from '../../components/DocToc.vue'
import xFormSource from './XFormCrossField.vue?raw'
import ModelPreview from '../../components/ModelPreview.vue'

const bem = createNamespace('demo-x-form-cross-field')

const { formRef, onReset, copySchema } = useXFormDemo({
  name: 'cross-field',
  schema: () => schema,
  model: () => model,
})

const CONTACT_OPTIONS = [
  { value: 'email', label: '邮箱' },
  { value: 'phone', label: '手机' },
  { value: 'wechat', label: '微信' },
]

/** 共享校验函数 —— validator 和 crossValidator 共用同一份逻辑,避免漂移 */
function checkPasswordMatch(value: unknown, password: unknown): true | string {
  return value === password || '两次密码不一致'
}

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
        // blur 触发的单字段校验 —— 实时反馈(走 el-form validate 流程)
        {
          validator: (_rule: unknown, value: unknown, cb: (err?: Error) => void) => {
            const result = checkPasswordMatch(value, model.password)
            cb(result === true ? undefined : new Error(result))
          },
          trigger: 'blur',
        },
        // 提交时跨字段兜底 —— crossValidator 仅在 validateForm() 入口触发
        // 保留是为了：1) 提交时再过一遍最新值;2) 演示 crossValidator 用法
        {
          dependsOn: ['password'],
          crossValidator: (value: unknown, password: unknown) =>
            checkPasswordMatch(value, password),
        },
      ],
    },
    {
      label: '开始日期',
      name: 'startDate',
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '选择开始日期' },
      rules: [
        { required: true, message: '请选择开始日期', trigger: 'change' },
        // 反向校验:startDate 失焦时检查 startDate ≤ endDate
        // 注:crossValidator 只在该字段失焦时跑,所以 startDate 失焦时
        // 只有 startDate 自己会红字 —— endDate 不会自动反向红字
        // (实现"改 A 让 B 自动红字"需要 reaction 联动)
        {
          dependsOn: ['endDate'],
          crossValidator: (value: unknown, endDate: unknown) =>
            !value ||
            !endDate ||
            (value as string) <= (endDate as string) ||
            '开始日期不能晚于结束日期',
          trigger: 'change',
        },
      ],
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

/** 演示 validateDetail：异步返回所有跨字段错误（用于调试或自定义展示） */
async function onInspectDetail() {
  const detail = await formRef.value?.validateDetail()
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

const tocItems = [
  { id: 'demo-cross-field', label: '跨字段校验演示' },
  { id: 'api-cross-field', label: 'RuleItem 跨字段' },
]
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
          <ModelPreview :model="model" />
        </DemoField>
      </section>

      <ApiTable title="RuleItem 跨字段" :items="crossFieldItems" anchor="api-cross-field" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-cross-field {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
