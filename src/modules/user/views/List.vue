<script setup lang="ts">
import { useRequest } from '@/composables/useRequest'
import { userApi } from '@/api/modules/user'
import AsyncState from '@/components/common/AsyncState.vue'

const { data, loading, error, isEmpty, execute } = useRequest(() =>
  userApi.getList({ page: 1, pageSize: 10 })
)

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('user-list')
</script>

<template>
  <div :class="bem.b()">
    <AsyncState :loading="loading" :error="error" :is-empty="isEmpty" @retry="execute">
      <el-table :data="data?.list ?? []" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色" />
      </el-table>
    </AsyncState>
  </div>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-user-list {
  padding: 24px;
}
</style>
