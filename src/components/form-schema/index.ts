import type { App, Component } from 'vue'
import XForm from './XForm.vue'

// 具名导出 XForm 组件（默认导出是插件形式，按需引入时用具名）
export { XForm }
export { validate, validateWithZod } from './composables/use-validate'
export { useFormPersist } from './composables/use-form-persist'
export type { FormPersistOptions, FormPersistReturn } from './composables/use-form-persist'
export { useFormDirty } from './composables/use-form-dirty'
export type { UseFormDirtyOptions, UseFormDirtyReturn } from './composables/use-form-dirty'
export { useSchemaIndex, buildIndex } from './composables/use-schema-index'
export type {
  UseSchemaIndexReturn,
  SchemaIndex,
  CrossRuleEntry,
} from './composables/use-schema-index'
export { resolveFunctionExpression } from './composables/use-expression'
export { resolveElComponentName } from './element-plus-adapter'
// 链式构建器全集（21 个工厂函数：xInput / xSelect / ... / xCard / xArray）
export * from './builders'
export type {
  SchemaNode,
  XFormProps,
  XFormExpose,
  RuleItem,
  ReactionConfig,
  DirectiveConfig,
  FormItemConfig,
  RowConfig,
  ColConfig,
  EventFn,
  FunctionExpression,
} from './types'

/** Vue 插件形式：app.use(FormSchema) 注册 <XForm> 全局组件 */
const FormSchemaPlugin: { install: (app: App) => void } & Component = {
  install(app: App) {
    app.component('XForm', XForm)
  },
}

export default FormSchemaPlugin
