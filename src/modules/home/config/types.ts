/**
 * 首页配置类型集合（Hero / Footer 共用）。
 *
 * @see [`./hero`](./hero.ts) HERO_CONFIG
 * @see [`./footer`](./footer.ts) FOOTER_LINKS
 * @see [`../components/SearchBar.vue`](../components/SearchBar.vue) SearchTypeOption 消费方
 * @see [`../components/HomeFooter.vue`](../components/HomeFooter.vue) FooterLink 消费方
 * @group 业务模块：Home
 */

/**
 * 首页搜索类型选项（SearchBar 使用）
 */
export interface SearchTypeOption {
  label: string
  value: string
}

/**
 * 首页底部单个链接（HomeFooter 使用）
 */
export interface FooterLink {
  label: string
  href: string
}
