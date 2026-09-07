/**
 * auth 模块私有 store —— 登录态相关 UI 辅助状态（**非**登录态本身）。
 *
 * 全局用户态见 `@/store/modules/user.ts`，本 store 仅记录登录页相关辅助状态
 * （如登录失败次数），不与全局 user store 耦合，避免污染全局状态。
 *
 * @see [`@/store/modules/user.ts`](../../../store/modules/user.ts) 全局登录态
 * @see [`../views/Login.vue`](../views/Login.vue) 登录页消费方
 * @group 业务模块：Auth
 */
export const useAuthStore = defineStore('module-auth', () => {
  const loginAttempts = ref(0)
  function incrementAttempts() {
    loginAttempts.value++
  }
  function resetAttempts() {
    loginAttempts.value = 0
  }
  return { loginAttempts, incrementAttempts, resetAttempts }
})
