<script setup lang="ts">
/**
 * XFormErrorToastItem —— 单条错误 toast 卡片
 *
 * 纯展示组件（props.event + emits.dismiss），无状态。
 * 值格式化抽离到 utils/format-error-value.ts 以便单测与复用。
 *
 * 优化（2026-09-16 review）：details 的值元数据（display/tooltip）经 computed 预计算，
 * 原模板在 :title 与插值处各调一次 getValueMeta —— 同一值重复 JSON.stringify。
 * 现 display/tooltip 共享同一 ValueMeta，兑现「同一对象只 stringify 一次」的约定。
 *
 * @group XForm 组件
 */
import type { FormErrorEvent, FormErrorSeverity } from '../composables/use-form-error-bus'
import { getValueMeta, type ValueMeta } from '../utils/format-error-value'
// computed 由 unplugin-auto-import 注入（CLAUDE.md §1.6）

const props = defineProps<{
  event: FormErrorEvent
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()

/** 严重等级 → 图标查表 —— 比 switch 更纯，值命中 */
const SEVERITY_ICONS: Readonly<Record<FormErrorSeverity, string>> = {
  error: '✕',
  warn: '⚠',
  info: 'ℹ',
}

/**
 * details + 值元数据预计算 —— 每次 events 变化仅序列化一次
 *
 * meta 为 undefined 表示该 detail 无 value 字段（与原模板 v-if="d.value !== undefined" 判定一致）
 */
interface DetailWithMeta {
  field: string
  message: string
  meta: ValueMeta | undefined
}

const detailsWithMeta = computed<DetailWithMeta[]>(() =>
  (props.event.details ?? []).map((d) => ({
    field: d.field,
    message: d.message,
    meta: d.value !== undefined ? getValueMeta(d.value) : undefined,
  }))
)
</script>

<template>
  <li :class="[$style.toast, $style[event.severity]]">
    <span :class="$style.icon" aria-hidden="true">{{ SEVERITY_ICONS[event.severity] }}</span>
    <div :class="$style.body">
      <header :class="$style.title">
        <code :class="$style.code">{{ event.code }}</code>
        <span v-if="event.source" :class="$style.source">@{{ event.source }}</span>
      </header>
      <p :class="$style.message">{{ event.message }}</p>
      <ul v-if="detailsWithMeta.length" :class="$style.detailList">
        <!-- d.field 在 schema 校验中唯一，作为 :key 比 index 更稳定 -->
        <li v-for="(d, i) in detailsWithMeta" :key="d.field ?? i" :class="$style.detailItem">
          <code :class="$style.detailField">{{ d.field }}</code>
          <span :class="$style.detailMsg">{{ d.message }}</span>
          <span v-if="d.meta" :class="$style.detailValue" :title="`字段当前值：${d.meta.tooltip}`">
            = {{ d.meta.display }}
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
