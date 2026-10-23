<script setup lang="ts">
/**
 * 403 无权访问页（v-auth 守卫拒绝后跳此路由）。
 * 视觉与交互统一走 @vv/ui 的 <ErrorPage />（全局自动注册，无须 import），返回工作台。
 *
 * @see [`../../router/guards/auth`](../../router/guards/auth.ts) 守卫消费方
 * @see [`../routes/index.ts`](../routes/index.ts) 路由 /403
 * @see `@vv/ui/components/common/ErrorPage/ErrorPage.vue` 共享错误页组件
 * @group 业务模块：Error
 */
</script>

<template>
  <ErrorPage status="403" title="无权访问此页面" return-to="/workbench" return-label="返回工作台" />
</template>
