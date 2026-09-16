<script setup lang="ts">
/**
 * XForm —— schema 驱动的 element-plus 表单渲染器
 *
 * 模板 + props/attrs 透传 + ElConfigProvider + ElForm 骨架，所有业务编排收敛到 ../composables/use-xform-composer.ts。
 *
 * @group XForm 组件
 */
import { computed, onMounted } from 'vue'
import { ElConfigProvider, ElForm, ElRow, ElCol } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import { useXFormComposer } from '../composables/use-xform-composer'
import XFormDebugBanner from './XFormDebugBanner.vue'
import XFormErrorToast from './XFormErrorToast.vue'
import SchemaField from './SchemaField.vue'
import type { XFormExpose, XFormProps } from '../types'

// 全局样式（label 颜色、必填星号等覆盖）—— 仅 XForm.vue 加载，未使用 XForm 的页面无需引入
import 'element-plus/dist/index.css'
import '../styles/element-form-overwrite.scss'

const props = defineProps<XFormProps>()
// exactOptionalPropertyTypes 下 vue 推导的 props 类型（LooseRequired 包裹）与
// XFormProps 在 optional 字段（如 model?: T vs model: T）上有严格类型差异，
// 收口为 XFormProps 让下游 useXFormComposer 不重复处理。
// （归因见 types/TYPE-CAST-AUDIT.md；外部消费方仍通过 defineExpose(exposed) 拿不到此别名）
const propsModel = props as XFormProps
// element-plus 2.x ConfigProviderProps 是 ExtractPropTypes 元组（type/required/validator/__epPropKey）形态，
// 运行时 locale 是 Language 对象、size 是 string；TS 层用 Record<string, unknown> 替代 `as any`（全局 §1.5 违规），
// <ElConfigProvider v-bind="elConfig"> 接受 string-keyed 对象（归因见 types/TYPE-CAST-AUDIT.md C1）。
const elConfig: Record<string, unknown> = { locale: zhCn, size: 'default' }
// BEM namespace 由 unplugin-auto-import 自动注入，无需显式 import
const {
  bem,
  elFormRef,
  renderToComponent,
  fieldErrors,
  topLevelNodes,
  topLevelRow,
  topLevelColumn,
  topLevelColSpan,
  topLevelDisabled,
  topLevelLabelWidth,
  topLevelLabelPosition,
  topLevelScrollToError,
  topLevelScrollIntoViewOptions,
  validateErrors,
  forbiddenErrors,
  showDebugBanner,
  exposed,
  installDevDebugHook,
  errorBus,
} = useXFormComposer({ props: propsModel })

defineExpose(exposed satisfies XFormExpose)

/**
 * 缓存模板里反复出现的派生值 —— 避免每次响应式依赖变化都重算
 *
 * - fieldErrorKeys：纯字符串，浅比较友好，作为 data-attr 稳定触发 attribute update
 * - topLevelGutter：消除模板两个分支里重复的 `topLevelRow?.gutter ?? 0 as never`
 * - resolvedModel：兜底空对象，避免下游 `props.model` 为 undefined 时 ElForm 抛错
 */
const fieldErrorKeys = computed(() => Object.keys(fieldErrors.value).join(','))
const topLevelGutter = computed(() => topLevelRow.value?.gutter ?? 0)
const resolvedModel = computed(() => (props.model ?? {}) as Record<string, unknown>)

/**
 * dev console 钩子移到 onMounted —— 避免 SSR 环境下 window 访问抛错；
 * 仅 dev 开启，prod 模式下 installDevDebugHook 是 no-op
 */
onMounted(() => installDevDebugHook())
</script>

<template>
  <ElConfigProvider v-bind="elConfig">
    <!--
      注意：未设置 inheritAttrs:false —— $attrs 自动透传到此根 div，
      消费方可自由传入 @click / style / data-* 等（修复潜在 attrs 静默吞掉的 Bug）
    -->
    <div :class="bem.b()" :data-field-errors="fieldErrorKeys">
      <ElForm
        ref="elFormRef"
        :model="resolvedModel"
        :validate-trigger="['change', 'blur']"
        :disabled="topLevelDisabled"
        :label-position="topLevelLabelPosition"
        :label-width="topLevelLabelWidth"
        :scroll-to-error="topLevelScrollToError"
        :scroll-into-view-options="topLevelScrollIntoViewOptions"
      >
        <ElRow v-if="topLevelColumn" :gutter="topLevelGutter">
          <ElCol
            v-for="(node, i) in topLevelNodes"
            :key="node.key ?? node.name ?? i"
            :span="topLevelColSpan"
          >
            <SchemaField :node="node" :render-fn="renderToComponent" />
          </ElCol>
        </ElRow>
        <ElRow v-else-if="topLevelRow" :gutter="topLevelGutter">
          <SchemaField
            v-for="(node, i) in topLevelNodes"
            :key="node.key ?? node.name ?? i"
            :node="node"
            :render-fn="renderToComponent"
          />
        </ElRow>
        <SchemaField
          v-else
          v-for="(node, i) in topLevelNodes"
          :key="node.key ?? node.name ?? i"
          :node="node"
          :render-fn="renderToComponent"
        />
        <!-- 扩展插槽：嵌入表单内部底部（提交按钮 / 说明文案） -->
        <slot name="footer" />
      </ElForm>
    </div>
  </ElConfigProvider>
  <XFormDebugBanner
    v-if="showDebugBanner"
    :validate-errors="validateErrors"
    :forbidden-errors="forbiddenErrors"
  />
  <!-- OPT-7：user-facing 错误 OSD —— 由 showErrorToast prop 独立控制（默认关闭），
       与 showDebugBanner（schema 校验/安全扫描横幅，dev 自动开）互不耦合 -->
  <XFormErrorToast
    :events="errorBus.events.value"
    :enabled="props.showErrorToast ?? false"
    @dismiss="errorBus.dismiss"
  />
</template>

<style lang="scss">
/* 命名空间占位 —— 子组件覆盖样式各自下钻到 .#{$BEM_PREFIX}-x-form__xxx */
.#{$BEM_PREFIX}-x-form {
}
</style>
