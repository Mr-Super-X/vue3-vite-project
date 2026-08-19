<script setup lang="ts">
// 通知公告侧栏：用户名 + 消息/待办计数 + 公告/消息双 tab + 公告列表
// 规格：364x252 / AVATAR 32x32 / 标签页 18px 高亮蓝

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('notice-panel')

interface NoticeTab {
  key: 'notice' | 'message'
  label: string
  count: number
  countColor: string
}

interface NoticeItem {
  text: string
}

const TABS: NoticeTab[] = [
  { key: 'notice', label: '通知公告', count: 5, countColor: '#016be6' },
  { key: 'message', label: '消息通知', count: 3, countColor: '#ffa64f' },
]

const NOTICES: NoticeItem[] = [
  { text: '收到【广东汇成检测技术股份有限公司】检查任务' },
  { text: '收到【利诚检测认证集团股份有限公司】检查任务' },
  { text: '收到【利诚检测认证集团股份有限公司】检查任务' },
  { text: '收到【利诚检测认证集团股份有限公司】检查任务' },
  { text: '收到【利诚检测认证集团股份有限公司】检查任务' },
]

const activeTab = ref<NoticeTab['key']>('notice')
</script>

<template>
  <div :class="bem.b()">
    <header :class="bem.e('header')">
      <span :class="bem.e('avatar')">
        <img src="@/modules/home/images/avatar-male.png" alt="" width="32" height="32" />
      </span>
      <span :class="bem.e('name')">黄晓阳</span>
      <span :class="bem.e('divider')" aria-hidden="true" />
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        :class="[bem.e('count'), bem.is('active', activeTab === tab.key)]"
        @click="activeTab = tab.key"
      >
        <span :class="bem.e('count-label')">{{ tab.label }}</span>
        <span :class="bem.e('count-num')" :style="{ color: tab.countColor }">
          {{ tab.count }}
        </span>
      </button>
    </header>

    <nav :class="bem.e('tabs')" aria-label="通知分类">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        :class="[bem.e('tab'), bem.is('active', activeTab === tab.key)]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="activeTab === tab.key" :class="bem.e('tab-bar')" aria-hidden="true" />
      </button>
    </nav>

    <ul :class="bem.e('list')">
      <li v-for="(n, i) in NOTICES" :key="i" :class="bem.e('item')">
        <span :class="bem.e('dot')" aria-hidden="true" />
        <span :class="bem.e('text')">{{ n.text }}</span>
      </li>
    </ul>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-notice-panel {
  background: #fff;
  border-radius: 4px;
  padding: 16px 16px 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 14px;
  }

  &__avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: #e8eaeb;

    img {
      display: block;
      width: 100%;
      height: 100%;
    }
  }

  &__name {
    font-size: 14px;
    font-weight: 700;
    color: #0d1c28;
    line-height: 20px;
  }

  &__divider {
    width: 1px;
    height: 14px;
    background: #d8d8d8;
    margin: 0 4px;
  }

  &__count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;

    &.is-active .#{$BEM_PREFIX}-notice-panel__count-label {
      color: #0d1c28;
      font-weight: 500;
    }
  }

  &__count-label {
    font-size: 14px;
    color: #0d1c28;
    line-height: 20px;
  }

  &__count-num {
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }

  &__tabs {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    border-bottom: 1px solid #f1f2f3;
    padding-bottom: 0;
  }

  &__tab {
    position: relative;
    background: none;
    border: none;
    padding: 4px 0 8px;
    font-size: 18px;
    font-weight: 400;
    color: #262626;
    cursor: pointer;
    line-height: 25px;

    &.is-active {
      color: #016be6;
      font-weight: 500;
    }
  }

  &__tab-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: #016be6;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 12px 0 6px;
    flex: 1;
    overflow: hidden;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    font-size: 14px;
    color: #0d1c28;
    line-height: 20px;
  }

  &__dot {
    flex: 0 0 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #0d1c28;
  }

  &__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
