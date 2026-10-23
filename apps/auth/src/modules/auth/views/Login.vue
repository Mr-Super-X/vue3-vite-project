<script setup lang="ts">
/**
 * 登录页（blank 布局，apps/auth 统一登录入口）。
 *
 * 提交流程：
 * 1. `formRef.value.validate()` 同步校验账号 / 密码（≥3 / ≥6 位）
 * 2. 调用 `userStore.login(form)` 触发 authApi
 * 3. 成功后 `resolvePostLoginRedirect('/admin/')` 解析回跳目标（同源前缀校验，
 *    防开放重定向），整页 `location.href` 跳回原 app——跨应用无共享 router 实例，
 *    不可 router.push（P4 跨应用统一登录协议，@vv/shared auth/redirect.ts）
 * 4. 失败统一 ElMessage.error，错误对象归一化（Error.message / '登录失败'）
 *
 * 表单默认值：`admin / 123456`（仅演示用，生产应改 SSO / 短信验证码）。
 *
 * @see [`@/store/modules/user`](../../../store/modules/user.ts) 登录态
 * @see [`@vv/shared/auth/redirect`](../../../../../packages/shared/src/auth/redirect.ts) 回跳协议
 * @see [`../styles/login.scss`](../styles/login.scss) 样式抽离
 * @group 业务模块：Auth
 */
// ElMessage 由 unplugin-auto-import 注入（importStyle 自动带样式，勿显式 import）
import { User, Lock, View, Hide } from '@element-plus/icons-vue'
import { useUserStore } from '@vv/shared'
import { resolvePostLoginRedirect, withRepoPrefix } from '@vv/shared'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('login')

const userStore = useUserStore()

const formRef = ref()
const form = reactive({ username: 'admin', password: '123456' })
const loading = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)

// 品牌文案统一走 VITE_APP_TITLE（与 main.ts 初始化 document.title 同源），避免硬编码业务名
const appTitle = import.meta.env.VITE_APP_TITLE || '统一登录'

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
    // 跨应用回跳：redirect 查询参数由来源 app 的 redirectToAuthLogin 写入；
    // fallback 登录后默认回管理端落地页（经 withRepoPrefix 加部署前缀——gh-pages 不 404）
    window.location.href = resolvePostLoginRedirect(withRepoPrefix('/admin/'))
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
        <h1 :class="bem.e('title')">{{ appTitle }}</h1>
        <p :class="bem.e('subtitle')">跨应用统一登录入口</p>
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

      <p :class="bem.e('footer')">© 2026 {{ appTitle }}中心</p>
    </el-card>
  </div>
</template>

<style lang="scss">
// 样式抽离到 ./styles/login.scss（单文件行数铁律 ≤400）；与 portal/index.vue 引用外部 scss 的模式一致
@use '../styles/login.scss';
</style>
