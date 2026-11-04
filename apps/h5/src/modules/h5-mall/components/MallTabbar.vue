<script setup lang="ts">
// ref / computed 由 unplugin-auto-import 注入（CLAUDE.md §1.6）
import { MALL_TABS } from '../config/mall'

/**
 * 底部 Tabbar（fixed，宽屏限宽与 rem 面板同宽）。
 * 原型阶段仅切换选中态；购物袋角标由父级 cartCount 驱动（>99 显示 99+）。
 */
const bem = createNamespace('mall-tabbar')

defineProps<{
  cartCount: number
}>()

const activeKey = ref('home')

const badgeText = (n: number): string => (n > 99 ? '99+' : `${n}`)
</script>

<template>
  <nav :class="bem.b()" aria-label="底部导航">
    <a
      v-for="tab in MALL_TABS"
      :key="tab.key"
      href="#"
      :class="bem.e('tab')"
      :aria-current="tab.key === activeKey ? 'page' : undefined"
      @click.prevent="activeKey = tab.key"
    >
      <span :class="bem.e('ic')">
        <svg :class="bem.e('tic')" aria-hidden="true"><use :href="`#mall-i-${tab.icon}`" /></svg>
      </span>
      {{ tab.label }}
      <span v-if="tab.key === 'bag' && cartCount > 0" :class="bem.e('cartn')">
        {{ badgeText(cartCount) }}
      </span>
    </a>
  </nav>
</template>

<style lang="scss">
// 本文件在 postcss-pxtorem 转换范围内（src/modules/h5-mall/），直接写 828 设计稿 px
// max-width 828 稿 px = 10rem → 运行时恰为 rem 面板宽 min(视口, 540px)，与 layouts/h5 限宽对齐
.#{$BEM_PREFIX}-mall-tabbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  z-index: 60;
  display: flex;
  width: 100%;
  max-width: 828px;
  padding: 18px 18px calc(18px + env(safe-area-inset-bottom));
  background: var(--mall-bg-card);
  border-top: 1px solid var(--mall-line);
  transform: translateX(-50%);

  &__tab {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 9px 0;
    font-size: 28px;
    color: var(--mall-ink-3);
    border-radius: var(--mall-r-sm);
    transition: color var(--mall-dur) var(--mall-ease);

    &[aria-current='page'] {
      color: var(--mall-brand-deep);
    }
  }

  &__ic {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 97px;
    height: 62px;
    border-radius: var(--mall-r-lg);
    transition: background var(--mall-dur) var(--mall-ease);

    .#{$BEM_PREFIX}-mall-tabbar__tab[aria-current='page'] & {
      background: var(--mall-brand-soft);
    }
  }

  &__tic {
    width: 46px;
    height: 46px;
  }

  &__cartn {
    position: absolute;
    top: 0;
    right: calc(50% - 49px);
    min-width: 35px;
    height: 35px;
    padding: 0 9px;
    font-size: 24px;
    line-height: 35px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--mall-on-brand);
    background: var(--mall-brand-deep);
    border-radius: 18px;
  }
}
</style>
