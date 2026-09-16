<script setup lang="ts">
/**
 * 演示 XForm 错误 toast 容器替换 —— #toastContainer slot
 *
 * 场景：业务希望用 element-plus ElNotification 替代默认 XFormErrorToast
 * （更轻量的顶部弹出 + 完整自定义样式），无需 fork XFormErrorToast 组件。
 *
 * 验证点（手动触发，不依赖 XForm errorBus）：
 * 1. 必填校验失败（密码 / 确认密码留空）→ 字段红字
 * 2. 点"触发自定义 toast"按钮 → slot 接管的 ElNotification 弹出
 * 3. 对比：不传 slot时 XForm 默认 XFormErrorToast 接管
 *
 * 关联优化：
 * - XForm.vue 新增 <slot name="toastContainer" :events="errorBus.events.value">
 * - 默认 fallback 走 XFormErrorToast，业务可接管
 *
 * - 已知限制：XFormExpose 未暴露 errorBus 实例，外部无法直接调 errorBus.report
 *   （内部 crossValidator/serverError 等自动调用），本 demo 用 schema.on.change
 *   主动触发业务侧 toast 来演示 slot 接管能力
 */
import { reactive, ref } from 'vue'
import { ElNotification } from 'element-plus'
import type { SchemaNode } from '@/components/form-schema/types'
import { useXFormDemo } from '../../composables/useXFormDemo'
import ApiTable from '../../components/ApiTable.vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import DocToc from '../../components/DocToc.vue'
import { errorToastSlotItems } from './configs/xform-demos-api'
import xFormErrorToastSlotSource from './XFormErrorToastSlot.vue?raw'
import ModelPreview from '../../components/ModelPreview.vue'

const { bem, onReset, copySchema } = useXFormDemo({
  name: 'error-toast-slot',
  schema: () => schema,
  model: () => model,
})

/**
 * 自定义事件计数器 —— 用于演示 slot 接管的实时性
 * 每次 ElNotification 触发，notifyCount 自增，slot 内可响应式渲染
 */
const notifyCount = ref(0)

const schema: SchemaNode = {
  column: 1,
  children: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      props: { placeholder: '请输入用户名（必填）', clearable: true },
      rules: [{ required: true, message: '请输入用户名', trigger: 'change' }],
    },
    {
      label: '密码',
      name: 'password',
      component: 'Input',
      props: { type: 'password', placeholder: '6 位以上', clearable: true },
      rules: [{ required: true, message: '请输入密码', trigger: 'change' }],
      // on.change 触发自定义 toast —— 演示 toast 容器在 schema 钩子内可被驱动
      on: {
        change: () => {
          ElNotification({
            title: 'XForm 字段变化通知',
            message: `密码字段已修改（第 ${++notifyCount.value} 次）`,
            type: 'success',
            duration: 3000,
            position: 'top-right',
          })
        },
      },
    },
  ],
}

const model = reactive<Record<string, unknown>>({
  username: '',
  password: '',
})

/**
 * 手动触发 toast —— 演示 #toastContainer slot 完全接管错误容器
 *
 * 替代方案：本 demo 直接调 ElNotification（不通过 XForm errorBus），
 * 验证 slot 接管后业务可自由选择 toast 库/样式/触发方式
 */
function triggerCustomToast() {
  ElNotification({
    title: '自定义 toast 演示',
    message: `slot 接管后，业务侧用 ElNotification 弹窗（已触发 ${++notifyCount.value} 次）`,
    type: 'warning',
    duration: 5000,
    position: 'top-right',
  })
}

const tocItems = [
  { id: 'demo-error-toast-slot', label: 'toastContainer 替换演示' },
  { id: 'api-error-toast-slot', label: 'toastContainer slot 速查' },
]

const introductions = [
  'XForm 默认嵌入 XFormErrorToast 显示 errorBus 事件；通过 #toastContainer slot 完整接管',
  'slot props 暴露 events 数组（（响应式）+ 任意业务需要的的 dispatch 函数（如 errorBus.dismiss）',
  '业务可用 ElNotification / ElMessage / 自建 ToastList / Sonner 等任意实现',
  '默认 fallback 走 XFormErrorToast，未传 slot 时行为与升级前完全一致',
  '验证：修改密码字段 / 点"触发自定义 toast"按钮 → 右上角弹 ElNotification',
]
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="XForm 错误 toast 容器替换 —— #toastContainer slot"
      source="src/components/form-schema/components/XForm.vue"
      :introductions="introductions"
    >
      <section id="demo-error-toast-slot">
        <DemoField label="toastContainer 替换演示" :code="xFormErrorToastSlotSource">
          <XForm ref="formRef" :schema="schema" :model="model">
            <!--
              slot 接管示例 —— 业务可用任意组件替换默认 XFormErrorToast
              本 demo 的 events 为空（errorBus 未触发），slot 内的 v-for 无内容
              —— 但代码逻辑已切换（ElNotification 会响应 schema on.change）
            -->
            <template #toastContainer="{ events }">
              <template v-for="e in events" :key="e.id">
                <ElNotification
                  :title="`[${e.code}] ${e.message}`"
                  :type="
                    e.severity === 'error' ? 'error' : e.severity === 'warn' ? 'warning' : 'info'
                  "
                  :message="e.details?.[0]?.message ?? e.message"
                  :duration="5000"
                  position="top-right"
                />
              </template>
            </template>
          </XForm>
          <div :class="bem.e('actions')">
            <el-button type="primary" @click="triggerCustomToast">触发自定义 toast</el-button>
            <el-button @click="onReset">重置</el-button>
            <el-button @click="copySchema">复制 schema</el-button>
          </div>
          <ModelPreview :model="model" />
        </DemoField>
      </section>

      <ApiTable
        title="toastContainer slot 速查"
        :items="errorToastSlotItems"
        anchor="api-error-toast-slot"
      />
    </DemoFrame>

    <template #toc><DocToc :items="tocItems" /></template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-x-form-error-toast-slot {
  &__actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
</style>
