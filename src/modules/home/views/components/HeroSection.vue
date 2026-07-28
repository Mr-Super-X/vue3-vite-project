<script setup lang="ts">
// 首页 Hero 区：背景图 + 左 banner + 右通知公告
// 规格：1920x300 背景图，1400 内容区，左侧 banner 922x252，右侧通知卡片 364x252
import { ref } from 'vue'
import HotSearchTags from './HotSearchTags.vue'
import SearchBar from './SearchBar.vue'
import NoticePanel from './NoticePanel.vue'
import { HERO_CONFIG } from '@/modules/home/config/hero'

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
  <section class="hero" aria-label="门户主页横幅">
    <div class="hero__inner">
      <div class="hero__art">
        <h2 class="hero__title">安全第一 预防为主</h2>
        <p class="hero__slogan">{{ HERO_CONFIG.slogan }}</p>
      </div>
      <div class="hero__panel">
        <NoticePanel />
      </div>
      <div class="hero__search">
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

<style lang="scss" scoped>
.hero {
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

  &__title {
    margin: 0 0 14px;
    font-size: 44px;
    font-weight: 700;
    line-height: 60px;
    letter-spacing: 4px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &__slogan {
    margin: 0;
    display: inline-block;
    padding: 6px 18px;
    background: rgba(255, 255, 255, 0.32);
    border-radius: 4px;
    font-size: 18px;
    line-height: 28px;
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
    left: 0;
    bottom: 16px;
    width: 874px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
