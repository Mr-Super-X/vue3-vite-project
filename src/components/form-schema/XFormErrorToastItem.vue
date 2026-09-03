<script setup lang="ts">
/**
 * XFormErrorToastItem —— 单条错误 toast 卡片
 *
 * 单条 toast 是纯展示组件（props.event + emits.dismiss），无状态。template 结构 + style class 名 + event payload 透传均与拆分前一致。
 */
import type { FormErrorEvent, FormErrorSeverity } from './composables/use-form-error-bus'

defineProps<{
  event: FormErrorEvent
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

/**
 * 安全 JSON 序列化 —— 不可序列化值（循环引用等）返回 null 占位
 *
 * 与 formatValue 不同：保留完整字符串，不截断（用于 tooltip 显示原值）。
 *
 * 修复背景：循环引用对象（如 backend 错误 detail.value 含 self-ref）会抛 TypeError，
 * 此前的 :title 属性无 try/catch 导致整 toast 渲染崩溃。
 */
function tryJsonStringify(v: unknown): string | null {
  try {
    return JSON.stringify(v)
  } catch {
    return null
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
    const s = tryJsonStringify(v)
    if (s === null) return '[unserializable]'
    return s.length > 24 ? `${s.slice(0, 24)}…` : s
  }
  return String(v)
}
</script>

<template>
  <li :class="[$style.toast, $style[event.severity]]">
    <span :class="$style.icon" aria-hidden="true">{{ severityIcon(event.severity) }}</span>
    <div :class="$style.body">
      <header :class="$style.title">
        <code :class="$style.code">{{ event.code }}</code>
        <span v-if="event.source" :class="$style.source">@{{ event.source }}</span>
      </header>
      <p :class="$style.message">{{ event.message }}</p>
      <ul v-if="event.details?.length" :class="$style.detailList">
        <li v-for="(d, i) in event.details" :key="i" :class="$style.detailItem">
          <code :class="$style.detailField">{{ d.field }}</code>
          <span :class="$style.detailMsg">{{ d.message }}</span>
          <span
            v-if="d.value !== undefined"
            :class="$style.detailValue"
            :title="`字段当前值：${tryJsonStringify(d.value) ?? '[unserializable]'}`"
          >
            = {{ formatValue(d.value) }}
          </span>
        </li>
      </ul>
      <p v-else-if="event.fields?.length" :class="$style.fields">
        字段：
        <code v-for="f in event.fields" :key="f">{{ f }}</code>
      </p>
    </div>
    <button
      type="button"
      :class="$style.close"
      :aria-label="`关闭 ${event.code}`"
      @click="emit('dismiss', event.id)"
    >
      ×
    </button>
  </li>
</template>

<style module>
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
