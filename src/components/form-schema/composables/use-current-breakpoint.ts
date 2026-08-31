import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { throttle } from 'lodash-es'

/** resize 事件节流间隔：断点只有 6 档，高频 resize 逐帧更新是浪费 */
const RESIZE_THROTTLE_MS = 100

/** element-plus 标准 5 档断点 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** 断点阈值(单位 px)—— element-plus 默认值 */
const BREAKPOINTS: Array<[Breakpoint, number]> = [
  ['xl', 1920],
  ['lg', 1200],
  ['md', 992],
  ['sm', 768],
]

/**
 * 监听 window.innerWidth 变化,返回当前断点(xs/sm/md/lg/xl)
 *
 * 设计:
 * - SSR 安全:服务端没有 window,返回 'md'(中位断点)默认值
 * - onMounted 注册 resize 监听,onUnmounted 移除(无副作用)
 * - 断点计算:element-plus 默认阈值(与 docs 一致)
 *
 * 用法:
 * ```ts
 * const bp = useCurrentBreakpoint()
 * watch(bp, () => console.log('断点变化:', bp.value))
 * ```
 */
export function useCurrentBreakpoint(): Ref<Breakpoint> {
  const current = ref<Breakpoint>('md')

  const update = () => {
    if (typeof window === 'undefined') return
    const width = window.innerWidth
    for (const [bp, min] of BREAKPOINTS) {
      if (width >= min) {
        current.value = bp
        return
      }
    }
    // 低于 sm(768px)即 xs
    current.value = 'xs'
  }

  // resize 走节流版；挂载时的首次 update() 保持同步（保证首帧断点正确）
  const throttledUpdate = throttle(update, RESIZE_THROTTLE_MS)

  onMounted(() => {
    update()
    window.addEventListener('resize', throttledUpdate)
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', throttledUpdate)
      throttledUpdate.cancel() // 清掉 trailing 待执行，避免卸载后还写 ref
    }
  })

  return current
}
