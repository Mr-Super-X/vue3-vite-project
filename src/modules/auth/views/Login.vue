<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, View, Hide } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useAppRouter } from '@/composables/useAppRouter'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('auth-login')

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
        <h1 :class="bem.e('title')">工贸统一登录门户</h1>
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
.#{$BEM_PREFIX}-auth-login {
  // ====== CSS 变量（仅本组件作用域） ======
  --login-bg-base: #0a1428;
  --login-bg-deep: #050b1a;
  --login-bg-tint: #1e3a8a;
  --login-bg-grid: rgba(56, 189, 248, 0.06);
  --login-accent: #38bdf8;
  --login-accent-glow: rgba(56, 189, 248, 0.4);
  --login-accent-hover: #7dd3fc;
  --login-card-bg: rgba(15, 23, 42, 0.75);
  --login-card-border: rgba(56, 189, 248, 0.18);
  --login-text-primary: #e2e8f0;
  --login-text-secondary: #94a3b8;
  --login-text-muted: #64748b;
  --login-input-bg: rgba(15, 23, 42, 0.6);
  --login-input-border: rgba(56, 189, 248, 0.2);
  --login-input-focus: rgba(56, 189, 248, 0.4);
  --login-error: #f87171;

  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 32px;
  overflow: hidden;
  background: radial-gradient(
    ellipse at top,
    var(--login-bg-tint) 0%,
    var(--login-bg-base) 60%,
    var(--login-bg-deep) 100%
  );
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--login-text-primary);
  box-sizing: border-box;

  // ====== 背景层 ======
  &__bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  &__bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--login-bg-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--login-bg-grid) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  }

  &__bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    will-change: transform;
  }

  &__bg-orb--a {
    top: -10%;
    left: -5%;
    width: 500px;
    height: 500px;
    background: rgba(56, 189, 248, 0.15);
    animation: login-float-a 16s ease-in-out infinite alternate;
  }

  &__bg-orb--b {
    bottom: -15%;
    right: -10%;
    width: 480px;
    height: 480px;
    background: rgba(99, 102, 241, 0.12);
    animation: login-float-b 20s ease-in-out infinite alternate;
  }

  &__bg-orb--c {
    top: 50%;
    left: 50%;
    width: 300px;
    height: 300px;
    transform: translate(-50%, -50%);
    background: rgba(14, 165, 233, 0.1);
    animation: login-float-c 12s ease-in-out infinite alternate;
  }

  @keyframes login-float-a {
    from {
      transform: translate(0, 0);
    }
    to {
      transform: translate(60px, 40px);
    }
  }
  @keyframes login-float-b {
    from {
      transform: translate(0, 0);
    }
    to {
      transform: translate(-50px, -30px);
    }
  }
  @keyframes login-float-c {
    from {
      transform: translate(-50%, -50%) scale(1);
    }
    to {
      transform: translate(-50%, -50%) scale(1.2);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &__bg-orb--a,
    &__bg-orb--b,
    &__bg-orb--c {
      animation: none;
    }
  }

  // ====== 卡片 ======
  &__card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 440px;
    padding: 0;
    background: var(--login-card-bg) !important;
    border: 1px solid var(--login-card-border) !important;
    border-radius: 16px !important;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    animation: login-fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;

    @supports not (backdrop-filter: blur(1px)) {
      background: rgba(15, 23, 42, 0.95) !important;
    }

    :deep(.el-card__body) {
      padding: 40px 36px 32px;
    }
  }

  @keyframes login-fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // ====== 品牌区 ======
  &__brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 32px;
    text-align: center;
  }

  &__logo {
    position: relative;
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
  }

  &__logo-piece {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, var(--login-accent) 0%, #0ea5e9 100%);
    border-radius: 4px;
    transform-origin: center;
    box-shadow: 0 0 16px var(--login-accent-glow);

    &:nth-child(1) {
      transform: translate(-50%, -50%) translate(-7px, -7px) rotate(45deg);
    }
    &:nth-child(2) {
      transform: translate(-50%, -50%) translate(7px, -7px) rotate(45deg);
      opacity: 0.85;
    }
    &:nth-child(3) {
      transform: translate(-50%, -50%) translate(-7px, 7px) rotate(45deg);
      opacity: 0.7;
    }
    &:nth-child(4) {
      transform: translate(-50%, -50%) translate(7px, 7px) rotate(45deg);
      opacity: 0.55;
    }
  }

  &__title {
    margin: 0 0 4px;
    font-size: 24px;
    font-weight: 600;
    color: var(--login-text-primary);
    letter-spacing: 0.5px;
  }

  &__subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--login-text-secondary);
    letter-spacing: 1px;
  }

  // ====== 表单 ======
  &__form {
    :deep(.el-form-item__label) {
      color: var(--login-text-secondary);
      font-size: 13px;
      font-weight: 500;
      padding-bottom: 6px;
      line-height: 1.4;
    }

    :deep(.el-input__wrapper) {
      background: var(--login-input-bg) !important;
      border-radius: 8px !important;
      box-shadow: 0 0 0 1px var(--login-input-border) inset !important;
      transition: box-shadow 0.2s ease;
      padding: 4px 12px;
      min-height: 44px;
    }

    :deep(.el-input__wrapper:hover) {
      box-shadow: 0 0 0 1px var(--login-accent-glow) inset !important;
    }

    :deep(.el-input__wrapper.is-focus) {
      box-shadow:
        0 0 0 1px var(--login-accent) inset,
        0 0 0 3px var(--login-input-focus) !important;
    }

    :deep(.el-input__inner) {
      color: var(--login-text-primary) !important;
      height: 36px;
      font-size: 14px;
    }

    :deep(.el-input__inner::placeholder) {
      color: var(--login-text-muted);
    }

    :deep(.el-input__prefix-inner > .el-icon),
    :deep(.el-input__prefix .el-icon) {
      color: var(--login-text-secondary);
    }
  }

  &__toggle-pwd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--login-text-secondary);
    cursor: pointer;
    border-radius: 4px;
    transition:
      color 0.2s ease,
      background 0.2s ease;

    &:hover {
      color: var(--login-accent);
      background: rgba(56, 189, 248, 0.1);
    }

    &:focus-visible {
      outline: 2px solid var(--login-accent);
      outline-offset: 2px;
    }

    .el-icon {
      font-size: 16px;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 20px;

    :deep(.el-checkbox__label) {
      color: var(--login-text-secondary);
      font-size: 13px;
    }

    :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
      background: var(--login-accent) !important;
      border-color: var(--login-accent) !important;
    }
  }

  &__link {
    color: var(--login-text-secondary);
    font-size: 13px;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--login-accent-hover);
      text-decoration: underline;
    }
  }

  // ====== 提交按钮 ======
  &__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 48px;
    padding: 0;
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
    background-size: 200% 100%;
    background-position: left center;
    color: #0a1428;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 4px;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

    &:hover:not(:disabled) {
      background-position: right center;
      box-shadow: 0 8px 24px var(--login-accent-glow);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(56, 189, 248, 0.3);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid var(--login-accent);
      outline-offset: 2px;
    }
  }

  &__submit-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(10, 20, 40, 0.3);
    border-top-color: #0a1428;
    border-radius: 50%;
    animation: login-spin 0.8s linear infinite;
  }

  @keyframes login-spin {
    to {
      transform: rotate(360deg);
    }
  }

  // ====== 底部版权 ======
  &__footer {
    margin: 24px 0 0;
    text-align: center;
    color: var(--login-text-muted);
    font-size: 12px;
  }

  // ====== 响应式 ======
  @media (max-width: 480px) {
    padding: 6vh 16px 24px;

    &__card :deep(.el-card__body) {
      padding: 28px 24px 24px;
    }

    &__title {
      font-size: 20px;
    }

    &__bg-orb--a,
    &__bg-orb--c {
      width: 320px;
      height: 320px;
    }
  }
}
</style>
