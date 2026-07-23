// 字典 API
//
// 返回业务常用的"枚举字典"（用户状态、订单状态、角色类型等）。
// 后端按 type 分组，前端用 useDict('xxx') 自动管理缓存与 loading。
// 内置 30s TTL 内存缓存（http.ts 拦截器层），防重复请求与雪崩。

import { request } from '../http'

export interface DictEntry {
  /** 业务值（el-select 的 :value） */
  value: string | number
  /** 显示文本 */
  label: string
  /** 业务扩展字段（颜色、是否禁用等，按需扩展） */
  [key: string]: unknown
}

export const dictApi = {
  /**
   * 按字典类型获取所有条目（如 'user_status' / 'order_status'）。
   *
   * 业务侧不要直接调本方法，请用 `useDict(key)` composable：
   *   - 自动 lazy fetch（首次访问才发请求）
   *   - 30s TTL 内复用缓存
   *   - 返回 reactive `{ options, loading, getLabel, refresh }`
   *
   * @param type 字典类型（如 'user_status'）
   */
  getByType: (type: string) =>
    request<DictEntry[]>({
      url: `/dict/${type}`,
      method: 'get',
      // 30s TTL 内存缓存（拦截器层自动应用，相同 url + params 不重复发）
      cache: { ttl: 30 },
    }),
}
