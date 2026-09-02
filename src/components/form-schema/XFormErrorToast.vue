<script setup lang="ts">
/**
 * XFormErrorToast —— user-facing 错误提示容器（P2-1 拆分后主文件）
 *
 * 渲染 XFormErrorEvent 列表为右上角浮窗 toast：
 *   - dev 模式：弹出 OSD（on-screen display），无需打开 DevTools 即可感知错误
 *   - prod 模式：组件 v-if 隐藏（dev-only 渲染），保留 console + 上报点扩展位
 *
 * 与 XFormDebugBanner 的区别：
 *   - DebugBanner 聚焦 schema 校验错误 + 安全扫描（静态分析产物）
 *   - ErrorToast 聚焦运行时错误（crossValidator 失败 / 表达式解析失败 / 组件名无效等）
 *
 * P2-1 拆分：单条 toast 卡片渲染抽到 ./XFormErrorToastItem.vue
 * 本文件仅承载容器（Teleport + ul 列表 + stack 定位样式）。
 */
import type { FormErrorEvent } from './composables/use-form-error-bus'
import XFormErrorToastItem from './XFormErrorToastItem.vue'

const { events, enabled } = defineProps<{
  events: FormErrorEvent[]
  /** 是否启用可视化（prod = false，仅 dev 弹窗） */
  enabled: boolean
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()
</script>

<template>
  <Teleport to="body" v-if="enabled && events.length > 0">
    <ul :class="$style.stack" role="alert" aria-live="polite">
      <XFormErrorToastItem
        v-for="e in events.filter((x) => !x.dismissed)"
        :key="e.id"
        :event="e"
        @dismiss="emit('dismiss', $event)"
      />
    </ul>
  </Teleport>
</template>

<style module>
.stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9998;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 420px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
