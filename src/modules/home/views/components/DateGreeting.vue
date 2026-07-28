<script setup lang="ts">
// 时间问候条：全宽 #F2F2F2 背景，左侧钟表图标 + 标语 + 日期
// 规格：y=480..546 / 图标 18x18 / 标语 304x20 / 日期 130x17
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
  <section class="date-greeting" aria-label="时间问候">
    <div class="date-greeting__inner">
      <img
        class="date-greeting__icon"
        src="@/modules/home/images/rest-time.png"
        alt=""
        width="18"
        height="18"
      />
      <p class="date-greeting__text">{{ greeting }}</p>
      <p class="date-greeting__date">{{ formattedDate }}</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.date-greeting {
  width: 100%;
  background: #f2f2f2;

  &__inner {
    max-width: var(--portal-max-width);
    margin: 0 auto;
    padding: 15px 24px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__icon {
    position: absolute;
    width: 18px;
    height: 18px;
  }

  &__text {
    margin: 0 0 0 24px;
    font-size: 14px;
    color: #0d1c28;
    line-height: 20px;
  }

  &__date {
    margin: 0 0 0 24px;
    font-size: 12px;
    color: #727475;
    line-height: 17px;
  }
}
</style>
