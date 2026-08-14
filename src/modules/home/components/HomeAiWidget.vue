<script setup lang="ts">
// 首页 AI 助手挂件：右下角悬浮气泡，提示文案 + 触发提示
// ElMessage 由 unplugin-auto-import 注入（importStyle 自动带样式，勿显式 import）
function onClick(): void {
  ElMessage.info('AI 助手即将上线')
}
</script>

<template>
  <button type="button" class="home-ai" aria-label="打开 AI 助手" @click="onClick">
    <span class="home-ai__robot" aria-hidden="true">🤖</span>
    <span class="home-ai__copy">
      <span class="home-ai__title">小安智能</span>
      <span class="home-ai__hint">你可以对我说本月全省检查合计是多少？</span>
    </span>
  </button>
</template>

<style lang="scss" scoped>
.home-ai {
  position: fixed;
  right: 24px;
  bottom: 96px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 12px 12px;
  background: #fff;
  border: none;
  border-radius: 4px;
  box-shadow: 4px 4px 16px 0 rgba(0, 0, 0, 0.05);
  cursor: pointer;
  text-align: left;

  &__robot {
    font-size: 32px;
    width: 40px;
    height: 42px;
    display: grid;
    place-items: center;
  }

  &__copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    max-width: 128px;
  }

  &__title {
    font-size: 14px;
    color: #000;
    font-weight: 500;
    line-height: 22px;
  }

  &__hint {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.88);
    line-height: 16px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>
