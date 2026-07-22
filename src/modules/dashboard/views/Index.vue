<script setup lang="ts">
import { useLogout } from '@/composables/useLogout'

const { loggingOut, confirmLogout } = useLogout()
</script>

<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <h1>{{ $t('menu.dashboard') }}</h1>
      <el-button type="warning" plain :loading="loggingOut" @click="confirmLogout">
        退出登录
      </el-button>
    </header>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card>
          <div>用户总数：128</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div>在线用户：12</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div>今日访问：256</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
}
</style>
