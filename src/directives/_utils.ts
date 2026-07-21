/**
 * 指令通用工具（debounce + isFunction）
 *
 * 与具体指令解耦：inputDebounce / buttonDebounce 复用同一套 debounce 工具，
 * 保证项目内防抖/节流行为一致。
 *
 * 注意：debounce 是 trailing edge 实现（最后次触发后 delay 才执行），
 * buttonDebounce 若需 leading edge 行为（首次立即执行），需自己实现。
 */

/** 通用事件处理函数类型 */
type EventHandler = (this: HTMLElement, event: Event) => void

/**
 * 防抖函数工厂
 *
 * @param click 待调用的实际事件处理函数
 * @param timeout 延迟（毫秒）
 * @returns 包装后的 debounced 函数（与 click 签名一致）
 *
 * 行为：trailing edge 防抖——每次调用清除上次的 timer，重新计时，
 *       只在 timeout 内最后一次调用延迟结束才执行 click。
 */
export function debounce(click: EventHandler, timeout: number): EventHandler {
  let timer: ReturnType<typeof setTimeout> | undefined
  return function (this: HTMLElement, event: Event) {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    timer = setTimeout(() => {
      click.call(this, event)
      timer = undefined
    }, timeout)
  }
}

/**
 * 类型守卫：判断参数是否为函数
 */
export function isFunction(param: unknown): param is (...args: unknown[]) => unknown {
  return Object.prototype.toString.call(param) === '[object Function]'
}
