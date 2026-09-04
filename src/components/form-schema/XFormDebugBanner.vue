<script setup lang="ts">
/**
 * XFormDebugBanner —— Dev-only debug banner
 *
 * 显示 schema 校验错误与安全扫描结果，浮动在右下角，可折叠；点 X 关闭整个 banner。
 */
import { ref, computed } from 'vue'

interface ValidationError {
  keyPath: (string | number)[]
  message: string
}

const props = defineProps<{
  validateErrors: ValidationError[]
  forbiddenErrors: string[]
}>()

const collapsed = ref(false)
const dismissed = ref(false)

const total = computed(() => props.validateErrors.length + props.forbiddenErrors.length)
const visible = computed(() => !dismissed.value && total.value > 0)
</script>

<template>
  <Teleport to="body" v-if="visible">
    <div v-if="!collapsed" :class="$style.panel" role="alert">
      <header :class="$style.header">
        <strong>XForm 调试面板（{{ total }} 项问题）</strong>
        <span :class="$style.actions">
          <button type="button" :class="$style.btn" @click="collapsed = true">收起</button>
          <button type="button" :class="$style.btn" aria-label="关闭" @click="dismissed = true">
            ×
          </button>
        </span>
      </header>
      <ul :class="$style.list">
        <li v-for="(e, i) in validateErrors" :key="`v${i}`" :class="$style.item">
          <code>{{ e.keyPath.join('.') || '(root)' }}</code>
          : {{ e.message }}
        </li>
        <li v-for="(e, i) in forbiddenErrors" :key="`f${i}`" :class="$style.item">
          <code>{{ e }}</code>
        </li>
      </ul>
    </div>
    <button
      v-else
      type="button"
      :class="$style.fab"
      :aria-label="`XForm 调试面板 ${total} 项问题`"
      @click="collapsed = false"
    >
      ⚠ XForm 调试 ({{ total }})
    </button>
  </Teleport>
</template>

<style module>
.panel {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: 50vh;
  overflow: auto;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
  font-size: 13px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #ffe58f;
  background: #fff7c2;
}
.actions {
  display: flex;
  gap: 4px;
}
.btn {
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
}
.btn:hover {
  background: #f5f5f5;
}
.list {
  margin: 0;
  padding: 8px 12px;
  list-style: none;
}
.item {
  padding: 4px 0;
  border-bottom: 1px dashed #ffeeba;
  word-break: break-all;
}
.item:last-child {
  border-bottom: none;
}
.item code {
  background: #fff7c2;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 12px;
  margin-right: 4px;
}
.fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  background: #faad14;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgb(0 0 0 / 16%);
  z-index: 9999;
}
.fab:hover {
  background: #d48806;
}
</style>
