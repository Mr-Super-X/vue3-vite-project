import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDashboardStore = defineStore('module-dashboard', () => {
  const stats = ref({ userCount: 128, onlineCount: 12, todayVisits: 256 })
  return { stats }
})
