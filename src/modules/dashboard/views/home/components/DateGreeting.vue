<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    greeting?: string
    date?: Date
  }>(),
  {
    greeting: '下午时间，只有奋斗的人生才称得上幸福的人生！',
    date: () => new Date(),
  }
)

const formattedDate = computed(() => {
  const d = props.date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${y}年${m}月${day}日 星期${weekdays[d.getDay()]}`
})
</script>

<template>
  <div class="date-greeting">
    <span class="date-greeting__icon" aria-hidden="true">☕</span>
    <p class="date-greeting__text">{{ greeting }}</p>
    <p class="date-greeting__date">{{ formattedDate }}</p>
  </div>
</template>

<style lang="scss" scoped>
.date-greeting {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  font-size: 13px;
  color: #606266;

  &__icon {
    font-size: 16px;
  }
}
</style>
