<script setup lang="ts">
// 首页：负责组合导航之下的所有区块（hero / 时间问候 / 数据总览 / 页脚 / AI 助手）
// PortalHeader 在父级 layouts/portal 内；导航以下（含本页）全部由 home 模块自管
import { onMounted } from 'vue'
import { usePortalOverviewStore } from '@/modules/home/store/portal-overview'
import HeroSection from './components/HeroSection.vue'
import DateGreeting from './components/DateGreeting.vue'
import OverviewSection from './components/OverviewSection.vue'
import HomeFooter from './components/HomeFooter.vue'
import HomeAiWidget from './components/HomeAiWidget.vue'

const store = usePortalOverviewStore()

onMounted(() => {
  store.fetch()
})
</script>

<template>
  <div class="home">
    <HeroSection />
    <DateGreeting />
    <OverviewSection />
    <HomeFooter />
    <HomeAiWidget />
  </div>
</template>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
