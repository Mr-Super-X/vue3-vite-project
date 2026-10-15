<script setup lang="ts">
/**
 * big-demo 首页：1920×1080 标准数据大屏。
 *
 * 布局（设计稿坐标系，样式写死 px 由 big layout scale 统一缩放）：
 *   标题栏 80px + 内容区（左栏 460 / 中央 flex:1 / 右栏 460，间距 30，页边距 30）
 *
 * 实时感：setInterval 每 3s 抖动 KPI 数值（onUnmounted 清理）。
 * 标题栏副行显示当前视口与 scale，作为适配生效的直接证据（照 h5-demo 先例）。
 */
import { BIG_SCALE_STATE_KEY } from '@/layouts/big/config/scale'
import { LIVE_FEED, OVERVIEW_KPIS, REGION_RANK, SIDE_KPIS, jitterValue } from '../apis'
import { mainTrendOption, shareOption, trendOption } from '../config/charts'
import { useClock } from '../composables/useClock'
// 模块内组件不在 unplugin-vue-components 全局注册范围（仅 components/common|ProTable|form-schema），需显式 import
import BigChart from '../components/BigChart.vue'
import KpiCard from '../components/KpiCard.vue'
import PanelBox from '../components/PanelBox.vue'
import RankingList from '../components/RankingList.vue'
import type { RankingItem } from '../components/RankingList.vue'

const bem = createNamespace('big-demo')

/** 当前 scale（big layout provide；独立预览时回退 1）——标题栏副行展示用 */
// inject 为 vue 依赖注入（AutoImport 注入）；key 契约见 @/layouts/big/config/scale.ts
const scaleState = inject(BIG_SCALE_STATE_KEY)

// ─── 视口与 scale 指标（验收缩放生效的直接证据）───────────────
const viewportLabel = ref('')
function refreshViewport(): void {
  viewportLabel.value = `${window.innerWidth}×${window.innerHeight}`
}
/** scale 显示：保留 3 位小数的紧凑形态 */
const scaleLabel = computed(() => {
  const s = scaleState?.value.scale ?? 1
  return String(Math.round(s * 1000) / 1000)
})

// ─── KPI 实时抖动 ──────────────────────────────────────────
const kpis = ref(OVERVIEW_KPIS.map((k) => ({ ...k })))
let ticker: ReturnType<typeof setInterval> | undefined

// 实时时钟（模块 composable，scope 销毁自动清理）
const clock = useClock()

onMounted(() => {
  refreshViewport()
  window.addEventListener('resize', refreshViewport)

  ticker = setInterval(() => {
    // 基于基准值抖动（而非当前值复利）：±5% 围绕基准跳动，
    // 避免长时间运行后数值无界漂移失真（演示厅长跑场景）
    kpis.value = OVERVIEW_KPIS.map((k) => ({ ...k, value: jitterValue(k.value) }))
  }, 3000)
})
onUnmounted(() => {
  window.removeEventListener('resize', refreshViewport)
  clearInterval(ticker)
})

const regionItems: RankingItem[] = REGION_RANK.map((r) => ({ ...r }))
</script>

<template>
  <div :class="bem.b()">
    <header :class="bem.e('header')">
      <h1 :class="bem.e('title')">集团经营数据大屏</h1>
      <p :class="bem.e('meta')">{{ clock }} · 视口 {{ viewportLabel }} · scale ×{{ scaleLabel }}</p>
    </header>

    <main :class="bem.e('main')">
      <!-- 左栏 -->
      <aside :class="[bem.e('col'), bem.em('col', 'left')]">
        <KpiCard
          v-for="kpi in SIDE_KPIS"
          :key="kpi.label"
          :label="kpi.label"
          :value="kpi.value"
          :unit="kpi.unit"
          :trend="kpi.trend"
        />
        <PanelBox title="业务占比" :class="bem.e('panel-grow')">
          <BigChart :option="shareOption" />
        </PanelBox>
      </aside>

      <!-- 中央区 -->
      <section :class="bem.e('center')">
        <div :class="bem.e('kpi-band')">
          <KpiCard
            v-for="kpi in kpis"
            :key="kpi.label"
            :label="kpi.label"
            :value="kpi.value.toLocaleString()"
            :unit="kpi.unit"
            :trend="kpi.trend"
          />
        </div>
        <PanelBox title="月度经营趋势" :class="bem.e('panel-main')">
          <BigChart :option="mainTrendOption" />
        </PanelBox>
        <PanelBox title="实时动态" :class="bem.e('panel-feed')">
          <ul :class="bem.e('feed')">
            <li v-for="item in LIVE_FEED" :key="item.time">
              <span :class="bem.e('feed-time')">{{ item.time }}</span>
              {{ item.text }}
            </li>
          </ul>
        </PanelBox>
      </section>

      <!-- 右栏 -->
      <aside :class="[bem.e('col'), bem.em('col', 'right')]">
        <PanelBox title="交易额走势" :class="bem.e('panel-trend')">
          <BigChart :option="trendOption" />
        </PanelBox>
        <PanelBox title="区域销售排行" :class="bem.e('panel-grow')">
          <RankingList :items="regionItems" />
        </PanelBox>
      </aside>
    </main>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-big-demo {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 1920px;
  height: 1080px;
  padding: 0 30px 30px;
  color: #d6e4ff;
  background:
    radial-gradient(ellipse 1200px 500px at 50% -10%, rgba(43, 109, 224, 0.25), transparent),
    #06122b;

  &__header {
    flex: none;
    height: 80px;
    padding-top: 14px;
    text-align: center;
  }

  &__title {
    margin: 0;
    font-size: 36px;
    font-weight: 700;
    letter-spacing: 6px;
    background: linear-gradient(180deg, #ffffff, #7db4ff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  &__meta {
    margin: 4px 0 0;
    font-size: 14px;
    color: #5f7bab;
  }

  &__main {
    display: flex;
    flex: 1;
    gap: 30px;
    min-height: 0;
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 460px;

    &--left,
    &--right {
      flex: none;
    }
  }

  &__center {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  &__kpi-band {
    display: grid;
    flex: none;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  &__panel-grow {
    flex: 1;
    min-height: 0;
  }

  &__panel-main {
    flex: 1.6;
    min-height: 0;
  }

  &__panel-feed {
    flex: 1;
    min-height: 0;
  }

  &__panel-trend {
    flex: none;
    height: 40%;
  }

  &__feed {
    margin: 0;
    padding: 0;
    overflow: hidden;
    list-style: none;
    font-size: 15px;
    color: #8fa8d8;

    li {
      padding: 6px 0;
      border-bottom: 1px dashed rgba(143, 168, 216, 0.15);
    }
  }

  &__feed-time {
    margin-right: 12px;
    color: #4da3ff;
    font-variant-numeric: tabular-nums;
  }
}
</style>
