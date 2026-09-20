<script setup lang="ts">
/**
 * 首页视图：组合导航之下的所有区块（hero / 时间问候 / 数据总览 / 页脚 / AI 助手）。
 *
 * PortalHeader 在父级 `layouts/portal` 内；导航以下（含本页）全部由 home 模块自管。
 *
 * onMounted 触发 `store.fetch()` 拉取 Overview 数据；不放在 setup 顶层避免 SSR / 测试时副作用。
 *
 * @see [`@/modules/home/store/portal-overview`](../store/portal-overview.ts) 数据源
 * @see [`../components/HeroSection.vue`](../components/HeroSection.vue) hero 区
 * @see [`../components/OverviewSection.vue`](../components/OverviewSection.vue) 数据总览
 * @group 业务模块：Home
 */
import { usePortalOverviewStore } from '@/modules/home/store/portal-overview'
import HeroSection from '../components/HeroSection.vue'
import DateGreeting from '../components/DateGreeting.vue'
import OverviewSection from '../components/OverviewSection.vue'
import HomeFooter from '../components/HomeFooter.vue'
import HomeAiWidget from '../components/HomeAiWidget.vue'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('home-index')

const store = usePortalOverviewStore()

onMounted(() => {
  store.fetch()
})
</script>

<template>
  <div :class="bem.b()">
    <HeroSection />
    <DateGreeting />
    <OverviewSection />
    <HomeFooter />
    <HomeAiWidget />
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-home-index {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
