import { ref, onMounted, onUnmounted, type Ref } from 'vue'

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

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', update)
    }
  })

  return current
}
