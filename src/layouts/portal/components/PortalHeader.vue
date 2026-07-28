<script setup lang="ts">
// 门户头部：背景图 + 品牌区（logo + 标语）+ 导航区（菜单 + 当前用户）
// 整图规格：1920x180（src/layouts/portal/images/layout-head-bg.png），内容宽度 1400，在 1920 视口下左右各 260 留白
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { PORTAL_NAV } from '@/layouts/portal/config/nav'
import type { PortalNavItem } from '@/layouts/portal/config/types'

const userStore = useUserStore()
const route = useRoute()

const navItems = computed<PortalNavItem[]>(() =>
  PORTAL_NAV.map((item) => ({ ...item, active: item.path === route.path }))
)
</script>

<template>
  <header class="portal-header" role="banner">
    <div class="portal-header__inner">
      <a class="portal-header__brand" href="/" aria-label="省工贸安全监管和监测预警系统">
        <img
          class="portal-header__logo"
          src="@/layouts/portal/images/logo.png"
          alt=""
          width="671"
          height="80"
        />
      </a>
      <img
        class="portal-header__slogan"
        src="@/layouts/portal/images/biaoyu.png"
        alt=""
        width="252"
        height="80"
      />

      <nav class="portal-header__nav" aria-label="主导航">
        <ul class="portal-header__menu">
          <li
            v-for="item in navItems"
            :key="item.key"
            :class="['portal-header__item', { active: item.active }]"
          >
            <a :href="item.path">{{ item.label }}</a>
            <span v-if="item.active" class="portal-header__indicator" aria-hidden="true" />
          </li>
        </ul>
        <div class="portal-header__user">
          <span class="portal-header__avatar">{{ userStore.profile?.name?.charAt(0) ?? '?' }}</span>
          <span class="portal-header__name">{{ userStore.profile?.name ?? '游客' }}</span>
          <span class="portal-header__caret" aria-hidden="true">▾</span>
        </div>
      </nav>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.portal-header {
  width: 100%;
  height: var(--portal-header-h);
  background: url('@/layouts/portal/images/layout-head-bg.png') center bottom / 1920px 180px
    no-repeat;
  color: #fff;

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
    border-top: 1px solid var(--portal-divider);
  }

  &__menu {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__item {
    position: relative;
    height: 44px;
    line-height: 44px;
    margin-right: 80px;
    font-size: 20px;
    font-family: 'PingFang SC', 'Alibaba PuHuiTi', sans-serif;

    &:last-child {
      margin-right: 0;
    }

    a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: color 0.2s;
    }

    &.active a {
      color: #fff;
      font-weight: 500;
    }

    &:hover a {
      color: #fff;
    }
  }

  &__indicator {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: #fff;
    transform: translateX(-50%);
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
