<script setup lang="ts">
import { ElMessage } from 'element-plus'

// 占位逻辑：本次不接入真实 AI；点击提示即将上线
function onClick(): void {
  ElMessage.info('AI 助手即将上线')
}
</script>

<template>
  <button type="button" class="portal-ai-widget" aria-label="打开 AI 助手" @click="onClick">
    <span class="portal-ai-widget__icon" aria-hidden="true">🤖</span>
    <span class="portal-ai-widget__label">
      <span class="portal-ai-widget__name">小安智能</span>
      <span class="portal-ai-widget__hint">你可以对我说本月全省检查合计是多少？</span>
    </span>
  </button>
</template>

<style lang="scss" scoped>
.portal-ai-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  cursor: pointer;

  &__icon {
    font-size: 20px;
  }

  &__label {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.2;
  }

  &__name {
    font-size: 12px;
    color: #303133;
    font-weight: 600;
  }

  &__hint {
    font-size: 10px;
    color: #909399;
  }
}
</style>
