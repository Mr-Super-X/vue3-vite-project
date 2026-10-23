<script setup lang="ts">
/**
 * 404 页面不存在页（catch-all 兜底 + 手动访问 /404）。
 * 视觉与交互统一走 @vv/ui 的 <ErrorPage />（全局自动注册，无须 import），返回工作台。
 *
 * @see [`../../router/index.ts`](../../router/index.ts) catch-all 注册
 * @see [`../routes/index.ts`](../routes/index.ts) 路由 /404
 * @see `@vv/ui/components/common/ErrorPage/ErrorPage.vue` 共享错误页组件
 * @group 业务模块：Error
 */
</script>

<template>
  <ErrorPage status="404" title="页面不存在" return-to="/workbench" return-label="返回工作台" />
</template>
