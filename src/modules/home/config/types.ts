/**
 * 首页搜索类型选项（SearchBar 使用）
 */
export interface SearchTypeOption {
  label: string
  value: string
}

/**
 * 首页底部链接分组（HomeFooter 使用）
 */
export interface FooterLinkGroup {
  title: string
  links: { label: string; href: string }[]
}
