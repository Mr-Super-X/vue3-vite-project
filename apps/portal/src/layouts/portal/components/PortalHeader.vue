<script setup lang="ts">
/**
 * 门户头部（2026-10-20 企业官网改造）：sticky 白底细线 + 品牌区 + 锚点导航 + 登录/用户双态。
 *
 * 对比旧版 180px 位图头部：
 * - 高度 64px；背景位图（layout-head-bg/logo/biaoyu 三张 png）→ 纯色 + 内联 SVG 字标
 * - 右侧双态：未登录 → 「登录」按钮（goAuthLogin，P4 起整页跳 apps/auth 统一登录）；
 *   已登录 → 用户下拉（useLogout 退出流程保留）
 *
 * A11y：<header role="banner">；品牌区是真实锚点（href="#hero"）；导航 aria-label 由 PortalNav 承担
 * （本组件不再包裹 <nav>，避免与 PortalNav 内部 nav 嵌套重复 landmark）。
 *
 * @see [`./PortalNav.vue`](./PortalNav.vue) 锚点导航
 * @see [`@vv/ui/composables/useLogout`](../../../../../../packages/ui/src/composables/useLogout.ts) 退出流程
 * @group 布局：Portal
 */
import { useUserStore } from '@store/modules/user'
// useLogout 随 ProDialog 族已迁 @vv/ui（P1-4），包子路径经 exports "./*" 解析
import { useLogout } from '@vv/ui/composables/useLogout'
// 跨应用统一登录协议（P4）：portal 无登录路由，整页跳 apps/auth
import { redirectToAuthLogin } from '@vv/shared'
import { ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { PORTAL_NAV } from '@/layouts/portal/config/nav'
import PortalNav from './PortalNav.vue'

const bem = createNamespace('portal-header')

const userStore = useUserStore()
const { loggingOut, confirmLogout } = useLogout()

/** 下拉面板展开态 —— popper teleport 到 body 后 focus-within 失效，且菜单未开时悬停不应旋转，须以 visible-change 事件同步 */
const dropdownOpen = ref(false)

function onVisibleChange(visible: boolean) {
  dropdownOpen.value = visible
}

/**
 * 跳统一登录应用（apps/auth）：整页 location.href（跨 app 无共享 router 实例），
 * 回跳地址取当前路径；AUTH_REDIRECTING 中断信号吞掉（整页已发起，勿误报 errorHandler）
 */
function goAuthLogin(): void {
  try {
    redirectToAuthLogin(window.location.pathname)
  } catch {
    // 中断信号，非错误
  }
}

async function onCommand(cmd: string) {
  if (cmd === 'logout') {
    await confirmLogout()
  }
}
</script>

<template>
  <header :class="bem.b()" role="banner">
    <div :class="bem.e('inner')">
      <!-- 品牌文案与 modules/home/config/site.ts 的 SITE_BRAND 有意双源：§1.2 模块边界禁止 layouts 引用 modules/，改品牌名需同步两处 -->
      <a :class="bem.e('brand')" href="#hero" aria-label="星澜科技 回到首页">
        <svg :class="bem.e('mark')" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="#111" />
          <path
            d="M7 12c3-3 6 3 9 0s6 3 9 0"
            stroke="#fff"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
          />
          <path
            d="M7 19c3-3 6 3 9 0s6 3 9 0"
            stroke="#fff"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            opacity=".6"
          />
        </svg>
        <span :class="bem.e('name')">星澜科技</span>
      </a>

      <PortalNav :items="PORTAL_NAV" />

      <div :class="bem.e('actions')">
        <a :class="bem.e('admin')" href="/admin/">管理后台</a>
        <button
          v-if="!userStore.profile"
          type="button"
          :class="bem.e('login')"
          @click="goAuthLogin"
        >
          {{ $t('auth.login') }}
        </button>
        <el-dropdown
          v-else
          trigger="click"
          :class="bem.e('dropdown')"
          @command="onCommand"
          @visible-change="onVisibleChange"
        >
          <div :class="bem.e('user')" tabindex="0" role="button" aria-haspopup="menu">
            <span :class="bem.e('avatar')">{{ userStore.profile.name?.charAt(0) ?? '?' }}</span>
            <span :class="bem.e('username')">{{ userStore.profile.name }}</span>
            <el-icon :class="[bem.e('caret'), bem.is('open', dropdownOpen)]"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout" :disabled="loggingOut">
                <el-icon class="el-icon--left"><SwitchButton /></el-icon>
                <span>{{ loggingOut ? '退出中...' : $t('auth.logout') }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
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
  background: var(--portal-bg);
  border-bottom: 1px solid var(--portal-line);

  &__inner {
    max-width: var(--portal-max-width);
    margin: 0 auto;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    padding: 0 24px;
    box-sizing: border-box;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    flex-shrink: 0;
  }

  &__mark {
    width: 28px;
    height: 28px;
    display: block;
  }

  &__name {
    font-size: 17px;
    font-weight: 700;
    color: var(--portal-ink);
    letter-spacing: 0.5px;
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 16px;
  }

  // 管理后台跳链：文字链，hover 下划线（区别于登录按钮的实心样式）
  &__admin {
    font-size: 14px;
    color: var(--portal-ink);
    text-decoration: none;
    opacity: 0.75;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 1;
      text-decoration: underline;
    }
  }

  // 未登录态：黑底白字按钮，hover 反白互换
  &__login {
    height: 34px;
    padding: 0 18px;
    font-size: 14px;
    color: #fff;
    background: var(--portal-ink);
    border: 1px solid var(--portal-ink);
    border-radius: 4px;
    cursor: pointer;
    transition:
      background 0.2s ease,
      color 0.2s ease;

    &:hover {
      background: transparent;
      color: var(--portal-ink);
    }
  }

  &__dropdown {
    display: inline-flex;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    outline: none;

    &:hover,
    &:focus-visible {
      background: var(--portal-bg-alt);
    }
  }

  &__avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--portal-ink);
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 600;
  }

  &__username {
    font-size: 14px;
    color: var(--portal-ink);
  }

  &__caret {
    display: inline-flex;
    color: var(--portal-ink-2);
    font-size: 12px;
    transition: transform 0.2s ease;

    &.is-open {
      transform: rotate(180deg);
    }
  }

  @media (max-width: 768px) {
    &__inner {
      gap: 16px;
      padding: 0 16px;
    }
  }
}
</style>
