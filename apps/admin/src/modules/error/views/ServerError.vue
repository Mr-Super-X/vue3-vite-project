<script setup lang="ts">
/**
 * 500 服务器内部错误页（守卫捕获异常后跳此路由）。
 * 视觉与交互统一走 @vv/ui 的 <ErrorPage />（全局自动注册，无须 import），返回工作台。
 *
 * @see [`../../router/guards/auth`](../../router/guards/auth.ts) 守卫消费方
 * @see [`../routes/index.ts`](../routes/index.ts) 路由 /500
 * @see [`../../../../../../packages/ui/src/components/common/ErrorPage/ErrorPage.vue`](../../../../../../packages/ui/src/components/common/ErrorPage/ErrorPage.vue) 共享错误页组件
 * @group 业务模块：Error
 */
</script>

<template>
  <ErrorPage status="500" title="服务器开小差了" return-to="/workbench" return-label="返回工作台" />
</template>
