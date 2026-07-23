import { request } from '../http'
import type { OverviewCardDto } from '@/modules/dashboard/types/portal-overview'

export const portalOverviewApi = {
  /** 获取门户首页数据总览卡片（5 张）。错误由 http.ts 响应拦截器归一为 ApiError。 */
  getOverview: () => request<OverviewCardDto[]>({ url: '/portal/overview', method: 'get' }),
}
