<script setup lang="ts">
// 报表页（演示 meta.visible 隐藏 + 仍然能直接 URL 访问的能力）
//
// 注：本视图不在菜单中渲染（hidden: true 由 mock 改为 visible: false），
// 但路由仍存在。业务场景：运营报表不希望出现在侧边栏，但客服可以通过邮件链接直达。
</script>

<template>
  <div class="reports-index">
    <h2>运营报表</h2>
    <p>隐藏菜单（hidden: true → meta.visible: false），需手动输入 URL 访问。</p>
    <p>
      权限码：
      <code>reports:view</code>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.reports-index {
  padding: 24px;
}
</style>
