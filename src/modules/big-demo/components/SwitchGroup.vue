<script setup lang="ts">
/**
 * 联动开关组（9000 超宽页左面板）。
 *
 * 从 Wide.vue 抽离的理由：开关组是自包含交互单元（状态 + 翻转 + 视图），
 * 抽出后视图只负责布局组装，行数回归规范区间。
 *
 * 开关定义（含初始态 defaultOn）在 apis 层（WIDE_SWITCHES）——单一事实源，
 * 本组件 reduce 派生交互状态，避免 key 列表双处维护漂移。
 * 内联按钮形态（大屏 scale 容器内不使用 teleport 弹层组件）。
 */
import { WIDE_SWITCHES } from '../apis'

const bem = createNamespace('switch-group')

const switchState = ref(
  WIDE_SWITCHES.reduce<Record<string, boolean>>((acc, s) => {
    acc[s.key] = s.defaultOn
    return acc
  }, {})
)

function toggleSwitch(key: (typeof WIDE_SWITCHES)[number]['key']): void {
  switchState.value[key] = !switchState.value[key]
}
</script>

<template>
  <div :class="bem.b()">
    <button
      v-for="s in WIDE_SWITCHES"
      :key="s.key"
      type="button"
      :class="[bem.e('switch'), switchState[s.key] ? bem.em('switch', 'on') : '']"
      :aria-pressed="switchState[s.key]"
      @click="toggleSwitch(s.key)"
    >
      {{ s.label }} · {{ switchState[s.key] ? '开' : '关' }}
    </button>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-switch-group {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__switch {
    padding: 10px 24px;
    font-size: 22px;
    color: #d6e4ff;
    cursor: pointer;
    background: rgba(43, 109, 224, 0.12);
    border: 1px solid rgba(62, 140, 255, 0.35);
    border-radius: 8px;

    &--on {
      color: #ffffff;
      background: rgba(77, 163, 255, 0.35);
      border-color: #4da3ff;
    }
  }
}
</style>
