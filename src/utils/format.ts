/**
 * 简易日期格式化（仅取日期部分 YYYY-MM-DD）。
 *
 * 与 dayjs 的 formatDate（完整日期 + 时间）区分：
 *   - formatDateOnly：固定输出 YYYY-MM-DD，输入非法返回 fallback
 *   - formatDate（dayjs）：自定义格式串 + locale 桥接
 *
 * 用法：列表展示日期列快速渲染，无需调用 dayjs。
 */
export function formatDateOnly(input: string | Date, fallback = '-'): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return fallback
  return date.toISOString().slice(0, 10)
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text
}
