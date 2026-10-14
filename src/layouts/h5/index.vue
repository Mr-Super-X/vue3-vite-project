<script setup lang="ts">
/**
 * H5 布局：移动端面板基座（rem 适配）。
 *
 * 消费方式（与 portal / default 同构）：路由父记录 component 直挂本布局即获得能力——
 *   { path: '/h5-demo', component: () => import('@/layouts/h5/index.vue'), children: [...] }
 *
 * 能力来源：
 *   - 编译时：本目录（src/layouts/h5/）与 src/modules/h5-xxx/（h5- 前缀模块）下的样式写 px，
 *     postcss-pxtorem 自动转 rem（见 build/postcss.ts）
 *   - 运行时：onMounted 激活 html fontSize 动态计算（宽屏限 540px 居中），
 *     onUnmounted 恢复进入前状态——对 default / portal 布局零残留（见 ./config/rem.ts）
 *
 * 注意：本布局不设计为被 keep-alive 缓存（项目 keep-alive 只作用于 default 内业务页）。
 *
 * @see [`./config/rem.ts`](./config/rem.ts) rem 激活/恢复
 * @group 布局
 */
import { activateRem, deactivateRem } from './config/rem'

// 运行时 BEM 命名空间：vv-h5-layout
const bem = createNamespace('h5-layout')

onMounted(activateRem)
onUnmounted(deactivateRem)
</script>

<template>
  <div :class="bem.b()">
    <RouterView />
  </div>
</template>

<style lang="scss">
// 本文件在 postcss-pxtorem 转换范围内（src/layouts/h5/），直接写 828 设计稿 px 即可
.#{$BEM_PREFIX}-h5-layout {
  min-height: 100vh;
  background: #f7f8fa;
}
</style>
