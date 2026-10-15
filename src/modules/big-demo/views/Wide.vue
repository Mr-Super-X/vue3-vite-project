<script setup lang="ts">
/**
 * big-demo 超宽示例：9000×1080 拼接屏（中间地图 + 两侧操作面板）。
 *
 * 布局：标题栏 100px + 内容区（左面板 1800 / 地图 flex:1 / 右面板 1800，间距 100，页边距 100）
 * 本页经路由 meta.bigScreen = { width: 9000, height: 1080 } 声明设计稿尺寸，
 * big layout 据此缩放；普通 1920 显示器打开时整体缩小预览（scale≈0.21），开发无需真拼接屏。
 *
 * 地图 option 在 ../config/china-map.ts（含 GeoJSON 注册副作用，独立 chunk 不拖累 1920 页）；
 * 面板静态数据在 ../apis（WIDE_* 常量）；开关组交互在 ../components/SwitchGroup.vue。
 *
 * 字号尺度：本页 1:1 物理显示且观看距离远（5~15 米），字号按 1920 稿 ×1.5~1.8 取
 * （标题 56px、正文 22~30px），非按比例 4.7 倍（4.7 倍是等比缩放场景的算法，本页原生分辨率直出）。
 * 面板内容密度经 9000×1080 实测紧凑化（排行/按钮/指标压缩），保证三栏总高不溢出不裁剪。
 */
import { chinaMapOption } from '../config/china-map'
import { useClock } from '../composables/useClock'
// 模块内组件不在 unplugin-vue-components 全局注册范围（仅 components/common|ProTable|form-schema），需显式 import
import BigChart from '../components/BigChart.vue'
import PanelBox from '../components/PanelBox.vue'
import SwitchGroup from '../components/SwitchGroup.vue'
import { REGION_RANK, WIDE_ALARMS, WIDE_DIMENSIONS, WIDE_METRIC_GROUPS } from '../apis'

const bem = createNamespace('big-demo-wide')

// 实时时钟（模块 composable，scope 销毁自动清理）
const clock = useClock()

// ─── 面板交互状态（内联控件：不使用 teleport 弹层组件）────────
const activeDimension = ref<(typeof WIDE_DIMENSIONS)[number]>('按大区')
</script>

<template>
  <div :class="bem.b()">
    <header :class="bem.e('header')">
      <h1 :class="bem.e('title')">全国运营指挥中心 · 拼接大屏</h1>
      <p :class="bem.e('clock')">{{ clock }}</p>
    </header>

    <main :class="bem.e('main')">
      <!-- 左操作面板 -->
      <aside :class="bem.e('side')">
        <PanelBox title="核心指标" :class="bem.e('block')">
          <dl :class="bem.e('metrics')">
            <div v-for="m in WIDE_METRIC_GROUPS" :key="m.label" :class="bem.e('metric')">
              <dt>{{ m.label }}</dt>
              <dd>{{ m.value }}</dd>
            </div>
          </dl>
        </PanelBox>
        <PanelBox title="区域排行" :class="[bem.e('block'), bem.em('block', 'grow')]">
          <ol :class="bem.e('ranks')">
            <li v-for="(r, i) in REGION_RANK" :key="r.name" :class="bem.e('rank')">
              <span :class="bem.e('rank-no')">{{ i + 1 }}</span>
              <span :class="bem.e('rank-name')">{{ r.name }}</span>
              <span :class="bem.e('rank-value')">{{ r.value.toLocaleString() }}</span>
            </li>
          </ol>
        </PanelBox>
        <PanelBox title="联动开关" :class="bem.e('block')">
          <SwitchGroup />
        </PanelBox>
      </aside>

      <!-- 中间地图 -->
      <section :class="bem.e('map')">
        <BigChart :option="chinaMapOption" />
      </section>

      <!-- 右操作面板 -->
      <aside :class="bem.e('side')">
        <PanelBox title="分析维度" :class="bem.e('block')">
          <div :class="bem.e('dimensions')">
            <button
              v-for="d in WIDE_DIMENSIONS"
              :key="d"
              type="button"
              :class="[
                bem.e('dimension'),
                activeDimension === d ? bem.em('dimension', 'active') : '',
              ]"
              @click="activeDimension = d"
            >
              {{ d }}
            </button>
          </div>
        </PanelBox>
        <PanelBox title="实时告警" :class="[bem.e('block'), bem.em('block', 'grow')]">
          <ul :class="bem.e('alarms')">
            <li v-for="a in WIDE_ALARMS" :key="a.time + a.text">
              <span :class="[bem.e('alarm-level'), bem.em('alarm-level', a.level)]">
                {{ a.level }}
              </span>
              <span :class="bem.e('alarm-text')">{{ a.text }}</span>
              <span :class="bem.e('alarm-time')">{{ a.time }}</span>
            </li>
          </ul>
        </PanelBox>
      </aside>
    </main>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-big-demo-wide {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 9000px;
  height: 1080px;
  padding: 0 100px 60px;
  color: #d6e4ff;
  background:
    radial-gradient(ellipse 4000px 600px at 50% -10%, rgba(43, 109, 224, 0.3), transparent), #06122b;

  &__header {
    position: relative;
    flex: none;
    height: 100px;
    padding-top: 22px;
    text-align: center;
  }

  &__title {
    margin: 0;
    font-size: 56px;
    font-weight: 700;
    letter-spacing: 16px;
    background: linear-gradient(180deg, #ffffff, #7db4ff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  &__clock {
    position: absolute;
    top: 40px;
    right: 0;
    margin: 0;
    font-size: 30px;
    color: #5f7bab;
    font-variant-numeric: tabular-nums;
  }

  // 9000 稿尺度覆盖（非 scoped 穿透用后代选择器，§3.2 #10）：
  // PanelBox 标题 18px 是 1920 稿尺度，本页正文 22~30px——不放大则标题比正文小、层级倒挂
  .#{$BEM_PREFIX}-panel-box__header {
    padding-bottom: 20px;
    font-size: 30px;
  }

  &__main {
    display: flex;
    flex: 1;
    gap: 100px;
    min-height: 0;
  }

  &__side {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 32px;
    width: 1800px;
  }

  &__block {
    // 内容自适应高度：均分（flex:1）会让内容少的面板被拉伸、内容多的溢出；
    // 剩余空间由 --grow 面板（区域排行/实时告警）吸收
    flex: none;

    &--grow {
      flex: 1;
      min-height: 0;
    }
  }

  &__map {
    flex: 1;
    min-width: 0;
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 0;
  }

  &__metric {
    dt {
      font-size: 20px;
      color: #8fa8d8;
    }

    dd {
      margin: 4px 0 0;
      font-size: 32px;
      font-weight: 700;
      color: #4da3ff;
      font-variant-numeric: tabular-nums;
    }
  }

  &__ranks {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__rank {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 6px 0;
    font-size: 22px;
  }

  &__rank-no {
    flex: none;
    width: 32px;
    height: 32px;
    font-size: 18px;
    line-height: 32px;
    text-align: center;
    color: #0a1830;
    background: #3a5a8c;
    border-radius: 8px;
  }

  &__rank-name {
    flex: 1;
    color: #d6e4ff;
  }

  &__rank-value {
    flex: none;
    color: #8fa8d8;
    font-variant-numeric: tabular-nums;
  }

  &__dimensions {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__dimension {
    padding: 10px 24px;
    font-size: 22px;
    color: #d6e4ff;
    cursor: pointer;
    background: rgba(43, 109, 224, 0.12);
    border: 1px solid rgba(62, 140, 255, 0.35);
    border-radius: 8px;

    &--active {
      color: #ffffff;
      background: rgba(77, 163, 255, 0.35);
      border-color: #4da3ff;
    }
  }

  &__alarms {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      font-size: 24px;
      border-bottom: 1px dashed rgba(143, 168, 216, 0.15);
    }
  }

  &__alarm-level {
    flex: none;
    padding: 4px 14px;
    font-size: 22px;
    border-radius: 6px;

    &--高 {
      color: #fff;
      background: rgba(245, 108, 108, 0.85);
    }

    &--中 {
      color: #0a1830;
      background: rgba(247, 201, 72, 0.9);
    }

    &--低 {
      color: #0a1830;
      background: rgba(143, 168, 216, 0.75);
    }
  }

  &__alarm-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__alarm-time {
    flex: none;
    color: #5f7bab;
    font-variant-numeric: tabular-nums;
  }
}
</style>
