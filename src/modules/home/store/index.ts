export const useHomeStore = defineStore('module-home', () => {
  const stats = ref({ userCount: 128, onlineCount: 12, todayVisits: 256 })
  return { stats }
})
