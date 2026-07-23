<script setup lang="ts">
import { onMounted } from 'vue'
import { usePortalOverviewStore } from '@/modules/home/store/portal-overview'
import HeroSection from './components/HeroSection.vue'
import DateGreeting from './components/DateGreeting.vue'
import OverviewSection from './components/OverviewSection.vue'

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
  </div>
</template>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: column;
}
</style>
