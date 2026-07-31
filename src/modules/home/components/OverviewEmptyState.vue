<script setup lang="ts">
import { DocumentRemove } from '@element-plus/icons-vue'
</script>

<template>
  <div class="ov-empty">
    <el-icon :size="48" color="#909399"><DocumentRemove /></el-icon>
    <p class="ov-empty__title">暂无数据</p>
    <p class="ov-empty__hint">当前时间段未查询到统计指标</p>
  </div>
</template>

<style lang="scss" scoped>
.ov-empty {
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
