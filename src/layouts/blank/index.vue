<template>
  <div class="blank-layout">
    <RouterView />
  </div>
</template>

<style scoped>
.blank-layout {
  min-height: 100vh;
  background: #f5f7fa;
  /* 注意：不要用 display: flex + align-items: center + justify-content: center
     ——这会把子内容水平垂直居中在视口中央，导致内容短时看起来"悬空"。
     让内容顶部对齐即可。 */
}
</style>
