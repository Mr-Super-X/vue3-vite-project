/**
 * use-form-error-bus —— XForm 错误事件总线
 *
 * 替代散落 27 处 console.error/warn：调用方 report({ severity, code, message, ... })，
 * 消费方通过 events ref 订阅（dev 通过 XFormErrorToast 浮窗展示，prod 静默）。
 *
 * 不引入第三方 toast 库（ElMessageBus 与业务层耦合过深）；prod 预留 hook 供业务埋点上报。
 * 同 code 去重（5 秒内）避免连续输入反复弹窗；force:true 跳过去重用于主动 validate 场景。
 */

import { computed, ref, type Ref } from 'vue'

/** 错误严重程度 */
export type FormErrorSeverity = 'info' | 'warn' | 'error'

/** 错误码 —— 业务可扩展 */
export type FormErrorCode =
  /** schema 静态校验失败（validate 函数返回 isValid=false） */
  | 'SCHEMA_VALIDATE_FAILED'
  /** 表达式含 FORBIDDEN 关键字（window/eval/document 等） */
  | 'FORBIDDEN_IDENTIFIER'
  /** {{ fn }} 表达式解析失败（new Function 抛错） */
  | 'EXPRESSION_PARSE_FAILED'
  /** 跨字段 crossValidator 失败（实时触发或 validateForm 批量） */
  | 'CROSS_VALIDATION_FAILED'
  /** 跨字段 crossValidator 内部抛错（try/catch 捕获） */
  | 'CROSS_VALIDATOR_THREW'
  /** el-form.validate() 返回 false（字段内规则失败：required/pattern/validator callback） */
  | 'EL_FORM_VALIDATION_FAILED'
  /** 单字段错误（setFieldError 通用入口，不区分来源：realtime cross / 服务端 422） */
  | 'FIELD_ERROR'
  /** reaction watchEffect 内求值抛错 */
  | 'REACTION_EVAL_FAILED'
  /** XForm 挂载时 model prop 缺失 */
  | 'FORM_INSTANCE_NOT_READY'
  /** 节点引用了未在 components / EL_COMPONENT_MAP 中注册的组件名 */
  | 'UNKNOWN_COMPONENT'
  /** 节点 props 包含组件未声明的键（dev mode 拼写错误检测） */
  | 'UNKNOWN_COMPONENT_PROP'
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

/**
 * useFormErrorBus 返回值 —— 错误事件总线对外契约
 *
 * - events: 响应式事件列表（XFormErrorToast 消费）
 * - report: 上报入口（5s 内同 code+message 去重，force:true 跳过去重）
 * - dismiss / dismissAll / unreadCount: toast 关闭与未读数
 */
export interface UseFormErrorBusReturn {
  /** 错误事件列表（响应式） */
  events: Ref<FormErrorEvent[]>
  /**
   * 上报一条错误
   * - 默认行为：5 秒内同 code + message 去重（用户连续输入反复弹窗是噪音）
   * - `force: true`：跳过去重，用于用户主动 validate() / validateField() 调用场景
   *   （主动操作期望每次都收到反馈，不应被去重）
   */
  report(event: Omit<FormErrorEvent, 'id' | 'timestamp' | 'dismissed'> & { force?: boolean }): void
  /** 关闭单条 toast */
  dismiss(id: string): void
  /** 关闭全部 */
  dismissAll(): void
  /** 未读数（驱动右上角红点徽标） */
  unreadCount: Ref<number>
}

/**
 * report 入参类型（含可选 force 标志）
 * @see UseFormErrorBusReturn.report
 */
export type ReportErrorEventInput = Omit<FormErrorEvent, 'id' | 'timestamp' | 'dismissed'> & {
  force?: boolean
}

const MAX_EVENTS = 5
const DEDUPE_WINDOW_MS = 5_000

/** 创建一份 error bus（XForm 顶层调用一次） */
export function useFormErrorBus(): UseFormErrorBusReturn {
  const events = ref<FormErrorEvent[]>([])
  const dedupeCache = new Map<string, number>()

  function report(event: ReportErrorEventInput): void {
    const { force = false, ...eventData } = event
    // 同 code + message 在 5s 内去重 —— 用户连续输入反复弹窗是噪音
    // force: true 时跳过去重（用户主动 validate() / validateField() 调用场景）
    if (!force) {
      const dedupeKey = `${event.code}|${event.message}`
      const lastTs = dedupeCache.get(dedupeKey)
      if (lastTs && Date.now() - lastTs < DEDUPE_WINDOW_MS) {
        dedupeCache.set(dedupeKey, Date.now())
        return
      }
      dedupeCache.set(dedupeKey, Date.now())
    }

    const newEvent: FormErrorEvent = {
      ...eventData,
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
    if (eventData.details && eventData.details.length > 0) {
      const errorsMap: Record<
        string,
        Array<{ message: string; fieldValue: unknown; field: string }>
      > = {}
      for (const d of eventData.details) {
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
