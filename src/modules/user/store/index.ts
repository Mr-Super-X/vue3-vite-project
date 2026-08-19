import type { UserItem } from '@/api/modules/user'

export const useUserListStore = defineStore('module-user-list', () => {
  const keyword = ref('')
  const selectedRows = ref<UserItem[]>([])
  function setKeyword(k: string) {
    keyword.value = k
  }
  function clearSelection() {
    selectedRows.value = []
  }
  return { keyword, selectedRows, setKeyword, clearSelection }
})
