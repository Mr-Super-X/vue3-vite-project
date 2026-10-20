<script setup lang="ts">
/**
 * 产品特性区（id=features）：3 卡线性图标布局。
 *
 * 设计：卡片标题/描述来自 `config/site.ts`（SITE_FEATURES）；
 * 图标是呈现细节，用编译期解析的静态 `<i-tabler-* />` 标签写在模板里（3 卡逐张展开），
 * 不进 config、不做运行时 name→组件映射（virtual:icons 在 vitest 不可解析，静态标签测试安全）。
 *
 * @see [`../config/site.ts`](../config/site.ts) SITE_FEATURES 数据单源
 * @group 业务模块：Home
 */
import { SITE_FEATURES, SITE_FEATURES_HEADING } from '../config/site'

const bem = createNamespace('site-features')
</script>

<template>
  <section id="features" :class="bem.b()">
    <div :class="bem.e('inner')">
      <h2 :class="bem.e('heading')">{{ SITE_FEATURES_HEADING }}</h2>
      <div :class="bem.e('grid')">
        <article :class="bem.e('card')">
          <i-tabler-chart-line :class="bem.e('icon')" aria-hidden="true" />
          <h3 :class="bem.e('title')">{{ SITE_FEATURES[0].title }}</h3>
          <p :class="bem.e('desc')">{{ SITE_FEATURES[0].desc }}</p>
        </article>
        <article :class="bem.e('card')">
          <i-tabler-shield-lock :class="bem.e('icon')" aria-hidden="true" />
          <h3 :class="bem.e('title')">{{ SITE_FEATURES[1].title }}</h3>
          <p :class="bem.e('desc')">{{ SITE_FEATURES[1].desc }}</p>
        </article>
        <article :class="bem.e('card')">
          <i-tabler-cloud-computing :class="bem.e('icon')" aria-hidden="true" />
          <h3 :class="bem.e('title')">{{ SITE_FEATURES[2].title }}</h3>
          <p :class="bem.e('desc')">{{ SITE_FEATURES[2].desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-site-features {
  background: var(--portal-bg-alt);

  &__inner {
    max-width: var(--portal-max-width);
    margin: 0 auto;
    padding: 96px 24px;
  }

  &__heading {
    font-size: 32px;
    font-weight: 700;
    color: var(--portal-ink);
    margin: 0 0 48px;
    text-align: center;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  &__card {
    background: var(--portal-bg);
    border: 1px solid var(--portal-line);
    border-radius: 8px;
    padding: 40px 32px;
    transition: border-color 0.2s ease;

    &:hover {
      border-color: var(--portal-ink);
    }
  }

  &__icon {
    font-size: 36px;
    color: var(--portal-ink);
    display: inline-block;
    margin-bottom: 24px;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: var(--portal-ink);
    margin: 0 0 12px;
  }

  &__desc {
    font-size: 14px;
    line-height: 1.8;
    color: var(--portal-ink-2);
    margin: 0;
  }

  @media (max-width: 900px) {
    &__grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
