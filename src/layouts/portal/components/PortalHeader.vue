<script setup lang="ts">
// 门户头部：背景图 + 品牌区（logo + 标语）+ 导航区（菜单 + 当前用户）
// 整图规格：1920x180（src/layouts/portal/images/layout-head-bg.png），内容宽度 1400，在 1920 视口下左右各 260 留白
import { useUserStore } from '@/store/modules/user'
import { PORTAL_NAV } from '@/layouts/portal/config/nav'
import PortalNav from './PortalNav.vue'

const bem = createNamespace('portal-header')

const userStore = useUserStore()
</script>

<template>
  <header :class="bem.b()" role="banner">
    <div :class="bem.e('inner')">
      <a :class="bem.e('brand')" href="/" aria-label="省工贸安全监管和监测预警系统">
        <img
          :class="bem.e('logo')"
          src="@/layouts/portal/images/logo.png"
          alt=""
          width="671"
          height="80"
        />
      </a>
      <img
        :class="bem.e('slogan')"
        src="@/layouts/portal/images/biaoyu.png"
        alt=""
        width="252"
        height="80"
      />

      <nav :class="bem.e('nav')" aria-label="主导航">
        <PortalNav :items="PORTAL_NAV" />
        <div :class="bem.e('user')">
          <span :class="bem.e('avatar')">{{ userStore.profile?.name?.charAt(0) ?? '?' }}</span>
          <span :class="bem.e('name')">{{ userStore.profile?.name ?? '游客' }}</span>
          <span :class="bem.e('caret')" aria-hidden="true">▾</span>
        </div>
      </nav>
    </div>
  </header>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-portal-header {
  position: sticky;
  top: 0;
  z-index: var(--portal-z-index-header);
  width: 100%;
  height: var(--portal-header-h);
  background: url('@/layouts/portal/images/layout-head-bg.png') center bottom / 1920px 180px
    no-repeat;
  color: #fff;
  border-bottom: 1px solid var(--portal-divider);

  &__inner {
    position: relative;
    max-width: var(--portal-max-width);
    margin: 0 auto;
    height: 100%;
  }

  &__brand {
    position: absolute;
    top: 24px;
    left: 0;
    display: block;
    width: 671px;
    height: 80px;
  }

  &__logo {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__slogan {
    position: absolute;
    top: 24px;
    right: 0;
    width: 252px;
    height: 80px;
  }

  &__nav {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
  }

  &__avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 600;
  }

  &__name {
    color: rgba(255, 255, 255, 0.95);
  }

  &__caret {
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
  }
}
</style>
