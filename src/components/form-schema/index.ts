import type { App, Component } from 'vue'
import XForm from './XForm.vue'

export { validate, validateWithZod } from './composables/use-validate'
export { useFormPersist } from './composables/use-form-persist'
export type { FormPersistOptions, FormPersistReturn } from './composables/use-form-persist'
export { resolveFunctionExpression } from './composables/use-expression'
export { resolveElComponentName } from './element-plus-adapter'
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
