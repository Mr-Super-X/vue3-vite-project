import { defineStore } from 'pinia'
import { ref } from 'vue'

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
