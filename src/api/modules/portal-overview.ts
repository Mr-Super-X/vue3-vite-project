/**
 * 门户首页数据总览 API。
 *
 * 设计要点：
 * - 单 endpoint 返回 5 张数据卡片（订单数、用户数、营收等）
 * - 错误由 `http.ts` 响应拦截器归一为 `ApiError`，业务侧无须 try/catch
 * - 缓存策略由调用方 `useRequest` 决定（默认无缓存）
 *
 * @see [`src/modules/home/views/Index.vue`](../../modules/home/views/Index.vue) 业务调用示例
 * @see [`src/modules/home/types/portal-overview.ts`](../../modules/home/types/portal-overview.ts) 数据结构
 * @group 业务 API：门户总览
 */

import { request } from '../http'
import type { OverviewCardDto } from '@/modules/home/types/portal-overview'

export const portalOverviewApi = {
  /**
   * 获取门户首页数据总览卡片（5 张）。
   * @group 业务 API：门户总览
   */
  getOverview: () => request<OverviewCardDto[]>({ url: '/portal/overview', method: 'get' }),
}
