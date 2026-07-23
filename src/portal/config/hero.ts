import type { HeroConfig } from './types'

export const HERO_CONFIG: HeroConfig = {
  slogan: '智慧监管·精准预警·数据真实·责任在肩',
  hotSearches: ['矿山', '危险化学品', '国寿', '烟爆花竹', '交通运输', '民用爆炸物'],
  searchTypes: [
    { label: '企业', value: 'company' },
    { label: '机构', value: 'org' },
    { label: '自然人', value: 'person' },
  ],
  searchPlaceholder: '请输入您想查询的关键字（查企业、查机构、查自然人）',
}
