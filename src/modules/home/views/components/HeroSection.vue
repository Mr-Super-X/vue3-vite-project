<script setup lang="ts">
import { ref, computed } from 'vue'
import HotSearchTags from './HotSearchTags.vue'
import SearchBar from './SearchBar.vue'
import { HERO_CONFIG } from '@/portal/config/hero'

const searchType = ref(HERO_CONFIG.searchTypes[0]!.value)
const keyword = ref('')
// 用空串（而非 undefined）避开父组件 :active 传 string | undefined 触发 exactOptionalPropertyTypes
const activeTag = ref<string>('')

function selectTag(tag: string): void {
  activeTag.value = tag
  keyword.value = tag
}

// 占位：本期未对接搜索接口，仅控制台打印 type+keyword 备用；后续接 SearchApi
function onSubmit(): void {
  console.info('[portal-search]', { type: searchType.value, keyword: keyword.value })
}

const heroSlogan = computed(() => HERO_CONFIG.slogan)
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__art">
      <span class="hero__art-text">安全发展 国泰民安</span>
    </div>
    <div class="hero__content">
      <h2 id="hero-title" class="hero__title">省工贸安全监管平台</h2>
      <p class="hero__slogan">{{ heroSlogan }}</p>
      <HotSearchTags
        class="hero__hot"
        :tags="HERO_CONFIG.hotSearches"
        :active="activeTag"
        @select="selectTag"
      />
      <SearchBar
        class="hero__search"
        :types="HERO_CONFIG.searchTypes"
        :placeholder="HERO_CONFIG.searchPlaceholder"
        v-model:model-value-type="searchType"
        v-model:model-value-keyword="keyword"
        @submit="onSubmit"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.hero {
  background: linear-gradient(120deg, #e8f1ff 0%, #f5f7fa 100%);
  border-radius: 8px;
  padding: 32px;
  display: flex;
  gap: 32px;
  margin-bottom: 24px;

  &__art {
    flex: 0 0 240px;
    display: grid;
    place-items: center;
    font-size: 36px;
    font-weight: 700;
    color: #1b5bc9;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-size: 24px;
    margin: 0 0 8px;
    color: #303133;
  }

  &__slogan {
    font-size: 18px;
    color: #f56c6c;
    font-weight: 600;
    margin: 0 0 16px;
  }

  &__hot {
    margin-bottom: 12px;
  }
}
</style>
