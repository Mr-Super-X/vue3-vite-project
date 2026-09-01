/**
 * useFormErrorBus —— XForm 错误事件总线
 *
 * OPT-7 引入：原 27 处 console.error/warn 仅开发者打开 DevTools 可见，
 * 普通用户感知不到。新设计提供 provide/inject 共享的 error bus：
 *   - 调用方：report({ severity, code, message, fields?, source? }) —— 替换 console.error
 *   - 消费方：useInjectFormErrorBus() 读取 events + dismiss
 *   - 默认渲染：dev 模式通过 XFormErrorToast 浮窗展示，prod 静默（可扩展上报点）
 *
 * 设计权衡：
 *   - 不引入第三方 toast 库（element-plus ElMessageBus 与业务层耦合过深）
 *   - 仅 dev 弹 OSD；prod 静默 + 预留 hook 供业务埋点上报
 *   - 同 code 去重（5 秒内）：避免用户连续输入反复弹窗
 */

import { computed, inject, ref, type InjectionKey, type Ref } from 'vue'

/** 错误严重程度 */
export type FormErrorSeverity = 'info' | 'warn' | 'error'

/** 错误码 —— 业务可扩展 */
export type FormErrorCode =
  | 'SCHEMA_VALIDATE_FAILED'
  | 'UNKNOWN_COMPONENT'
  | 'FORBIDDEN_IDENTIFIER'
  | 'EXPRESSION_PARSE_FAILED'
  | 'CROSS_VALIDATION_FAILED'
  | 'CROSS_VALIDATOR_THREW'
  | 'REACTION_EVAL_FAILED'
  | 'FORM_INSTANCE_NOT_READY'
  | (string & {}) // 业务自定义 code

/** 单条错误事件 */
export interface FormErrorEvent {
  /** 唯一 ID —— 用于列表渲染 key */
  id: string
  /** 严重程度 */
  severity: FormErrorSeverity
  /** 错误码（建议大写蛇形） */
  code: FormErrorCode
  /** 用户可读消息 */
  message: string
  /** 涉及的字段路径（用于聚焦定位） */
  fields?: string[]
  /**
   * 字段错误详情（async-validator 风格）—— toast 渲染 + console 按字段分组输出
   * 每条含 field 路径、message 错误信息、可选 fieldValue 当前值
   */
  details?: Array<{ field: string; message: string; value?: unknown }>
  /** 错误来源模块名（debug 友好） */
  source?: string
  /** 触发时间戳 */
  timestamp: number
  /** 已读/已忽略标记（toast 关闭时设置） */
  dismissed?: boolean
}

export interface UseFormErrorBusReturn {
  /** 错误事件列表（响应式） */
  events: Ref<FormErrorEvent[]>
  /** 上报一条错误 */
  report(event: Omit<FormErrorEvent, 'id' | 'timestamp' | 'dismissed'>): void
  /** 关闭单条 toast */
  dismiss(id: string): void
  /** 关闭全部 */
  dismissAll(): void
  /** 未读数（驱动右上角红点徽标） */
  unreadCount: Ref<number>
}

const MAX_EVENTS = 5
const DEDUPE_WINDOW_MS = 5_000

/** provide/inject key —— 业务方如需自定义渲染可自注入 */
export const FORM_ERROR_BUS_KEY: InjectionKey<UseFormErrorBusReturn> = Symbol('XFormErrorBus')

/** 创建一份 error bus（XForm 顶层调用一次） */
export function useFormErrorBus(): UseFormErrorBusReturn {
  const events = ref<FormErrorEvent[]>([])
  const dedupeCache = new Map<string, number>()

  function report(event: Omit<FormErrorEvent, 'id' | 'timestamp' | 'dismissed'>): void {
    // 同 code + message 在 5s 内去重 —— 用户连续输入反复弹窗是噪音
    const dedupeKey = `${event.code}|${event.message}`
    const lastTs = dedupeCache.get(dedupeKey)
    if (lastTs && Date.now() - lastTs < DEDUPE_WINDOW_MS) {
      dedupeCache.set(dedupeKey, Date.now())
      return
    }
    dedupeCache.set(dedupeKey, Date.now())

    const newEvent: FormErrorEvent = {
      ...event,
      id: `${event.code}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    }
    // 保留最近 MAX_EVENTS 条
    events.value = [newEvent, ...events.value].slice(0, MAX_EVENTS)
    // 始终 console 留痕（开发期排错需要）
    const logFn =
      event.severity === 'error'
        ? console.error
        : event.severity === 'warn'
          ? console.warn
          : console.info
    // 有 details 时按 async-validator 风格输出 errorsMap 对象 —— 便于复用 element-plus 排查工具
    if (event.details && event.details.length > 0) {
      const errorsMap: Record<
        string,
        Array<{ message: string; fieldValue: unknown; field: string }>
      > = {}
      for (const d of event.details) {
        if (!errorsMap[d.field]) errorsMap[d.field] = []
        errorsMap[d.field]!.push({
          message: d.message,
          fieldValue: d.value,
          field: d.field,
        })
      }
      logFn(`[XForm][${event.code}]`, event.message, event.source ?? '', errorsMap)
    } else {
      logFn(`[XForm][${event.code}]`, event.message, event.source ?? '')
    }
  }

  function dismiss(id: string): void {
    events.value = events.value.map((e) => (e.id === id ? { ...e, dismissed: true } : e))
    // 30s 后清理 dismissed 项（防止列表无限增长）
    setTimeout(() => {
      events.value = events.value.filter((e) => e.id !== id)
    }, 30_000)
  }

  function dismissAll(): void {
    events.value = []
    dedupeCache.clear()
  }

  const unreadCount = computed(() => events.value.filter((e) => !e.dismissed).length)

  return { events, report, dismiss, dismissAll, unreadCount }
}

/** 子组件/嵌套 composable 读取 error bus（无则返回 null） */
export function useInjectFormErrorBus(): UseFormErrorBusReturn | null {
  return inject(FORM_ERROR_BUS_KEY, null)
}
