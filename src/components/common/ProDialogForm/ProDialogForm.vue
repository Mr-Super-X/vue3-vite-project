<script setup lang="ts">
/**
 * ProDialogForm —— ProDialog + XForm 的高级弹窗表单组合
 *
 * 核心能力：
 * - v-model 控制弹窗显隐
 * - 内置「确定 / 取消」footer：点确定时自动校验 → 调用 onSubmit → 成功后自动关闭
 * - 关闭弹窗后（动画结束）自动 resetFields 清空数据与校验状态
 * - 提交期间按钮 loading，防止重复提交
 * - defineExpose 暴露 XFormExpose 全部 19 个方法（validate / resetFields / ...）
 *
 * 关键设计决策（每个都在下面对应位置单独解释）：
 * 1. 关闭时重置表单的时序：ProDialog 未暴露 closed 事件，用 setTimeout(resetFields, 300)
 *    模拟 EP 默认动画时长，避免关闭动画期间表单内容瞬间清空的闪烁感
 * 2. 防重复提交：submitLoading 标志 + try/finally，确保异常情况下也能复位 loading
 * 3. onSubmit 失败时不关闭弹窗：让用户修复后再次提交，错误向上抛出由调用方决定提示方式
 *
 * @see [`./types.ts`](./types.ts) Props / Emits / Expose 类型
 * @see [`@/components/common/ProDialog`](../ProDialog/ProDialog.vue) 弹窗底层
 * @see [`@/components/form-schema/components/XForm`](../../../form-schema/components/XForm.vue) 表单底层
 * @group 通用组件：ProDialogForm
 */
import type { ProDialogFormExpose, ProDialogFormProps } from './types'
import type { RuleItem, XFormExpose } from '@/components/form-schema/types'

defineOptions({ name: 'ProDialogForm' })

const props = withDefaults(defineProps<ProDialogFormProps>(), {
  width: '500px',
  submitButtonText: '确 定',
  cancelButtonText: '取 消',
  resetOnClose: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
  submitFailed: [error: unknown]
}>()

// BEM 命名空间：vv-pro-dialog-form（createNamespace 由自动导入插件注入，详见 CLAUDE.md §1.6）
// 通过 ProDialog 的 class 挂载命名空间占位类，便于将来按 .vv-pro-dialog-form__xxx 下钻样式
const bem = createNamespace('pro-dialog-form')

// rules 兜底：exactOptionalPropertyTypes 模式下 XForm 的 `rules?: Record<string, RuleItem>`
// 不接受 undefined，调用方未传时降级为空对象（XForm 内部会跳过空规则集，行为等价于无规则）
// 显式标注类型：避免 `props.rules ?? {}` 被 TS 推导为 `Record<string, RuleItem> | {}` 联合类型
const formRules = computed<Record<string, RuleItem>>(() => props.rules ?? {})

// XForm 实例引用 —— 初始化时为 null，组件挂载后由模板 ref 赋值
// 类型断言为 XFormExpose 联合 null：避免非空断言（!）滥用
const formRef = ref<ProDialogFormExpose | null>(null)

// 提交按钮 loading 状态 —— true 时按钮禁用 + 转圈，防重复提交
const submitLoading = ref(false)

/**
 * 提交逻辑（防重复提交的关键路径）
 *
 * 时序：
 * 1. validate()：XForm 校验全部字段 + 跨字段规则；失败时由 schema.scrollToError
 *    自动滚动到错误字段 + 字段红字（XForm 内部处理），本函数直接 return 不进入提交
 * 2. submitLoading 置 true 防止用户在 onSubmit 执行期间重复点确定
 *    —— 即便 validate 已通过，重复点击仍可能触发多次 onSubmit（race condition）
 * 3. await props.onSubmit(props.model) 调用方提供的异步提交函数
 * 4. 成功：emit('update:modelValue', false) 关闭弹窗 + emit('success') 通知父组件
 * 5. 失败：emit('submit-failed', err) 通知父组件，**不抛错**到全局 errorHandler
 * 6. finally：submitLoading 复位（无论成功失败，保证按钮可重新点击）
 *
 * 关键设计：失败时不 throw err
 * Vue 模板事件处理器（@click 等）调用 async 函数时，Promise reject 会冒泡到
 * app.config.errorHandler，项目的全局错误处理（src/plugins/errorHandler）会跳转到 500 错误页。
 * 改用 emit('submit-failed') 让调用方完全控制错误处理：toast / 字段红字 / 静默均可，
 * 不会因为 demo 中调用方未监听就触发全局重定向。
 */
async function handleSubmit(): Promise<void> {
  if (!formRef.value) return

  // 1. 校验
  const valid = await formRef.value.validate()
  if (!valid) return

  // 2. 防重复提交 —— 兜底防护，即使按钮被绕过（程序化触发）也阻断二次提交
  if (submitLoading.value) return
  submitLoading.value = true

  try {
    // 3. 异步提交
    await props.onSubmit(props.model)

    // 4. 成功：关闭弹窗（v-model 联动父组件） + 通知父组件
    emit('update:modelValue', false)
    emit('success')
  } catch (err) {
    // 5. 失败：通知父组件 + 控制台留痕 —— 不 throw err，避免触发全局 errorHandler → 500 重定向
    // 调用方监听 @submit-failed 自行决定提示方式（toast / 字段红字 / ...）
    console.error('[ProDialogForm] onSubmit failed:', err)
    emit('submitFailed', err)
  } finally {
    // 6. loading 复位 —— 无论成功失败，保证下次可点击
    submitLoading.value = false
  }
}

/**
 * 弹窗关闭处理 —— 关闭时重置表单的时序说明
 *
 * 触发时机：ProDialog 的 close 事件，在「所有关闭途径」下都会触发
 *          （确认 / 取消 / X / ESC / 遮罩），触发点是「开始关闭动画」而非「动画结束」。
 *
 * 为什么不在 close 触发时立即 resetFields？
 * 立即调用会让用户看到「弹窗开始淡出 + 表单内容瞬间清空」的双重动画叠加，
 * 产生闪烁感。resetFields 会同步触发响应式更新，DOM 仍在动画可见区。
 *
 * 解决方案：setTimeout(resetFields, 300) 模拟 EP 默认动画时长 300ms。
 * 此时 el-dialog 已不可见（display: none），重置只更新响应式数据，
 * 下次打开弹窗时用户看到的是空白表单，无视觉抖动。
 *
 * 硬编码 300 的原因：ProDialog 未暴露 closed 事件（动画结束后的事件）。
 * 如未来 EP 动画时长变更，需同步调整此值。
 */
function handleClose(): void {
  if (!props.resetOnClose) return
  if (!formRef.value) return

  setTimeout(() => {
    formRef.value?.resetFields()
  }, 300)
}

/**
 * defineExpose 代理 —— 把 formRef 上的 19 个 XFormExpose 方法代理出去，
 * 让父组件通过 ref 直接调用 XForm 的能力（validate / resetFields / setFieldError / ...）。
 *
 * 代理原因：defineExpose 在 setup 阶段执行，formRef.value 此时还未挂载，
 * 不能直接 expose formRef.value。
 *
 * 为什么不直接用 Proxy 转发了？
 * Proxy 的 get 拦截在 formRef.value 为 null 或目标方法未注册时返回 undefined，
 * 调用方访问 `proDialogFormRef.value.setFieldError` 会得到 undefined，触发调用时报错
 * "xxx is not a function"。改用显式对象字面量代理：每个方法都是真实函数，
 * formRef.value 为 null 时方法返回 undefined 而非方法本身消失，
 * 调用方拿到的始终是可调用函数 + 安全的可选链短路（proDialogFormRef.value?.setFieldError）。
 *
 * 类型说明：defineExpose<ProDialogFormExpose>(...) 显式标注返回类型，
 * IDE hover 时展示完整 19 方法签名（volar 按 ProDialogFormExpose 推导）。
 */
defineExpose<ProDialogFormExpose>({
  getRef: ((key: string) => formRef.value?.getRef(key)) as XFormExpose['getRef'],
  getNames: ((includesIgnore?: boolean) =>
    formRef.value?.getNames(includesIgnore)) as XFormExpose['getNames'],
  validate: (() => formRef.value?.validate()) as XFormExpose['validate'],
  validateDetail: (() => formRef.value?.validateDetail()) as XFormExpose['validateDetail'],
  clearValidate: (() => formRef.value?.clearValidate()) as XFormExpose['clearValidate'],
  resetFields: ((names?: string | string[]) =>
    formRef.value?.resetFields(names)) as XFormExpose['resetFields'],
  validateField: ((name: string | string[]) =>
    formRef.value?.validateField(name)) as XFormExpose['validateField'],
  scrollToField: ((name: string) =>
    formRef.value?.scrollToField(name)) as XFormExpose['scrollToField'],
  validateWithZod: (() => formRef.value?.validateWithZod()) as XFormExpose['validateWithZod'],
  setFieldError: ((
    name: string,
    message: string,
    state?: '' | 'validating' | 'success' | 'error'
  ) => formRef.value?.setFieldError(name, message, state)) as XFormExpose['setFieldError'],
  setFieldValidating: ((name: string) =>
    formRef.value?.setFieldValidating(name)) as XFormExpose['setFieldValidating'],
  addItem: ((name: string, init?: Record<string, unknown>) =>
    formRef.value?.addItem(name, init)) as XFormExpose['addItem'],
  removeItem: ((name: string, index: number) =>
    formRef.value?.removeItem(name, index)) as XFormExpose['removeItem'],
  moveItem: ((name: string, from: number, to: number) =>
    formRef.value?.moveItem(name, from, to)) as XFormExpose['moveItem'],
  isDirty: (() => formRef.value?.isDirty() ?? false) as XFormExpose['isDirty'],
  getDirtyFields: (() => formRef.value?.getDirtyFields() ?? []) as XFormExpose['getDirtyFields'],
  isTouched: ((name: string) =>
    formRef.value?.isTouched(name) ?? false) as XFormExpose['isTouched'],
  resetDirty: (() => formRef.value?.resetDirty()) as XFormExpose['resetDirty'],
  validateFromServer: ((response: {
    success?: boolean
    errors?:
      Array<{ path?: string; field?: string; message?: string }> | Record<string, string | string[]>
  }) => formRef.value?.validateFromServer(response) ?? 0) as XFormExpose['validateFromServer'],
})
</script>

<template>
  <ProDialog
    :class="bem.b()"
    :model-value="modelValue"
    :title="title"
    :width="width"
    @update:model-value="emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <!-- XForm 表单主体 —— 通过 ref 绑定，submit 时调用 validate() -->
    <XForm ref="formRef" :schema="schema" :model="model" :rules="formRules" />

    <!-- 默认插槽：在表单之后插入额外内容（如分隔线 / 说明文字） -->
    <slot />

    <!-- footer 插槽：自定义底部按钮；作用域插槽暴露 submit/cancel/loading 供调用方复用 -->
    <template #footer>
      <slot
        name="footer"
        :submit="handleSubmit"
        :cancel="() => emit('update:modelValue', false)"
        :loading="submitLoading"
      >
        <el-button @click="emit('update:modelValue', false)">
          {{ cancelButtonText }}
        </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ submitButtonText }}
        </el-button>
      </slot>
    </template>
  </ProDialog>
</template>

<style lang="scss">
/* 命名空间占位 —— 子组件样式按需下钻到 .#{$BEM_PREFIX}-pro-dialog-form__xxx */
.#{$BEM_PREFIX}-pro-dialog-form {
}
</style>
