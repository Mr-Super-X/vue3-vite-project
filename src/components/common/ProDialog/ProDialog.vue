<script setup lang="ts">
/**
 * ProDialog 高级弹窗（声明式入口）。
 *
 * 在 ElDialog 基础上扩展三项能力：
 * - 头部拖拽：`v-draggable` 指令实现，可限制在视口边界内（EP 原生 draggable 无边界限制，
 *   拖出屏幕后无法找回，故不用原生）
 * - 全屏切换：走 EP 原生 `fullscreen` 机制，头部自带切换按钮，全屏态自动禁用拖拽
 * - 头部操作组靠右对齐：全屏 + 关闭按钮一组（EP 原生 X 绝对定位与 flex 流对不齐，
 *   收编为自绘按钮，`show-close` / `before-close` 语义保持对齐原生 X）
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
import { Aim, Close, FullScreen } from '@element-plus/icons-vue'

// BEM 命名空间：vv-pro-dialog（createNamespace 由 unplugin-auto-import 注入）
const bem = createNamespace('pro-dialog')

// 原生 Props 走 $attrs 透传，关闭自动继承避免与 v-bind="$attrs" 双重绑定
// （监听器双绑会导致事件回调执行两次）
defineOptions({ inheritAttrs: false })

const attrs = useAttrs() // vue

// 头部关闭按钮收编为自绘（与全屏按钮组成一组靠右对齐，见文件头「头部布局」说明），
// 需把用户传入的 show-close 从透传集合中剥离，避免 EP 再渲染一个绝对定位的原生 X
// （kebab / camel 两种写法都剥离）
const dialogAttrs = computed(() => {
  const { 'show-close': _kebab, showClose: _camel, ...rest } = attrs
  return rest
})

// show-close 语义保留：默认显示自绘关闭按钮，用户传 :show-close="false" 时隐藏
const showClose = computed(() => {
  const v = (attrs['show-close'] ?? attrs['showClose']) as boolean | undefined
  return v ?? true
})

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

/**
 * 自绘关闭按钮：语义对齐 EP 原生 X——beforeClose 存在时交给它决定是否关闭
 * （EP 仅在通过其内部途径关闭时调用 beforeClose，这里复刻同一语义；
 * ESC / 遮罩点击仍走 EP 内部途径，beforeClose 由 EP 自己调用）
 */
function handleCloseClick(): void {
  // 模板写法是 before-close（kebab），render 函数/对象传参可能是 beforeClose（camel），两者都认
  const beforeClose = (attrs['before-close'] ?? attrs['beforeClose']) as
    ((done: () => void) => void) | undefined
  if (beforeClose) {
    beforeClose(() => {
      visible.value = false
    })
    return
  }
  visible.value = false
}
</script>

<template>
  <!-- v-bind="dialogAttrs" 必须在最前：原生 props（width/top/modal/beforeClose 等）先落位，
       后面的显式绑定（fullscreen/class/show-close 等）才能按需覆盖；
       show-close 恒为 false——原生 X 已收编进下方头部 actions 组（对齐问题见样式注释） -->
  <el-dialog
    v-bind="dialogAttrs"
    v-model="visible"
    :fullscreen="isFullScreen"
    :show-close="false"
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
        <!-- 操作组：全屏 + 关闭一组靠右。两按钮都需 mousedown.stop / click.stop，
             否则点按钮会同时触发拖拽或冒泡到 EP header -->
        <div :class="bem.e('actions')">
          <el-button
            v-if="showFullScreenButton"
            :class="[bem.e('action-btn'), bem.e('fullscreen-btn')]"
            :icon="isFullScreen ? Aim : FullScreen"
            :title="isFullScreen ? '退出全屏' : '全屏'"
            text
            @mousedown.stop
            @click.stop="toggleFullScreen"
          />
          <el-button
            v-if="showClose"
            :class="[bem.e('action-btn'), bem.e('close-btn')]"
            :icon="Close"
            title="关闭"
            text
            @mousedown.stop
            @click.stop="handleCloseClick"
          />
        </div>
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
  // 拖拽手柄：标题与操作组（全屏+关闭）分居两侧，操作组整组靠右对齐。
  // 关闭按钮收编自绘（EP 原生 X 绝对定位在 header 右侧，与 flex 流内的全屏按钮
  // 对不齐且间距不可控，demo 验证反馈「头部样式很丑」，故弃用原生 X）
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
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

  // 操作组：全屏 + 关闭按钮固定 24×24，靠右排列
  &__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
  }

  &__action-btn {
    width: 24px;
    height: 24px;
    padding: 0;
  }

  // 禁用拖拽时手柄恢复默认光标（全屏态 / draggable=false）
  &.is-drag-disabled &__header {
    cursor: default;
  }
}
</style>
