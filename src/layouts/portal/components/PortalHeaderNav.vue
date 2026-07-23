<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { PORTAL_NAV } from '@/portal/config/nav'
import type { PortalNavItem } from '@/portal/config/types'

const userStore = useUserStore()
const route = useRoute()

const navItems = computed<PortalNavItem[]>(() =>
  PORTAL_NAV.map((item) => ({ ...item, active: item.path === route.path }))
)
</script>

<template>
  <nav class="portal-header-nav">
    <div class="portal-header-nav__inner">
      <ul class="portal-header-nav__menu">
        <li
          v-for="item in navItems"
          :key="item.key"
          :class="['portal-header-nav__item', { active: item.active }]"
        >
          <a :href="item.path">{{ item.label }}</a>
        </li>
      </ul>
      <div class="portal-header-nav__user">
        <span class="portal-header-nav__avatar">
          {{ userStore.profile?.name?.charAt(0) ?? '?' }}
        </span>
        <span class="portal-header-nav__name">
          {{ userStore.profile?.name ?? '游客' }}
        </span>
        <span class="portal-header-nav__caret">▾</span>
      </div>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.portal-header-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  height: var(--portal-header-h);

  &__inner {
    max-width: var(--portal-max-width);
    margin: 0 auto;
    height: 100%;
    padding: 0 var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__menu {
    display: flex;
    gap: 32px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__item {
    font-size: 16px;

    a {
      color: #303133;
      text-decoration: none;
    }

    &.active a {
      color: var(--el-color-primary);
      font-weight: 600;
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  &__avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #409eff;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 600;
  }
}
</style>
