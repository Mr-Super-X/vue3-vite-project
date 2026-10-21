<script setup lang="ts">
/**
 * 大屏装饰面板：四角 L 形高光 + 半透明深蓝底 + 可选标题栏。
 *
 * 四角用 4 个独立 <i> 元素（每角一个），比多重 background-gradient 单元素写法
 * 可读性更好，且各自定位互不影响。
 *
 * 样式全部写死设计稿 px：big layout 的 scale 容器统一等比缩放，
 * 本组件不在 postcss-pxtorem 转换范围，px 原样输出即可。
 *
 * 高度契约（消费侧必读）：组件根不写 height:100%——flex item 场景下
 * flex-basis 决定主轴尺寸，height:100% 会在 basis:auto 时劫持为父容器全高
 * （9000 页 flex:none 面板实测塌陷根因）。消费侧用 flex grow 比例 / grid 行 /
 * 固定 height 任一种提供确定高度；父链高度不确定时内容自适应。
 */
interface Props {
  /** 面板标题（左上角，不传则不渲染标题栏） */
  title?: string
}
defineProps<Props>()

const bem = createNamespace('panel-box')
</script>

<template>
  <section :class="bem.b()">
    <i :class="[bem.e('corner'), bem.em('corner', 'lt')]" />
    <i :class="[bem.e('corner'), bem.em('corner', 'rt')]" />
    <i :class="[bem.e('corner'), bem.em('corner', 'lb')]" />
    <i :class="[bem.e('corner'), bem.em('corner', 'rb')]" />
    <header v-if="title" :class="bem.e('header')">{{ title }}</header>
    <div :class="bem.e('body')">
      <slot />
    </div>
  </section>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-panel-box {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 16px 20px;
  background: rgba(13, 38, 76, 0.35);
  border: 1px solid rgba(62, 140, 255, 0.25);

  &__corner {
    position: absolute;
    width: 18px;
    height: 18px;
    // 角高光色比边框亮一档，形成视觉焦点
    border-color: #4da3ff;
    border-style: solid;
    border-width: 0;
    pointer-events: none;

    &--lt {
      top: -1px;
      left: -1px;
      border-top-width: 2px;
      border-left-width: 2px;
    }

    &--rt {
      top: -1px;
      right: -1px;
      border-top-width: 2px;
      border-right-width: 2px;
    }

    &--lb {
      bottom: -1px;
      left: -1px;
      border-bottom-width: 2px;
      border-left-width: 2px;
    }

    &--rb {
      right: -1px;
      bottom: -1px;
      border-right-width: 2px;
      border-bottom-width: 2px;
    }
  }

  &__header {
    flex: none;
    padding-bottom: 12px;
    font-size: 18px;
    font-weight: 600;
    color: #d6e4ff;
    letter-spacing: 1px;
  }

  &__body {
    flex: 1;
    min-height: 0;
  }
}
</style>
