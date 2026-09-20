// 字典 mock 数据（动态路由版）。
//
// ⚠️ vite-plugin-mock 3.0.2 不给 response 传 `params` —— 动态路由参数（:code）
// 被合并进 `query` 字段（requestMiddleware: `query = urlMatch(reqUrl).params`），
// response 签名是 `{ url, body, query, headers }`。读 `params.code` 会得到
// undefined → DICT_DATA[undefined] 抛 TypeError 打崩 dev server（已实测）。
// 所以这里从 `query.code` 取，并对缺失做防御返回 404。
//
// 单条动态路由 /api/dict/:code 服务所有字典 —— 新增字典只需在 DICT_DATA 加键值。
// viteMockServe 扫描整个 mock/ 目录自动注册，本文件无须在 mock/index.ts 手动聚合。
//
// 响应契约：{ code, message, data: DictItem[] }，data 即字典数组
//（DictItem 定义见 src/types/dict.ts，前端主导、后端配合实现）。

import type { MockMethod } from 'vite-plugin-mock'
import type { DictItem } from '../src/types/dict'

/**
 * 字典数据表：key = 字典 code（URL 路径参数）。
 *
 * 约定：
 * - gender / user_status / order_type 为契约演示字典（见 src/modules/demo/examples/Dict.vue）
 * - user_status.locked 带 `disabled: true` —— 契约要求至少一个禁用项，演示 DictSelect 禁选
 * - role 被 store 的 PRELOAD_DICT_KEYS（登录预加载）引用，勿删
 * - order_status 保留兼容存量引用
 */
const DICT_DATA: Record<string, DictItem[]> = {
  // 性别
  gender: [
    { value: 'male', label: '男' },
    // cssClass 透传演示：该类名在 Dict.vue 演示页有配套样式（粉色系标签）
    { value: 'female', label: '女', cssClass: 'vv-dict-tag--female' },
    { value: 'secret', label: '保密' },
  ],

  // 用户状态（locked 项 disabled —— 锁定态不允许在表单中手动选择，仅展示）
  user_status: [
    { value: 'active', label: '启用', type: 'success' },
    { value: 'inactive', label: '停用', type: 'danger' },
    { value: 'locked', label: '锁定', type: 'info', disabled: true },
  ],

  // 订单类型（每项带 type —— 演示 DictTag 按字典项渲染不同主题色）
  order_type: [
    { value: 'normal', label: '普通订单', type: 'primary' },
    { value: 'prepay', label: '预付订单', type: 'warning' },
    { value: 'refund', label: '退款单', type: 'danger' },
    { value: 'offline', label: '线下订单', type: 'info' },
  ],

  // 角色（登录预加载依赖，勿删）
  role: [
    { value: 'admin', label: '管理员' },
    { value: 'user', label: '普通用户' },
    { value: 'guest', label: '访客' },
  ],

  // 订单状态（存量字典，保留兼容）
  order_status: [
    { value: 'pending', label: '待支付' },
    { value: 'paid', label: '已支付' },
    { value: 'shipped', label: '已发货' },
    { value: 'completed', label: '已完成', type: 'success' },
    { value: 'cancelled', label: '已取消', type: 'info' },
  ],
}

export default [
  {
    url: '/api/dict/:code',
    method: 'get',
    timeout: 100,
    // ⚠️ 从 query.code 取路径参数（vite-plugin-mock 把 :code 合并进 query，见文件头注释）
    response: ({ query }: { query: { code?: string } }) => {
      const code = query.code
      if (!code) {
        return { code: 400, message: '缺少字典 code 参数', data: [] }
      }
      const list = DICT_DATA[code]
      // 未知字典返回 404 + 空数组：前端 store 拿到空数组降级渲染，不崩溃
      return list
        ? { code: 200, message: 'ok', data: list }
        : { code: 404, message: `字典 ${code} 不存在`, data: [] }
    },
  },
] as MockMethod[]
