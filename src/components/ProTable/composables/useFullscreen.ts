/**
 * useFullscreen —— ProTable 全屏切换（v3.1 新增）。
 *
 * 角色：表格容器级全屏状态管理。采用 CSS fixed 遮罩方案（而非 Fullscreen API）：
 * - 优点：跨浏览器行为一致；z-index 层级可控（不会盖过 el-dialog 遮罩的极端场景可调）；
 *   退出方式多样（按钮 / Esc / 编排层程序化）
 * - 配合 ProTable.vue 根容器 `is-fullscreen` class（position: fixed; inset: 0）
 *
 * Esc 退出：全屏激活时监听 window keydown，退出后移除监听（onScopeDispose 兜底清理）。
 *
 * @see [`../ProTable.vue`](../ProTable.vue) 编排层 —— 唯一调用方（class 绑定 + TableHeader 按钮）
 * @group ProTable composables
 */
import { ref, watch, onScopeDispose, type Ref } from 'vue' // vue（生命周期/底层 API）

export interface UseFullscreenReturn {
  isFullscreen: Ref<boolean>
  toggleFullscreen: () => void
  exitFullscreen: () => void
}

export function useFullscreen(): UseFullscreenReturn {
  const isFullscreen = ref(false)

  /** Esc 退出 —— 仅在全屏激活期间监听，退出即移除 */
  function handleEsc(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') isFullscreen.value = false
  }

  // flush: 'sync'：监听注册与状态变更同步 —— 全屏激活后立即按 Esc 可退出
  // （默认 'pre' 推迟到下次渲染前，存在"切换后瞬间 Esc 未监听"的竞态窗口）
  watch(
    isFullscreen,
    (active) => {
      if (active) {
        window.addEventListener('keydown', handleEsc)
      } else {
        window.removeEventListener('keydown', handleEsc)
      }
    },
    { flush: 'sync' }
  )

  // 组件卸载兜底：激活状态下直接卸载会泄漏 window 监听（路由跳走场景）
  onScopeDispose(() => {
    window.removeEventListener('keydown', handleEsc)
  })

  function toggleFullscreen(): void {
    isFullscreen.value = !isFullscreen.value
  }

  function exitFullscreen(): void {
    isFullscreen.value = false
  }

  return { isFullscreen, toggleFullscreen, exitFullscreen }
}
