/**
 * useConsoleCapture —— 在组件生命周期内捕获 console.error / console.warn
 *
 * 应用场景：错误诊断 demo 让用户能"在页面上"看到 XForm 触发的警告，不必打开 DevTools
 *
 * 设计原则：
 * - 强约束：onMounted hook、onUnmounted 还原原始 console 方法（避免污染全局）
 * - 上限：内存保留最近 50 条（FIFO），单条 500 字截断（防内存爆 / 防页面卡顿）
 * - 过滤：可选 prefix 仅捕获包含此前缀的日志（XForm 内部统一以 "[XForm]" 起头）
 * - 单一职责：只捕获 + 暴露数据，渲染由调用方决定（用 ConsoleLogPanel）
 *
 * 使用：
 * ```ts
 * const { logs, clear } = useConsoleCapture('[XForm]')
 * ```
 */
import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export interface CapturedLog {
  level: 'error' | 'warn'
  message: string
  timestamp: number
}

const MAX_LOGS = 50
const MAX_MSG_LENGTH = 500

export interface UseConsoleCaptureReturn {
  /** reactive 日志数组，按时间顺序（FIFO 丢弃超出） */
  logs: Ref<CapturedLog[]>
  /** 清空 logs */
  clear: () => void
}

export function useConsoleCapture(prefix?: string): UseConsoleCaptureReturn {
  const logs = ref<CapturedLog[]>([])

  // 闭包内保存原始引用（避免多个实例互相覆盖）
  const originalError = console.error.bind(console)
  const originalWarn = console.warn.bind(console)

  function stringify(v: unknown): string {
    if (typeof v === 'string') return v
    if (v instanceof Error) return v.message
    try {
      return JSON.stringify(v) ?? String(v)
    } catch {
      return String(v)
    }
  }

  function capture(level: 'error' | 'warn', ...args: unknown[]): void {
    const message = args.map(stringify).join(' ')
    if (prefix && !message.includes(prefix)) return

    const truncated =
      message.length > MAX_MSG_LENGTH ? `${message.slice(0, MAX_MSG_LENGTH)}...[已截断]` : message

    logs.value.push({ level, message: truncated, timestamp: Date.now() })
    if (logs.value.length > MAX_LOGS) {
      logs.value.splice(0, logs.value.length - MAX_LOGS)
    }
  }

  onMounted(() => {
    console.error = (...args: unknown[]) => {
      capture('error', ...args)
      originalError(...args)
    }
    console.warn = (...args: unknown[]) => {
      capture('warn', ...args)
      originalWarn(...args)
    }
  })

  onUnmounted(() => {
    console.error = originalError
    console.warn = originalWarn
  })

  function clear(): void {
    logs.value = []
  }

  return { logs, clear }
}
