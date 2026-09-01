<script setup lang="ts">
/**
 * XFormErrorToast —— user-facing 错误提示（OPT-7）
 *
 * 渲染 XFormErrorEvent 列表为右上角浮窗 toast：
 *   - dev 模式：弹出 OSD（on-screen display），无需打开 DevTools 即可感知错误
 *   - prod 模式：组件 v-if 隐藏（dev-only 渲染），保留 console + 上报点扩展位
 *
 * 与 XFormDebugBanner 的区别：
 *   - DebugBanner 聚焦 schema 校验错误 + 安全扫描（静态分析产物）
 *   - ErrorToast 聚焦运行时错误（crossValidator 失败 / 表达式解析失败 / 组件名无效等）
 */
import type { FormErrorEvent, FormErrorSeverity } from './composables/use-form-error-bus'

const { events, enabled } = defineProps<{
  events: FormErrorEvent[]
  /** 是否启用可视化（prod = false，仅 dev 弹窗） */
  enabled: boolean
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()

function severityIcon(s: FormErrorSeverity): string {
  switch (s) {
    case 'error':
      return '✕'
    case 'warn':
      return '⚠'
    default:
      return 'ℹ'
  }
}

/** 格式化字段值显示 —— 数组/对象用 JSON.stringify，长字符串截断 */
function formatValue(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') {
    return v.length > 24 ? `${v.slice(0, 24)}…` : v
  }
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v)
      return s.length > 24 ? `${s.slice(0, 24)}…` : s
    } catch {
      return '[unserializable]'
    }
  }
  return String(v)
}
</script>

<template>
  <Teleport to="body" v-if="enabled && events.length > 0">
    <ul :class="$style.stack" role="alert" aria-live="polite">
      <li
        v-for="e in events.filter((x) => !x.dismissed)"
        :key="e.id"
        :class="[$style.toast, $style[e.severity]]"
      >
        <span :class="$style.icon" aria-hidden="true">{{ severityIcon(e.severity) }}</span>
        <div :class="$style.body">
          <header :class="$style.title">
            <code :class="$style.code">{{ e.code }}</code>
            <span v-if="e.source" :class="$style.source">@{{ e.source }}</span>
          </header>
          <p :class="$style.message">{{ e.message }}</p>
          <ul v-if="e.details?.length" :class="$style.detailList">
            <li v-for="(d, i) in e.details" :key="i" :class="$style.detailItem">
              <code :class="$style.detailField">{{ d.field }}</code>
              <span :class="$style.detailMsg">{{ d.message }}</span>
              <span
                v-if="d.value !== undefined"
                :class="$style.detailValue"
                :title="`字段当前值：${JSON.stringify(d.value)}`"
              >
                = {{ formatValue(d.value) }}
              </span>
            </li>
          </ul>
          <p v-else-if="e.fields?.length" :class="$style.fields">
            字段：
            <code v-for="f in e.fields" :key="f">{{ f }}</code>
          </p>
        </div>
        <button
          type="button"
          :class="$style.close"
          :aria-label="`关闭 ${e.code}`"
          @click="emit('dismiss', e.id)"
        >
          ×
        </button>
      </li>
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
.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
  font-size: 13px;
  line-height: 1.5;
  animation: slideIn 180ms ease-out;
}
.error {
  border-left: 3px solid #ff4d4f;
}
.warn {
  border-left: 3px solid #faad14;
}
.info {
  border-left: 3px solid #1677ff;
}
.icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}
.error .icon {
  background: #ff4d4f;
}
.warn .icon {
  background: #faad14;
}
.info .icon {
  background: #1677ff;
}
.body {
  flex: 1;
  min-width: 0;
}
.title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
}
.code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  padding: 1px 5px;
  background: #f5f5f5;
  border-radius: 3px;
  color: #595959;
}
.source {
  font-size: 11px;
  color: #8c8c8c;
}
.message {
  margin: 0;
  color: #262626;
  word-break: break-word;
}
.fields {
  margin: 4px 0 0;
  font-size: 11px;
  color: #8c8c8c;
}
.fields code {
  background: #fafafa;
  padding: 1px 4px;
  border-radius: 3px;
  margin-right: 4px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.detailList {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detailItem {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  flex-wrap: wrap;
}
.detailField {
  background: #fafafa;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  color: #595959;
  flex-shrink: 0;
}
.detailMsg {
  color: #262626;
  word-break: break-word;
  flex: 1;
  min-width: 0;
}
.detailValue {
  color: #8c8c8c;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  background: #f5f5f5;
  padding: 1px 4px;
  border-radius: 3px;
  cursor: help;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #8c8c8c;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
  border-radius: 3px;
}
.close:hover {
  background: #f5f5f5;
  color: #262626;
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
