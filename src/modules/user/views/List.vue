<script setup lang="ts">
/**
 * 用户列表页（演示 useRequest + AsyncState 三态集成）。
 *
 * useRequest 提供 `{ data, loading, error, isEmpty, execute }` 五元组：
 * - `data`：成功响应（UserListResponse，含 list + meta）
 * - `loading` / `error` / `isEmpty`：驱动 AsyncState 三态切换
 * - `execute`：AsyncState 重试按钮触发 refetch
 *
 * @see [`@composables/useRequest`](../../../composables/useRequest.ts) 请求封装
 * @see [`@/components/common/AsyncState`](../../../components/common/AsyncState.vue) 三态容器
 * @see [`@/api/modules/user`](../../../api/modules/user.ts) getList 接口
 * @group 业务模块：User
 */
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
