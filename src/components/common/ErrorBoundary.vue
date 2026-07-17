<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
const error = ref<Error | null>(null)
onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  return false
})
function reset() { error.value = null }
</script>

<template>
  <slot v-if="!error" />
  <el-result v-else icon="error" title="组件渲染出错" :sub-title="error.message">
    <template #extra>
      <el-button type="primary" @click="reset">恢复</el-button>
    </template>
  </el-result>
</template>