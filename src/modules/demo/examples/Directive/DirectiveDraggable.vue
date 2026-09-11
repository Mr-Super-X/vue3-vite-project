<script setup lang="ts">
/**
 * v-draggable 指令演示 —— el-dialog 拖拽 + 边界钳制
 *
 * 覆盖场景：
 *  - 启用拖拽（默认行为）
 *  - 禁用拖拽（v-draggable="false"，如全屏态）
 *  - 边界钳制：弹窗不会拖出视口
 *
 * 路由：/demo/directive-draggable
 *
 * 实现要点（详见 src/directives/draggable.ts JSDoc）：
 *  - EP 原生 draggable 无边界钳制，弹窗可被拖出视口外且无法找回，体验不可接受
 *  - 首次拖拽时把 EP 的 margin 居中切换为 left/top 定位（margin 定位无法表达水平位移）
 *  - 每次 mousedown 重读当前位置为原点，避免「二次拖拽瞬间跳回偏移前位置」
 *  - 定位切换用内联 style 实际状态判断而非 flag，ProDialog 全屏切换时清内联定位，flag 模式会失灵
 */
import { ref } from 'vue'
import DemoFrame from '../../components/DemoFrame.vue'
import DemoField from '../../components/DemoField.vue'
import DocLayout from '../../layouts/DocLayout.vue'
import ApiTable from '../../components/ApiTable.vue'
import DocToc from '../../components/DocToc.vue'

const bem = createNamespace('demo-directive-draggable')

/* ───── 演示数据 ───────────── */

// 三个 demo 区段各自独立 ref：避免两个 <el-dialog v-model> 共享同一 ref
// 导致 enabledVisible=true 时两个弹窗都尝试显示（视觉上像「两层弹窗」）。
const enabledVisible = ref(false)
const disabledVisible = ref(false)
const toggleVisible = ref(false)

// 是否启用拖拽（模拟「全屏态禁用」场景）
const dragEnabled = ref(true)

const tocItems = [
  { id: 'demo-enabled', label: '启用拖拽' },
  { id: 'demo-disabled', label: '禁用拖拽' },
  { id: 'demo-toggle', label: '动态启用/禁用' },
  { id: 'demo-boundary', label: '边界钳制' },
  { id: 'api-binding', label: 'Binding 类型' },
]

const bindingItems = [
  {
    name: 'value',
    type: 'boolean | undefined',
    required: false,
    description: '可选。false 时禁用拖拽（适合全屏态）。undefined / true 时启用（默认值）。',
  },
]

/* ───── code 字符串（避免 inline `<>` 触发 Vue 模板解析错误） ───────────── */

const enabledDragCode = `<el-dialog v-model="visible">
  <template #header>
    <!-- v-draggable 绑在 DOM 元素上（不能直接绑 el-dialog 组件） -->
    <div v-draggable>可拖拽标题</div>
  </template>
  <p>按住标题栏拖动弹窗</p>
</el-dialog>`

const disabledDragCode = `<el-dialog v-model="visible">
  <template #header>
    <!-- 禁用态：不绑 v-draggable，或绑 v-draggable="false" -->
    <div>不可拖拽标题</div>
  </template>
</el-dialog>`

const toggleCode = `<el-switch v-model="dragEnabled" active-text="启用拖拽" />
<el-dialog v-model="visible">
  <template #header>
    <div v-draggable="dragEnabled">{{ dragEnabled ? '可拖拽' : '禁用' }}</div>
  </template>
</el-dialog>`

const clampCode = `clampPosition({ left, top }, { maxLeft, maxTop })`
</script>

<template>
  <DocLayout>
    <DemoFrame
      title="v-draggable 弹窗拖拽"
      source="src/directives/draggable.ts"
      :introductions="[
        '全局指令：让元素（通常用于 el-dialog）可被鼠标拖动。',
        '相比 Element Plus 原生 draggable：补齐边界钳制（弹窗不会拖出视口）、重置原点（避免二次拖拽跳位）。',
        '适用场景：可拖拽的弹窗、抽屉等浮层组件。',
      ]"
    >
      <!-- 启用拖拽 -->
      <section id="demo-enabled">
        <DemoField label="启用拖拽（默认）" :code="enabledDragCode">
          <el-button type="primary" @click="enabledVisible = true">打开可拖拽弹窗</el-button>
          <el-dialog v-model="enabledVisible" width="500px">
            <!--
              关键：v-draggable 必须绑在 DOM 元素上，不能直接绑 el-dialog 组件
              （组件根节点非元素时 Vue 会 warn）。这里在 #header 插槽的 div 上绑指令，
              draggable.ts 内部通过 el.closest('.el-dialog') 找到 dialog 容器进行拖拽
            -->
            <template #header>
              <div v-draggable class="vv-demo-directive-draggable__header">
                可拖拽弹窗（按住此标题栏拖动）
              </div>
            </template>
            <p :class="bem.e('content')">
              按住标题栏拖动弹窗。尝试拖到视口左/上/右/下边缘——
              弹窗会被钳制在视口内，不会被拖出屏幕外。
            </p>
            <p :class="bem.e('content')">关闭弹窗后再次打开，位置应回到中央。</p>
          </el-dialog>
        </DemoField>
      </section>

      <!-- 禁用拖拽 -->
      <section id="demo-disabled">
        <DemoField label='禁用拖拽（v-draggable="false"）' :code="disabledDragCode">
          <el-button @click="disabledVisible = true">打开不可拖拽弹窗</el-button>
          <el-dialog v-model="disabledVisible" width="500px">
            <!-- 禁用态：不绑 v-draggable；如要响应式控制可见用 v-draggable="false" 在 div 上 -->
            <template #header>
              <div class="vv-demo-directive-draggable__header">不可拖拽弹窗（无 v-draggable）</div>
            </template>
            <p :class="bem.e('content')">尝试按住标题栏拖动——无任何反应。</p>
            <p :class="bem.e('content')">常用于「全屏态」或「流程确认中不可打断」的弹窗。</p>
          </el-dialog>
        </DemoField>
      </section>

      <!-- 动态启用/禁用 -->
      <section id="demo-toggle">
        <DemoField label="动态启用/禁用（响应式 binding）" :code="toggleCode">
          <div :class="bem.e('control')">
            <el-switch
              v-model="dragEnabled"
              active-text="启用拖拽"
              inactive-text="禁用拖拽"
              inline-prompt
            />
          </div>
          <el-button @click="toggleVisible = true">打开弹窗</el-button>
          <el-dialog v-model="toggleVisible" width="500px">
            <template #header>
              <div v-draggable="dragEnabled" class="vv-demo-directive-draggable__header">
                {{ dragEnabled ? '可拖拽（开关已开）' : '不可拖拽（开关已关）' }}
              </div>
            </template>
            <p :class="bem.e('content')">
              关闭弹窗 → 切换上方开关 → 再次打开 —— 拖拽行为随开关变化。
            </p>
            <p :class="bem.e('content')">
              原理：v-draggable 的 updated 钩子在 binding 变化时同步 state.enabled， 无需重新挂载。
            </p>
          </el-dialog>
        </DemoField>
      </section>

      <!-- 边界钳制 -->
      <section id="demo-boundary">
        <DemoField label="边界钳制（数学钳制到视口内）" :code="clampCode">
          <p :class="bem.e('content')">
            边界钳制公式：弹窗的 left / top 不能小于 0，也不能大于
            <code>(viewportWidth - dialogWidth, viewportHeight - dialogHeight)</code>
            。
          </p>
          <p :class="bem.e('content')">
            实现位于
            <code>src/directives/draggable.ts:clampPosition</code>
            ， 是纯函数导出供单测直接覆盖边界数学。
          </p>
          <p :class="bem.e('content')">
            <strong>为什么不只钳制手柄高度：</strong>
            若只钳制手柄，弹窗底部必然超出视口，触发 EP .el-overlay { overflow: auto } 的滚动条；
            钳制整个弹窗才是正确的体验。
          </p>
        </DemoField>
      </section>

      <ApiTable title="v-draggable Binding" :items="bindingItems" anchor="api-binding" />
    </DemoFrame>

    <template #toc>
      <DocToc :items="tocItems" />
    </template>
  </DocLayout>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-demo-directive-draggable {
  &__header {
    flex: 1;
    cursor: move;
    font-size: 16px;
    font-weight: 600;
    user-select: none;
  }

  &__content {
    margin: 0 0 12px;
    line-height: 1.6;
    color: var(--el-text-color-regular);

    code {
      padding: 1px 4px;
      background: var(--el-fill-color-light);
      border-radius: 3px;
      font-family: monospace;
      font-size: 12px;
    }
  }

  &__control {
    margin-bottom: 12px;
  }
}
</style>
