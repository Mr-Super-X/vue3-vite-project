// 类型挂钩（2026-10-26 测试审计 #2）：mock 数据与 @vv/shared api 层类型绑定——
// 改 UserItem 契约时编译器即时报错，杜绝「api 层演化、mock 静默偏离」。
// import type 编译期擦除，vite-plugin-mock 的 esbuild bundle 不含运行时依赖（同 pro-table 先例）
import type { UserItem } from '@vv/shared'

export function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function paginate<T>(list: T[], page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize
  return { list: list.slice(start, start + pageSize), total: list.length, page, pageSize }
}

const NAMES = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十']
const ROLES = ['admin', 'user', 'guest']
export function generateUsers(count: number): UserItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: NAMES[i % NAMES.length] ?? `用户${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ROLES[i % ROLES.length] ?? 'user',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }))
}
