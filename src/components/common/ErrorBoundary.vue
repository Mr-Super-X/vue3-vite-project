<script setup lang="ts">
const error = ref<Error | null>(null)
const emit = defineEmits<{ reset: [] }>()
onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  return false
})
function reset() {
  error.value = null
  // 通知父组件同步清理触发错误的开关（如 props.shouldThrow），
  // 否则 BoomChild 重新挂载时仍会抛错，恢复后瞬间又回到错误页。
  emit('reset')
}

// 运行时 BEM 命名空间：vv-error-boundary
const bem = createNamespace('error-boundary')
</script>

<template>
  <div :class="bem.b()">
    <slot v-if="!error" />
    <el-result v-else icon="error" title="组件渲染出错" :sub-title="error.message">
      <template #extra>
        <el-button type="primary" @click="reset">恢复</el-button>
      </template>
    </el-result>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-error-boundary {
}
</style>
