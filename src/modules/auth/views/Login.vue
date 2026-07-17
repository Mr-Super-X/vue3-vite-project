<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({ username: 'admin', password: '123456' })
const loading = reactive({ value: false })

async function handleSubmit() {
  loading.value = true
  try {
    await userStore.login(form)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) ?? '/dashboard'
    router.push(redirect)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-card class="login-card">
    <h2>{{ $t('auth.login') }}</h2>
    <el-form @submit.prevent="handleSubmit">
      <el-form-item :label="$t('auth.username')">
        <el-input v-model="form.username" />
      </el-form-item>
      <el-form-item :label="$t('auth.password')">
        <el-input v-model="form.password" type="password" />
      </el-form-item>
      <el-button type="primary" :loading="loading.value" @click="handleSubmit">
        {{ $t('auth.login') }}
      </el-button>
    </el-form>
  </el-card>
</template>

<style scoped>
.login-card {
  width: 400px;
}
</style>
