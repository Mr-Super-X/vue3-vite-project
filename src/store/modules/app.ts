import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const globalLoading = ref(false)
  const locale = ref<'zh-CN' | 'en-US'>('zh-CN')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  function setGlobalLoading(v: boolean) {
    globalLoading.value = v
  }
  function setLocale(l: 'zh-CN' | 'en-US') {
    locale.value = l
  }

  return { sidebarCollapsed, globalLoading, locale, toggleSidebar, setGlobalLoading, setLocale }
})
