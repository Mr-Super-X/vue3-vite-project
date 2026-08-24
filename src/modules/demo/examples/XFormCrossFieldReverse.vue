<script setup lang="ts">
/**
 * 演示：反向跨字段实时校验（阶段 1.1 新增）
 *
 * 场景：
 * 1. 改 startDate → endDate 自动反向校验"开始日期不能晚于结束日期"
 * 2. 改 endDate → startDate 自动反向校验"结束日期不能早于开始日期"
 * 3. 改 password → passwordConfirm 自动反向校验"两次密码不一致"
 *
 * 验证方法：
 * - 在 startDate 输入日期后立即改 endDate（不需失焦）
 * - 立刻看到 startDate 红字（反向校验生效）
 * - 反向：在 endDate 输入早于 startDate 的日期 → startDate 立即红字
 *
 * 与 XFormCrossField.vue 的关键差异：
 * - CrossField 演示正向触发（字段失焦时跑自己的 cross rules）
 * - CrossFieldReverse 演示反向触发（依赖方变化时目标字段自动重算）
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import XForm from '@/components/form-schema/XForm.vue'
import type { SchemaNode, XFormExpose } from '@/components/form-schema/types'
import DemoFrame from '../components/DemoFrame.vue'
import DemoField from '../components/DemoField.vue'
import DocLayout from '../layouts/DocLayout.vue'

const bem = createNamespace('demo-x-form-cross-field-reverse')

// 关键代码片段（用于 DemoField 展示）
const reverseTriggerCode = `// 反向校验：endDate 变化 → 触发 startDate 红字
{
  label: '开始日期',
  name: 'startDate',
  component: 'DatePicker',
  rules: [
    {
      dependsOn: ['endDate'],
      crossValidator: (value, endDate) =>
        value <= endDate || '开始日期不能晚于结束日期',
    },
  ],
}`

const schema: SchemaNode = {
  column: 2,
  row: { gutter: 24 },
  children: [
    {
      label: '开始日期',
      name: 'startDate',
      component: 'DatePicker',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '选择开始日期' },
      rules: [
        { required: true, message: '请选择开始日期', trigger: 'change' },
        // 反向校验：当 endDate 变化时（晚于 startDate）→ startDate 红字
        {
          dependsOn: ['endDate'],
          crossValidator: (value: unknown, endDate: unknown) =>
            !value ||
            !endDate ||
            (value as string) <= (endDate as string) ||
            '开始日期不能晚于结束日期',
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
        // 反向校验：当 startDate 变化时（晚于 endDate）→ endDate 红字
        {
          dependsOn: ['startDate'],
          crossValidator: (value: unknown, startDate: unknown) =>
            !value ||
            !startDate ||
            (value as string) >= (startDate as string) ||
            '结束日期不能早于开始日期',
        },
      ],
    },
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
        // 反向校验：password 变化时 → passwordConfirm 红字
        {
          dependsOn: ['password'],
          crossValidator: (value: unknown, password: unknown) =>
            value === password || '两次密码不一致',
        },
      ],
    },
  ],
}

const model = reactive<Record<string, unknown>>({
  startDate: '',
  endDate: '',
  password: '',
  passwordConfirm: '',
})

const formRef = ref<XFormExpose | null>(null)

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) {
    ElMessage.error('校验失败，请检查红字提示')
    return
  }
  ElMessage.success(`提交成功：${JSON.stringify(model)}`)
}

function onReset() {
  formRef.value?.resetFields()
}

/** 一键制造"日期冲突"场景，用于演示反向红字 */
function makeConflict() {
  model.startDate = '2024-06-10'
  model.endDate = '2024-06-05' // 早于 startDate
  ElMessage.info('已设置冲突日期：startDate=2024-06-10, endDate=2024-06-05')
}

function clearDates() {
  model.startDate = ''
  model.endDate = ''
}
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="反向跨字段实时校验（阶段 1.1）"
      source="src/components/form-schema/composables/use-cross-field-trigger.ts"
      :introductions="[
        '演示 XForm 阶段 1.1 新增：任一字段变化 → 依赖它的 cross rules 自动重算并写错误到目标字段。',
        '无需失焦、无需点保存 —— 改字段 A，依赖 B 的 crossValidator 自动触发，把红字写到目标字段。',
        `1) 改 startDate → endDate 自动校验结束日期不能早于开始日期`,
        `2) 改 endDate → startDate 自动校验开始日期不能晚于结束日期`,
        `3) 改 password → passwordConfirm 自动校验两次密码不一致`,
      ]"
    >
      <section id="demo-cross-field-reverse">
        <DemoField label="反向校验：日期范围 + 密码一致" :code="reverseTriggerCode">
          <div :class="bem.b()">
            <XForm ref="formRef" :schema="schema" :model="model" />
            <div :class="bem.e('actions')">
              <el-button @click="onReset">重置</el-button>
              <el-button type="primary" @click="onSave">保存</el-button>
              <el-button @click="makeConflict">一键制造日期冲突</el-button>
              <el-button @click="clearDates">清空日期</el-button>
            </div>
            <div :class="bem.e('state')">
              <div>当前 model：</div>
              <pre>{{ JSON.stringify(model, null, 2) }}</pre>
            </div>
          </div>
        </DemoField>
      </section>
    </DemoFrame>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-cross-field-reverse {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
