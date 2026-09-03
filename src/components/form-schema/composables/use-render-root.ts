/**
 * useRenderRoot —— XForm 渲染根闭包（renderToComponent + renderOpts + optsEpoch）
 *
 * 从 use-xform-composer 抽离，~100 行独立可复用单元。
 *
 * 职责：
 * - 构造 renderToComponent 渲染闭包（外层 hidden/directives 包装 + ignore 早 return）
 * - 构造 renderOpts 配置对象（传给 useRenderSchemaNode 主调度）
 * - 维护 optsEpoch 计数器 + 同步 watch（props 引用换代时 bump，让字段 effect 失效重渲）
 *
 * 不变量：
 * - renderToComponent 必须订阅 optsEpoch.value 才能随 props 换代触发重渲
 * - renderOpts.model/components/rules/beforeChange/componentProps 在 setup 期捕获 props 快照，
 *   父级替换引用时通过同步 watch 写入新值（修复 B4 静默断裂问题）
 * - onValueChange 必须先 clearValidate 再 trigger —— delay=0 实时模式下顺序倒置会导致红字被立即清除
 */
import { ref, watch, type ComputedRef, type Ref, type VNode } from 'vue'

import { useRenderSchemaNode, type RenderSchemaNodeOptions } from './render-schema-node'
import { makeDefaultBeforeChangeCtx } from './build-vmodel-bindings'
import { withHidden } from './with-hidden'
import { applyDirectives } from './apply-directives'
import type { SchemaNode, XFormExpose, XFormProps } from '../types'
import type { FieldErrorState } from './use-form-instance'
import type { UseFormErrorBusReturn } from './use-form-error-bus'

/** 渲染闭包签名 —— 与 useRenderSchemaNode.render 一致 */
export type RenderFn = (
  node: SchemaNode | SchemaNode[] | string | undefined | null
) => VNode | string | VNode[] | undefined

/**
 * useRenderRoot 入参 —— XForm 顶层编排注入的所有渲染依赖
 *
 * - props / fieldErrors: 全局状态
 * - getExposed: 延迟解析的 exposed getter（exposed 在 useXFormComposer 末尾才构造）
 * - elForm / arrayActions: 命令式 API 转发
 * - mergedComponentProps / currentBreakpoint / topLevelReadonly: 计算属性
 */
export interface UseRenderRootDeps {
  props: XFormProps
  fieldErrors: Ref<Record<string, FieldErrorState>>
  /** 延迟解析 exposed —— getter 形式避免 useXFormComposer 末尾构造的循环依赖 */
  getExposed: () => XFormExpose
  /** el-form 命令式 API */
  clearValidate: (names?: string[]) => void
  /** el-form validateField wrapper —— errorBus.report(force:true) 反馈给开发者 */
  elFormRef: Ref<unknown>
  errorBus: UseFormErrorBusReturn
  /** 跨字段校验触发 */
  crossFieldTrigger: { trigger: (name: string) => void }
  triggerCrossFieldValidator: (
    node: SchemaNode,
    eventType: 'blur' | 'change'
  ) => Promise<void> | void
  /** 数组节点操作 */
  arrayActions: {
    addItem: (name: string, init?: Record<string, unknown>) => void
    removeItem: (name: string, index: number) => void
    moveItem: (name: string, from: number, to: number) => void
  }
  /** 响应式 + 默认 props */
  currentBreakpoint: Ref<'xs' | 'sm' | 'md' | 'lg' | 'xl'>
  topLevelReadonly: ComputedRef<boolean>
  mergedComponentProps: ComputedRef<Record<string, Record<string, unknown>>>
}

/** useRenderRoot 返回值 —— 仅暴露 renderToComponent（optsEpoch 是内部订阅细节） */
export interface UseRenderRootReturn {
  /** XForm 模板 <SchemaField :render-fn="renderToComponent"> 消费 */
  renderToComponent: RenderFn
}

/** useRenderRoot —— XForm 渲染根闭包（renderToComponent + renderOpts + optsEpoch） */
export function useRenderRoot(deps: UseRenderRootDeps): UseRenderRootReturn {
  const {
    props,
    fieldErrors,
    getExposed,
    clearValidate,
    elFormRef,
    errorBus,
    crossFieldTrigger,
    triggerCrossFieldValidator,
    arrayActions,
    currentBreakpoint,
    topLevelReadonly,
    mergedComponentProps,
  } = deps

  // opts 换代计数器 —— 父级替换 props 引用时 bump，让所有 SchemaField 的 render effect 失效重渲
  // B4 修复背景：renderOpts 在 setup 期捕获 props 快照，父级替换引用后渲染绑定静默断裂
  const optsEpoch = ref(0)

  /** 节点渲染（外层：hidden / directives 包装） */
  function renderToComponent(
    node: SchemaNode | SchemaNode[] | string | undefined | null
  ): VNode | string | VNode[] | undefined {
    // 订阅 optsEpoch：B4 watch 在 props 引用换代时 bump 它，字段 effect 随之失效重渲
    void optsEpoch.value
    if (node === null || node === undefined) return undefined
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(renderToComponent) as VNode[]
    if (node.ignore) return undefined
    const result = renderInner(node)
    if (!result || typeof result === 'string' || Array.isArray(result)) return result as never

    if (node.hidden) {
      const hiddenResult = withHidden(result)
      return node.directives ? applyDirectives(hiddenResult, node.directives) : hiddenResult
    }

    return applyDirectives(result, node.directives)
  }

  const renderOpts: RenderSchemaNodeOptions = {
    model: props.model,
    components: props.components,
    beforeChange: props.beforeChange,
    beforeChangeRules: props.beforeChangeRules,
    // getter 闭包延迟解析 exposed —— 闭包内访问的 exposed 在本函数末尾才构造
    makeBeforeChangeCtx: (node) =>
      makeDefaultBeforeChangeCtx(node, (props.model ?? {}) as Record<string, unknown>, getExposed),
    rules: props.rules,
    componentProps: mergedComponentProps.value,
    render: renderToComponent,
    externalErrors: () => fieldErrors.value,
    arrayActions,
    triggerCrossFieldValidator: (node, eventType) => triggerCrossFieldValidator(node, eventType),
    validateField: async (name: string) => {
      try {
        await (
          elFormRef.value as { validateField?: (n: string) => Promise<void> } | null
        )?.validateField?.(name)
      } catch (err: unknown) {
        // 对齐 validateForm 错误流:走 errorBus, dev/qa 可通过 OSD 看到, prod 仅 console.error 留痕
        // 错误已写入 form-item 但用户主动调用 validateField 仍需看到全量细节
        errorBus.report({
          severity: 'error',
          code: 'EL_FORM_VALIDATE_FIELD_FAILED',
          message: `字段 ${name} 校验失败`,
          source: 'useRenderRoot.validateField',
          force: true, // 主动调用场景,跳过去重
          ...(err instanceof Error
            ? { details: [{ field: name, value: undefined, message: err.message }] }
            : {}),
        })
      }
    },
    // v-model 值变化时的跨字段调度唯一入口
    onValueChange: (node, _newValue) => {
      if (node.name) {
        // 顺序关键：delay=0（实时模式）下 crossValidator 同步执行，
        // 若先 trigger 后 clearValidate，刚写入的错误会被立即清除，导致 UI 不标红。
        clearValidate([node.name])
        crossFieldTrigger.trigger(node.name)
      }
    },
    currentBreakpoint: currentBreakpoint,
    globalReadonly: () => topLevelReadonly.value,
  }

  const renderInner = useRenderSchemaNode(renderOpts)

  // props 引用换代时同步 renderOpts + bump optsEpoch
  watch(
    () => [
      props.model,
      props.components,
      props.rules,
      props.beforeChange,
      mergedComponentProps.value,
    ],
    () => {
      renderOpts.model = props.model
      renderOpts.components = props.components
      renderOpts.rules = props.rules
      renderOpts.beforeChange = props.beforeChange
      renderOpts.componentProps = mergedComponentProps.value
      optsEpoch.value++ // props 引用换代
    }
  )

  return { renderToComponent }
}
