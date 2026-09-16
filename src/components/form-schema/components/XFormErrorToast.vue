<script setup lang="ts">
/**
 * XFormErrorToast —— user-facing 错误提示容器
 *
 * 渲染 XFormErrorEvent 列表为右上角浮窗 toast：
 * - 由 XForm 的 showErrorToast prop 控制（enabled=true 时渲染）——
 *   默认关闭、显式传参开启，与运行环境（dev/prod）无关
 * - 关闭时 errorBus 仍保留 console 留痕 + prod 上报点扩展位，仅可视化层不渲染
 *
 * 与 XFormDebugBanner 的区别：
 * - DebugBanner 聚焦 schema 校验错误 + 安全扫描（静态分析产物）
 * - ErrorToast 聚焦运行时错误（crossValidator 失败 / 表达式解析失败 / 组件名无效等）
 *
 * a11y 决策（以代码为准）：
 * - 模板使用 `role="alert" aria-live="polite"`
 * - role="alert" 隐式 aria-live="assertive"，
 *   但显式声明的 aria-live="polite" 会**覆盖**默认值
 * - 采用 polite 让屏阅读器在当前朗读**停顿时**才播报新 toast，
 *   适合持续 toast 流（不会反复打断用户正在听的菜单项）
 * - 若业务希望"立即打断"，可通过 toastContainer slot 替换容器
 *
 * @group XForm 组件
 */
import { computed } from 'vue'
import type { FormErrorEvent } from '../composables/use-form-error-bus'
import XFormErrorToastItem from './XFormErrorToastItem.vue'

const { events, enabled } = defineProps<{
  events: FormErrorEvent[]
  /** 是否启用可视化 —— 由 XForm 的 showErrorToast prop 控制（默认关闭） */
  enabled: boolean
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()

/**
 * 未 dismiss 的事件 —— computed 缓存避免 v-for 内 filter 每次 patch 重复执行
 *
 * 短路优化：events 全部 dismissed 时直接返回同长度 0 数组,减少下游 v-for diff 成本
 */
const visibleEvents = computed(() =>
  events.some((e) => !e.dismissed) ? events.filter((e) => !e.dismissed) : []
)
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
