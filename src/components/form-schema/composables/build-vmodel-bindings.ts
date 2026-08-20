import type { SchemaNode, XFormProps } from '../types'
import { get, set } from 'lodash-es'

/** 构建节点 vModel 绑定：含 beforeChange 字段粒度拦截
 * - 同步返回值替换 v
 * - Promise resolve 后更新 model
 * - Promise reject / 返回 undefined → 放行原值
 *
 * node.modelProp 可自定义 v-model 双向绑定的属性名（默认 'modelValue' / 'update:modelValue'）
 *
 * 注意：node.name 可能是嵌套路径（如 items[0].product），必须用 lodash get/set 解析；
 * 普通 model[name] 只能访问顶层字段,数组项的 v-model 会取不到 / 写入错误路径
 */
export function buildVModelBindings(
  node: SchemaNode,
  model: Record<string, unknown> | undefined,
  beforeChange: XFormProps['beforeChange']
): Record<string, unknown> {
  if (node.name === undefined || !model) return {}
  const prop = node.modelProp ?? 'modelValue'
  // vue 3 事件 prop 约定：'on' + capitalize(emit 名) = 'on' + 'Update:modelValue' = 'onUpdate:modelValue'
  // 注意：prop（如 'modelValue'）自身首字母小写，不要再大写
  const eventProp = `on${`update:${prop}`.charAt(0).toUpperCase()}${`update:${prop}`.slice(1)}`
  return {
    [prop]: get(model, node.name),
    [eventProp]: (v: unknown) => {
      const oldVal = get(model, node.name as string)
      if (beforeChange) {
        const result = beforeChange(node, v, oldVal)
        if (result instanceof Promise) {
          result
            .then((final) => {
              set(model, node.name as string, final)
            })
            .catch(() => {})
          return
        }
        if (result !== undefined) {
          set(model, node.name as string, result)
          return
        }
      }
      set(model, node.name as string, v)
    },
  }
}
