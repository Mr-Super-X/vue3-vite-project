<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
// ElMessage 由 unplugin-auto-import 注入（importStyle 自动带样式，勿显式 import）
import { User, Lock, View, Hide } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useAppRouter } from '@/composables/useAppRouter'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('login')

const { router } = useAppRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref()
const form = reactive({ username: 'admin', password: '123456' })
const loading = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)

const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, message: '账号至少 3 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(form)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/home'
    router.push(redirect)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '登录失败，请重试'
    ElMessage.error(msg)
    console.error('[Login] 登录失败', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div :class="bem.b()">
    <!-- 背景层 -->
    <div :class="bem.e('bg')" aria-hidden="true">
      <div :class="bem.e('bg-grid')" />
      <div :class="[bem.e('bg-orb'), bem.em('bg-orb', 'a')]" />
      <div :class="[bem.e('bg-orb'), bem.em('bg-orb', 'b')]" />
      <div :class="[bem.e('bg-orb'), bem.em('bg-orb', 'c')]" />
    </div>

    <!-- 卡片 -->
    <el-card :class="bem.e('card')" shadow="never">
      <!-- 品牌区 -->
      <div :class="bem.e('brand')">
        <div :class="bem.e('logo')" aria-hidden="true">
          <span :class="bem.e('logo-piece')" />
          <span :class="bem.e('logo-piece')" />
          <span :class="bem.e('logo-piece')" />
          <span :class="bem.e('logo-piece')" />
        </div>
        <h1 :class="bem.e('title')">企业中后台管理</h1>
        <p :class="bem.e('subtitle')">应急指挥 · 数据中台</p>
      </div>

      <!-- 表单 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :class="bem.e('form')"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="账号" prop="username">
          <el-input
            v-model="form.username"
            :prefix-icon="User"
            placeholder="请输入账号"
            autocomplete="username"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            :prefix-icon="Lock"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            autocomplete="current-password"
          >
            <template #suffix>
              <button
                type="button"
                :class="bem.e('toggle-pwd')"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <el-icon><component :is="showPassword ? Hide : View" /></el-icon>
              </button>
            </template>
          </el-input>
        </el-form-item>

        <div :class="bem.e('actions')">
          <el-checkbox v-model="rememberMe">记住我</el-checkbox>
          <a :class="bem.e('link')" href="#" @click.prevent>忘记密码？</a>
        </div>

        <button type="button" :class="bem.e('submit')" :disabled="loading" @click="handleSubmit">
          <span v-if="loading" :class="bem.e('submit-spinner')" />
          <span>{{ loading ? '登录中...' : '登 录' }}</span>
        </button>
      </el-form>

      <p :class="bem.e('footer')">© 2026 应急指挥中心</p>
    </el-card>
  </div>
</template>

<style lang="scss">
// 样式抽离到 ./styles/login.scss（单文件行数铁律 ≤400）；与 portal/index.vue 引用外部 scss 的模式一致
@use '../styles/login.scss';
</style>
