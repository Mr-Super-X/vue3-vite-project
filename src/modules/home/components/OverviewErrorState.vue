<script setup lang="ts">
/**
 * 数据总览错误态：错误信息 + 重新加载按钮。
 *
 * emit('retry') 由父容器（OverviewSection）重新触发 store.fetch()。
 *
 * A11y：`role="alert"` 让屏幕阅读器立即播报错误内容。
 *
 * @see [`./OverviewSection.vue`](./OverviewSection.vue) 父容器
 * @group 业务模块：Home
 */
import { CircleCloseFilled } from '@element-plus/icons-vue'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('overview-error-state')

defineProps<{ message: string }>()
defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div :class="bem.b()" role="alert">
    <el-icon :size="48" color="#F56C6C"><CircleCloseFilled /></el-icon>
    <p :class="bem.e('title')">数据加载失败</p>
    <p :class="bem.e('detail')">{{ message }}</p>
    <el-button type="primary" @click="$emit('retry')">重新加载</el-button>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-overview-error-state {
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

  &__detail {
    font-size: 13px;
    color: #909399;
    margin: 0 0 16px;
  }
}
</style>
