<script setup lang="ts">
import { DocumentRemove } from '@element-plus/icons-vue'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('overview-empty-state')
</script>

<template>
  <div :class="bem.b()">
    <el-icon :size="48" color="#909399"><DocumentRemove /></el-icon>
    <p :class="bem.e('title')">暂无数据</p>
    <p :class="bem.e('hint')">当前时间段未查询到统计指标</p>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-overview-empty-state {
  background: #fff;
  border-radius: 8px;
  padding: 48px;
  text-align: center;
  border: 1px solid #ebeef5;

  &__title {
    font-size: 16px;
    color: #303133;
    margin: 16px 0 4px;
  }

  &__hint {
    font-size: 13px;
    color: #909399;
    margin: 0;
  }
}
</style>
