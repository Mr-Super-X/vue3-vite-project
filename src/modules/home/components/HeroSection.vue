<script setup lang="ts">
// 首页 Hero 区：背景图 + 左 banner + 右通知公告
// 规格：1920x300 背景图，1400 内容区，左侧 banner 922x252，右侧通知卡片 364x252
import HotSearchTags from './HotSearchTags.vue'
import SearchBar from './SearchBar.vue'
import NoticePanel from './NoticePanel.vue'
import { HERO_CONFIG } from '@/modules/home/config/hero'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('hero-section')

const searchType = ref(HERO_CONFIG.searchTypes[0]!.value)
const keyword = ref('')
// 用空串（而非 undefined）避开父组件 :active 传 string | undefined 触发 exactOptionalPropertyTypes
const activeTag = ref<string>('')

function selectTag(tag: string): void {
  activeTag.value = tag
  keyword.value = tag
}

// 占位：本期未对接搜索接口，仅控制台打印 type+keyword 备用
function onSubmit(): void {
  console.info('[portal-search]', { type: searchType.value, keyword: keyword.value })
}
</script>

<template>
  <section :class="bem.b()" aria-label="门户主页横幅">
    <div :class="bem.e('inner')">
      <div :class="bem.e('art')" />
      <div :class="bem.e('panel')">
        <NoticePanel />
      </div>
      <div :class="bem.e('search')">
        <HotSearchTags :tags="HERO_CONFIG.hotSearches" :active="activeTag" @select="selectTag" />
        <SearchBar
          :types="HERO_CONFIG.searchTypes"
          :placeholder="HERO_CONFIG.searchPlaceholder"
          v-model:model-value-type="searchType"
          v-model:model-value-keyword="keyword"
          @submit="onSubmit"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-hero-section {
  width: 100%;
  height: 300px;
  background: url('@/modules/home/images/home-head-bg.png') center / 1920px 300px no-repeat;

  &__inner {
    position: relative;
    max-width: var(--portal-max-width);
    margin: 0 auto;
    height: 100%;
  }

  &__art {
    position: absolute;
    top: 24px;
    left: 0;
    width: 922px;
    height: 252px;
    background: url('@/modules/home/images/hero-banner.png') center / 922px 252px no-repeat;
    border-radius: 4px;
    padding: 36px 40px 0;
    color: #fff;
  }

  &__panel {
    position: absolute;
    top: 24px;
    right: 0;
    width: 364px;
    height: 252px;
  }

  &__search {
    position: absolute;
    left: 25px;
    bottom: 60px;
    width: 874px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
