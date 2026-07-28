import type { MockMethod } from 'vite-plugin-mock'
import type { OverviewCardDto } from '@/modules/home/types/portal-overview'

const MOCK_CARDS: OverviewCardDto[] = [
  {
    code: 'law',
    title: '执法监管',
    iconName: 'odometer',
    iconBg: 'rgba(1, 107, 230, 0.10)',
    metrics: [
      { label: '检查总数', unit: '(项)', value: 1959, trend: 'down', trendText: '▼ 8.5%' },
      { label: '执法计划完成率', unit: '(%)', value: 89, trend: 'up', trendText: '▲ 3.9%' },
      {
        label: '行政处罚总金额',
        unit: '(万元)',
        value: 6592,
        trend: 'up',
        trendText: '▲ 8.8%',
      },
    ],
    viewDetailPath: '/law-enforcement',
  },
  {
    code: 'monitor',
    title: '监测预警',
    iconName: 'warning-filled',
    iconBg: 'rgba(252, 90, 90, 0.10)',
    metrics: [
      { label: '企业接入总数', unit: '(家)', value: 7709, trend: 'up', trendText: '▲ 7.3%' },
      { label: '风险预警总数', unit: '(项)', value: 3052, trend: 'down', trendText: '▼ 1.3%' },
      { label: '监测报警总数', unit: '(项)', value: 4159, trend: 'up', trendText: '▲ 4.7%' },
    ],
    viewDetailPath: '/monitor',
  },
  {
    code: 'safety',
    title: '安评监管',
    iconName: 'document-checked',
    iconBg: 'rgba(40, 206, 142, 0.10)',
    metrics: [
      { label: '机构总数', unit: '(家)', value: 336, trend: 'down', trendText: '▼ 30%' },
      { label: '项目总数', unit: '(项)', value: 739, trend: 'up', trendText: '▲ 39%' },
      { label: '风险预警数', unit: '(项)', value: 199, trend: 'up', trendText: '▲ 66%' },
    ],
    viewDetailPath: '/safety',
  },
  {
    code: 'training',
    title: '培训监管',
    iconName: 'user-filled',
    iconBg: 'rgba(1, 107, 230, 0.10)',
    metrics: [
      { label: '已备案总数', unit: '(项)', value: 522, trend: 'up', trendText: '▲ 48%' },
      { label: '课程监管数', unit: '(项)', value: 620, trend: 'down', trendText: '▼ 30%' },
      { label: '持证总数', unit: '(本)', value: 870, trend: 'up', trendText: '▲ 85%' },
    ],
    viewDetailPath: '/training',
  },
  {
    code: 'hazard',
    title: '隐患排查',
    iconName: 'search',
    iconBg: 'rgba(255, 166, 79, 0.10)',
    metrics: [
      { label: '企业接入数', unit: '(项)', value: 569, trend: 'down', trendText: '▼ 8.5%' },
      { label: '隐患整改率', unit: '(%)', value: 99, trend: 'down', trendText: '▼ 8.5%' },
      { label: '重大隐患', unit: '(项)', value: 932, trend: 'up', trendText: '▲ 64%' },
    ],
    viewDetailPath: '/hazard',
  },
]

// 注意：mock response 必须是同步函数；200ms timeout 模拟接口延迟，便于观察 Loading 骨架
export default [
  {
    url: '/api/portal/overview',
    method: 'get',
    timeout: 200,
    response: () => ({ code: 200, message: 'ok', data: MOCK_CARDS }),
  },
] as MockMethod[]
