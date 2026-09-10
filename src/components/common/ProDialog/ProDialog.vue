<script setup lang="ts">
/**
 * ProDialog 高级弹窗（声明式入口）。
 *
 * 在 ElDialog 基础上扩展三项能力：
 * - 头部拖拽：`v-draggable` 指令实现，可限制在视口边界内（EP 原生 draggable 无边界限制，
 *   拖出屏幕后无法找回，故不用原生）
 * - 全屏切换：走 EP 原生 `fullscreen` 机制，头部自带切换按钮，全屏态自动禁用拖拽
 * - 内置确认/取消 footer：默认提供两按钮，向外抛出语义化的 `confirm` / `close` 事件
 *
 * ElDialog 原生 Props 透传方式（重要）：
 * 显式声明的只有 modelValue / title / draggable / fullScreen / showFullScreenButton，
 * 其余原生 Props（width / top / modal / showClose / beforeClose 等）经
 * `inheritAttrs: false` + `v-bind="$attrs"` 原样落到内部 el-dialog——
 * 不用 `defineProps<ProDialogProps>()` 全量继承，因为 Vue 3.6 SFC 编译器
 * 无法对 `Partial<InstanceType<typeof ElDialog>['$props']>` 做编译期类型展开。
 *
 * 组件被 `@/components/index.ts` 的自动扫描全局注册为 `<ProDialog>`（无需 import），
 * 命令式入口见 `@composables/useDialog`。
 *
 * @see [`./types.ts`](./types.ts) 对外类型（UseDialogOptions 等，供命令式入口复用）
 * @see [`@directives/draggable`](../../../directives/draggable.ts) 拖拽指令实现
 * @see [`@composables/useDialog`](../../../composables/useDialog.ts) 命令式调用
 * @group 通用组件：ProDialog
 */
import { Aim, FullScreen } from '@element-plus/icons-vue'

// BEM 命名空间：vv-pro-dialog（createNamespace 由 unplugin-auto-import 注入）
const bem = createNamespace('pro-dialog')

// 显式声明的自有 Props；其余 ElDialog 原生 Props 经 $attrs 透传（见文件头注释）
interface Props {
  /** 显隐控制（v-model），默认 false */
  modelValue?: boolean
  /** 弹窗标题（透传 EP title；传入 header 插槽时插槽优先） */
  title?: string
  /**
   * 是否允许按住头部拖拽（默认 true）——
   * 全屏态自动禁用（EP 全屏时弹窗贴满视口，拖拽无意义且会破坏布局）
   */
  draggable?: boolean
  /** 初始是否全屏（默认 false）——头部提供切换按钮 */
  fullScreen?: boolean
  /** 是否显示头部全屏切换按钮（默认 true） */
  showFullScreenButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: '',
  draggable: true,
  fullScreen: false,
  showFullScreenButton: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 弹窗打开（进入动画开始） */
  open: []
  /** 弹窗关闭（所有关闭途径的兜底事件） */
  close: []
  /** 点击内置「确定」按钮 */
  confirm: []
  /** 全屏状态切换 */
  fullScreenChange: [value: boolean]
}>()

// 原生 Props 走 $attrs 透传，关闭自动继承避免与 v-bind="$attrs" 双重绑定
// （监听器双绑会导致事件回调执行两次）
defineOptions({ inheritAttrs: false })

const isFullScreen = ref(props.fullScreen)
// fullScreen prop 作为初始值，外部后续改 prop 时同步（支持调用方控制全屏态）
watch(
  () => props.fullScreen,
  (v) => {
    isFullScreen.value = v
  }
)

// 头部拖拽手柄 ref：切换全屏时需要通过它向上找到 .el-dialog 清除拖拽残留的内联定位
const headerRef = ref<HTMLElement | null>(null)

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

/**
 * 拖拽生效条件：允许拖拽 且 非全屏 且 弹窗已打开。
 * 关闭动画期间 visible 已为 false，自然禁拖，无需额外处理动画边界。
 */
const dragEnabled = computed(() => props.draggable && !isFullScreen.value && visible.value)

function toggleFullScreen(): void {
  isFullScreen.value = !isFullScreen.value
  // 清除拖拽留下的内联定位：EP 的 .is-fullscreen 只重置 margin/width/height，
  // 不重置 v-draggable 写入的内联 left/top——不清理会把全屏弹窗顶出视口。
  // 进出全屏都清除：退出全屏后弹窗回到默认居中位置（拖拽偏移一并复位）
  const dialog = headerRef.value?.closest<HTMLElement>('.el-dialog')
  if (dialog) {
    dialog.style.left = ''
    dialog.style.top = ''
    dialog.style.margin = ''
    dialog.style.position = ''
  }
  emit('fullScreenChange', isFullScreen.value)
}

/** el-dialog 的 open 事件（进入动画开始） */
function handleOpen(): void {
  emit('open')
}

/** el-dialog 的 close 事件：所有关闭途径的兜底（确认/取消/X/ESC/遮罩都会触发） */
function handleClose(): void {
  emit('close')
}

/** 内置「取消」按钮：仅关闭，不触发 confirm */
function handleCancel(): void {
  visible.value = false
}

/** 内置「确定」按钮：先抛 confirm 再关闭（自定义 footer 插槽时由调用方自行决定该语义） */
function handleConfirm(): void {
  emit('confirm')
  visible.value = false
}
</script>

<template>
  <!-- v-bind="$attrs" 必须在最前：原生 props（width/top/modal/beforeClose 等）先落位，
       后面的显式绑定（fullscreen/class 等）才能按需覆盖 -->
  <el-dialog
    v-bind="$attrs"
    v-model="visible"
    :fullscreen="isFullScreen"
    :class="[bem.b(), bem.is('drag-disabled', !dragEnabled)]"
    @open="handleOpen"
    @close="handleClose"
  >
    <!-- 头部 = 拖拽手柄：铺满 EP header 内容区，只有按住这里才能拖，内容区不受影响 -->
    <template #header>
      <div ref="headerRef" v-draggable="dragEnabled" :class="bem.e('header')">
        <span :class="bem.e('title')">
          <slot name="header">{{ title }}</slot>
        </span>
        <!-- mousedown.stop 很关键：否则点全屏按钮会同时触发拖拽 -->
        <el-button
          v-if="showFullScreenButton"
          :class="bem.e('fullscreen-btn')"
          :icon="isFullScreen ? Aim : FullScreen"
          :title="isFullScreen ? '退出全屏' : '全屏'"
          text
          @mousedown.stop
          @click.stop="toggleFullScreen"
        />
      </div>
    </template>

    <slot />

    <template #footer>
      <slot name="footer">
        <el-button @click="handleCancel">取 消</el-button>
        <el-button type="primary" @click="handleConfirm">确 定</el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-pro-dialog {
  // 拖拽手柄：flex 排布让标题与全屏按钮分居两侧；
  // padding-right 为 EP 绝对定位的关闭按钮（headerbtn）预留位置，防止两按钮重叠
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 44px;
    cursor: move;
    user-select: none;
  }

  &__title {
    flex: 1;
    overflow: hidden;
    font-size: var(--el-dialog-title-font-size, 16px);
    color: var(--el-dialog-title-text-color, var(--el-text-color-primary));
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 禁用拖拽时手柄恢复默认光标（全屏态 / draggable=false）
  &.is-drag-disabled &__header {
    cursor: default;
  }
}
</style>
