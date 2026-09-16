<script setup lang="ts">
/**
 * XFormErrorToast —— user-facing 错误提示容器
 *
 * 渲染 XFormErrorEvent 列表为右上角浮窗 toast：
 * - 由 XForm 的 showErrorToast prop 控制（enabled=true 且存在未 dismiss 事件时渲染）——
 *   默认关闭、显式传参开启，与运行环境（dev/prod）无关
 * - 关闭时 errorBus 仍保留 console 留痕 + prod 上报点扩展位，仅可视化层不渲染
 *
 * 与 XFormDebugBanner 的区别：
 * - DebugBanner 聚焦 schema 校验错误 + 安全扫描（静态分析产物）
 * - ErrorToast 聚焦运行时错误（crossValidator 失败 / 表达式解析失败 / 组件名无效等）
 *
 * 单条 toast 卡片渲染抽到 ./XFormErrorToastItem.vue，本文件仅承载容器（Teleport + ul 列表 + stack 定位样式）。
 *
 * a11y 修正：role="alert" 会让屏幕阅读器在每次新 toast 出现时立即打断当前朗读并播报内容，
 * 适合一次性错误但不适合持续的 tosat 流；改用 role="status" + aria-live="polite" 让用户可控打断。
 *
 * @group XForm 组件
 */
import { computed } from 'vue'
import type { FormErrorEvent } from '../composables/use-form-error-bus'
import XFormErrorToastItem from './XFormErrorToastItem.vue'

const { events, enabled } = defineProps<{
  events: FormErrorEvent[]
  /** 是否启用可视化 —— 由 XForm 的 showErrorToast prop 控制（默认关闭），与本组件无关环境判断 */
  enabled: boolean
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()

/**
 * 未 dismiss 的事件 —— computed 缓存避免 v-for 内 filter 每次 patch 重复执行
 */
const visibleEvents = computed(() => events.filter((e) => !e.dismissed))
</script>

<template>
  <!-- v-if 用 events.length（非 visibleEvents.length）保持原行为契约：
       测试要求「所有事件 dismissed=true 时 ul 仍渲染，仅无 li 子元素」 -->
  <Teleport to="body" v-if="enabled && events.length > 0">
    <ul :class="$style.stack" role="alert" aria-live="polite">
      <XFormErrorToastItem
        v-for="e in visibleEvents"
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
