<script setup lang="ts">
/**
 * XForm —— schema 驱动的 element-plus 表单渲染器
 *
 * 本文件只承担模板 + props/attrs 透传；setup 中的 11 个 composable 装配与同步逻辑
 * 全部收敛到 ./composables/use-xform-composer.ts，本文件 setup 块零业务逻辑。
 */
import { useAttrs } from 'vue'
import { ElConfigProvider, ElForm, ElRow, ElCol } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import { useXFormComposer } from './composables/use-xform-composer'
import XFormDebugBanner from './XFormDebugBanner.vue'
import SchemaField from './SchemaField.vue'
import type { XFormExpose, XFormProps } from './types'

// 全局样式：element-plus 基础样式 + form-schema 自定义覆盖（label 颜色、必填星号等）
// 仅 XForm.vue 加载 —— 未使用 XForm 的页面不需要这些 CSS
import 'element-plus/dist/index.css'
import './styles/element-form-overwrite.scss'

const props = defineProps<XFormProps>()
// exactOptionalPropertyTypes 下 vue 推导的 props 类型与 XFormProps 在 optional 字段上有差异，
// 这里统一收口为 XFormProps 让下游 composable 不重复处理
const propsModel = props as XFormProps
const attrs = useAttrs()
// ElConfigProvider 默认配置：中文 locale + default 尺寸档
// 类型 as any 原因：element-plus buildProp 类型元组（type/required/validator/__epPropKey）与运行时
// 值类型不直接等价，是 element-plus 类型系统的已知问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elConfig = { locale: zhCn, size: 'default' } as any
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
} = useXFormComposer({ props: propsModel })

defineOptions({ inheritAttrs: false })
defineExpose(exposed satisfies XFormExpose)

installDevDebugHook()
</script>

<template>
  <ElConfigProvider v-bind="elConfig">
    <div :class="[bem.b(), attrs.class]">
      <ElForm
        ref="elFormRef"
        :model="(props.model ?? {}) as Record<string, unknown>"
        :validate-trigger="['change', 'blur']"
        :disabled="topLevelDisabled"
        :label-position="topLevelLabelPosition"
        :label-width="topLevelLabelWidth"
        :scroll-to-error="topLevelScrollToError"
        :scroll-into-view-options="topLevelScrollIntoViewOptions"
      >
        <!-- 阶段 3.1:fieldErrors 变化时强制重渲染关键 —— 模板必须显式引用 fieldErrors
             triggerRef 通知依赖但不修改引用,computed topLevelNodes 引用未变 → Vue 不会重渲染
             显式绑定 fieldErrors 到 DOM 属性让模板建立响应式依赖,触发重渲染 -->
        <div :data-field-errors="Object.keys(fieldErrors).join(',')" style="display: none" />
        <!-- OPT-3 归因：以下两处 ElRow :gutter 模板内联 `as never` 是
             Element Plus buildProp 类型元组在 vue 模板表达式中推导失败。
             运行时由 ElRow 自身校验 gutter 类型为 number | string。 -->
        <ElRow v-if="topLevelColumn" :gutter="(topLevelRow?.gutter ?? 0) as never">
          <ElCol
            v-for="(node, i) in topLevelNodes"
            :key="node.key ?? node.name ?? i"
            :span="topLevelColSpan"
          >
            <SchemaField :node="node" :render-fn="renderToComponent" />
          </ElCol>
        </ElRow>
        <ElRow v-else-if="topLevelRow" :gutter="(topLevelRow?.gutter ?? 0) as never">
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
      </ElForm>
    </div>
  </ElConfigProvider>
  <XFormDebugBanner
    v-if="showDebugBanner"
    :validate-errors="validateErrors"
    :forbidden-errors="forbiddenErrors"
  />
</template>

<style lang="scss">
.#{$BEM_PREFIX}-x-form {
}
</style>
