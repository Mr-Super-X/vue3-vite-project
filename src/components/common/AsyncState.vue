<script setup lang="ts">
interface Props {
  loading: boolean
  error: Error | null
  isEmpty: boolean
}
defineProps<Props>()
const emit = defineEmits<{ retry: [] }>()

// 运行时 BEM 命名空间：vv-async-state
const bem = createNamespace('async-state')
</script>

<template>
  <div :class="bem.b()">
    <template v-if="loading">
      <slot name="loading"><el-skeleton :rows="3" animated /></slot>
    </template>
    <template v-else-if="error">
      <slot name="error" :error="error" :retry="() => emit('retry')">
        <el-result icon="error" :title="error.message">
          <template #extra>
            <el-button type="primary" @click="emit('retry')">重试</el-button>
          </template>
        </el-result>
      </slot>
    </template>
    <template v-else-if="isEmpty">
      <slot name="empty"><el-empty description="暂无数据" /></slot>
    </template>
    <template v-else>
      <slot />
    </template>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-async-state {
}
</style>
