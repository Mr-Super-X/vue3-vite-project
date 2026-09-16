/**
 * useAutoHeight —— 表格区自动撑满视口剩余高度（v3.1 新增）。
 *
 * 目标体验（中后台列表页标配）：搜索区 / 工具栏 / 表格 / 分页器整体不超出视口，
 * 表头与分页器固定，中间表体随窗口伸缩滚动。
 *
 * 算法（与 vben-admin useTableHeight 同思路，实测 DOM 而非配置估算）：
 *   maxHeight = 视口高 - 根容器顶部到视口顶距离 - 搜索区高 - 工具栏高 - 分页器高
 *               - 固定间距（36px） - 用户 offset 余量
 *
 * 重算时机：mounted 首测 + window resize + ResizeObserver 监听根容器
 * （侧栏折叠等宽度变化会联动子区域换行高度）。测量不到（jsdom / SSR）时
 * maxHeight 保持 null，ElTable 退回默认全量渲染行为，不影响功能。
 *
 * @see [`../ProTable.vue`](../ProTable.vue) 编排层 —— 唯一调用方
 * @group ProTable composables
 */
import { ref, watch, nextTick, onScopeDispose, type Ref } from 'vue' // vue（生命周期/底层 API）

export interface UseAutoHeightOptions {
  /** 是否启用（编排层综合 props.autoHeight 与 virtualized 冲突后传入） */
  enabled: boolean
  /** ProTable 根容器 DOM ref */
  rootEl: Ref<HTMLElement | null>
  /** 附加余量（像素，默认 0）—— AutoHeightConfig.offset，正值让表格更矮 */
  offset?: number
}

export interface UseAutoHeightReturn {
  /** 计算出的表格 max-height；null = 未启用或测量失败（不绑定 prop） */
  maxHeight: Ref<number | null>
}

/** 根容器子区域间距 —— ProTable.vue `& > * + * { margin-top: 12px }`，4 个区域 3 个间距 */
const FIXED_MARGIN_TOTAL = 36
/** 极端窄视口下的高度下限 —— 避免 maxHeight 算出负数/个位数导致表体不可见 */
const MIN_TABLE_HEIGHT = 100

/** 子区域选择器 —— 项目内稳定 BEM class + element-plus 稳定 class（测量目标） */
const SEARCH_SELECTOR = '.vv-pro-table-search'
const HEADER_SELECTOR = '.vv-pro-table-header'
const PAGINATION_SELECTOR = '.el-pagination'

export function useAutoHeight(options: UseAutoHeightOptions): UseAutoHeightReturn {
  const maxHeight = ref<number | null>(null)
  let resizeObserver: ResizeObserver | null = null

  function measure(): void {
    const root = options.rootEl.value
    if (!root) return
    const top = root.getBoundingClientRect().top
    // offsetHeight 不含 margin；margin-top 已由 FIXED_MARGIN_TOTAL 统一扣除
    const searchH = root.querySelector(SEARCH_SELECTOR)?.getBoundingClientRect().height ?? 0
    const headerH = root.querySelector(HEADER_SELECTOR)?.getBoundingClientRect().height ?? 0
    const paginationH = root.querySelector(PAGINATION_SELECTOR)?.getBoundingClientRect().height ?? 0
    const available =
      window.innerHeight -
      top -
      searchH -
      headerH -
      paginationH -
      FIXED_MARGIN_TOTAL -
      (options.offset ?? 0)
    maxHeight.value = Math.max(available, MIN_TABLE_HEIGHT)
  }

  if (options.enabled) {
    // 首测：等子区域渲染完成（SearchForm / TableHeader v-if 会影响 DOM 结构）
    void nextTick(measure)
    window.addEventListener('resize', measure)
    // typeof 守卫：vitest jsdom 与 SSR 环境不提供 ResizeObserver（与 ElementTableV2Body 同模式）
    if (typeof ResizeObserver !== 'undefined' && options.rootEl.value) {
      resizeObserver = new ResizeObserver(measure)
      resizeObserver.observe(options.rootEl.value)
    }
    // rootEl 是 ref，setup 时可能还未挂载（模板 ref 填充晚于 setup）——watch 兜底
    const stopWatch = watch(
      options.rootEl,
      (el) => {
        if (el && typeof ResizeObserver !== 'undefined') {
          resizeObserver?.disconnect()
          resizeObserver = new ResizeObserver(measure)
          resizeObserver.observe(el)
        }
      },
      { flush: 'post' }
    )
    onScopeDispose(() => {
      stopWatch()
      window.removeEventListener('resize', measure)
      resizeObserver?.disconnect()
      resizeObserver = null
    })
  }

  return { maxHeight }
}
