<script setup lang="ts">
/**
 * SchemaField —— 字段级渲染容器
 *
 * 字段级重渲隔离：XForm 模板里 <component :is="renderToComponent(node)"> 在父组件 render effect
 * 中执行，内部的 get(model, name) 被父组件追踪 ——任一字段输入都触发全表单 vnode 重建。
 * 下沉到本组件后，每个字段的 render effect 独立追踪自己的 get(model)，
 * 输入单字段只重渲该字段，其余字段的 vnode 完全不动。
 *
 * 优化内容（2026-09-15 review）：
 * 1. 双重容错：
 *    a. safeRender computed try/catch 捕获 renderFn 同步 throw
 *    b. onErrorCaptured 捕获子组件 patch 阶段 throw
 *    关键：onErrorCaptured 通过 tick counter 让 computed 重新求值，返回 undefined
 *    让 template 重渲染走占位 UI 而非继续渲染已 throw 的 component
 * 2. #default scoped slot —— 消费方按节点名替换渲染
 * 3. 显式 Props interface —— IDE hover 展开完整类型
 *
 * el-form 的 provide/inject 沿组件祖先链传递，中间多一层组件不影响 ElFormItem 注册。
 *
 * @group XForm 组件
 */
import { onErrorCaptured, ref, computed, type VNode } from 'vue'
import type { SchemaNode } from '../types'

/** Props 接口 —— 集中声明便于 IDE hover 展开 + 子组件 props 校验 */
interface SchemaFieldProps {
  node: SchemaNode
  renderFn: (node: SchemaNode) => VNode | string | VNode[] | undefined
}

const props = defineProps<SchemaFieldProps>()

defineOptions({ name: 'XFormSchemaField' })

/**
 * patch 阶段错误状态 —— 由 onErrorCaptured 填充
 */
const renderError = ref<Error | null>(null)

/**
 * tick counter —— 让 computed 主动追踪 renderError 变化，重新求值
 *
 * 不能让 computed 直接读 renderError.value（会破坏 model 响应式追踪链稳定性），
 * 改用一个 ref counter：renderError 设置时 tick++ → computed 重算 → 返回 undefined → 占位
 *
 * 关键：tick 必须**先于**renderError 被设置，否则下一次 render 仍会调 renderFn
 */
const tick = ref(0)

/**
 * 同步阶段安全渲染 —— computed 包裹 renderFn 调用，捕获同步 throw
 *
 * 依赖：props.node / props.renderFn（renderFn 内访问 model → 字段级响应式追踪）
 * + tick（patch 阶段 throw 重置触发器）
 *
 * 关键：catch 块内**不写 ref**（vue/no-side-effects-in-computed-properties 禁用），
 * 仅 console 留痕 + 返回 undefined —— template 通过 `!rendered` 走占位 div
 *
 * 返回类型 narrow 为 VNode | string | undefined：模板 <component :is="...">
 * 只接受单值；renderFn 返回数组形态属于上游约定违规，取首项或忽略
 */
const rendered = computed<VNode | string | undefined>(() => {
  void tick.value // 建立 tick 依赖，让 onErrorCaptured 能触发重算
  if (renderError.value) return undefined // patch 阶段已出错：返回 undefined 走占位
  try {
    const result = props.renderFn(props.node)
    if (Array.isArray(result)) {
      // 数组形态不直接渲染：透传首项
      return result[0]
    }
    return result ?? undefined
  } catch (err) {
    // dev 留痕；prod 静默 —— 不写 renderError (避免 vue/no-side-effects-in-computed-properties)
    // sync throw 后 rendered 为 undefined，template 通过 !rendered 走占位 div
    if (import.meta.env.DEV) {
      console.error(
        `[XForm][SchemaField] renderFn failed for node "${props.node.name ?? '<unnamed>'}"`,
        err
      )
    }
    return undefined
  }
})

/**
 * 捕获子组件 patch 阶段的 throw —— 阻止冒泡到外层 ErrorBoundary
 *
 * 时机：Vue patch 子组件时执行其 render function / setup，若 throw 触发此钩子。
 * 关键：递增 tick 让 computed 重新求值（renderError 有值时返回 undefined），
 * template 下次 patch 走占位 div 而非继续渲染已 throw 的 component。
 *
 * 返回 false 阻止 Vue 继续向上传播（否则外层 ErrorBoundary 会接管并渲染错误页）。
 */
onErrorCaptured((err) => {
  // 必须**先**递增 tick，确保下次 render 时 computed 已看到 renderError
  renderError.value = err instanceof Error ? err : new Error(String(err))
  tick.value++
  if (import.meta.env.DEV) {
    console.error(
      `[XForm][SchemaField] patch failed for node "${props.node.name ?? '<unnamed>'}"`,
      err
    )
  }
  return false
})
</script>

<template>
  <!--
    扩展插槽：消费方可按 node.name 替换渲染
    <SchemaField :node="node" :render-fn="renderFn">
      <template #default="{ node }">
        <MyCustomWrapper v-if="node.name === 'special'" />
      </template>
    </SchemaField>
  -->
  <slot name="default" :node="props.node">
    <!--
      三选一渲染：
      1. patch 阶段 throw（renderError 有值）→ 占位 div
      2. renderFn 同步 throw（rendered === undefined）→ 占位 div
      3. 正常 → <component :is="rendered" />
    -->
    <div
      v-if="renderError || !rendered"
      :data-xform-error="props.node.name"
      class="x-form-render-error"
    >
      字段渲染失败（详见 console）
    </div>
    <component v-else :is="rendered" />
  </slot>
</template>

<style lang="scss">
/* 字段渲染失败占位 —— 顶层选择器，不嵌套到组件根类（SchemaField 无根 class）
   不依赖 el-message 减少外部样式影响 */
.x-form-render-error {
  padding: 8px 12px;
  border: 1px dashed var(--el-color-danger);
  color: var(--el-color-danger);
  font-size: 12px;
  border-radius: 4px;
  background: var(--el-color-danger-light-9);
}
</style>
