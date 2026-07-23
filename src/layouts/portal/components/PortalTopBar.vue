<script setup lang="ts">
// 顶部蓝 banner：全宽渐变背景 + 中央收窄内容区，静态展示无外部数据
</script>

<template>
  <div class="portal-top-bar">
    <div class="portal-top-bar__inner">
      <div class="portal-top-bar__brand">
        <div class="portal-top-bar__emblem" aria-hidden="true">徽</div>
        <div class="portal-top-bar__title-wrap">
          <h1 class="portal-top-bar__title">省工贸安全监管和监测预警系统</h1>
          <p class="portal-top-bar__subtitle">
            Provincial industrial and trade safety supervision and monitoring and early warning
            system
          </p>
        </div>
      </div>
      <div class="portal-top-bar__slogans" aria-hidden="true">
        <div class="portal-top-bar__slogan">对党忠诚 纪律严明</div>
        <div class="portal-top-bar__slogan">赴汤蹈火 竭诚为民</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.portal-top-bar {
  background: linear-gradient(135deg, var(--banner-grad-from) 0%, var(--banner-grad-to) 100%);
  color: #fff;
  height: var(--portal-banner-h);

  &__inner {
    max-width: var(--portal-max-width);
    margin: 0 auto;
    height: 100%;
    padding: 0 var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__emblem {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #d23a3a;
    display: grid;
    place-items: center;
    font-weight: bold;
  }

  &__title {
    font-size: 26px;
    margin: 0;
  }

  &__subtitle {
    font-size: 12px;
    opacity: 0.8;
    margin: 4px 0 0;
  }

  &__slogans {
    text-align: right;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.6;
  }
}
</style>
