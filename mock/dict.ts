// 字典 mock 数据
//
// 当前示例：user_status / role / order_status 三种典型字典。
// 业务方按需在 mock/index.ts（同目录）聚合暴露给 vite-plugin-mock。

import type { MockMethod } from 'vite-plugin-mock'

export default [
  // 用户账号状态
  {
    url: '/api/dict/user_status',
    method: 'get',
    timeout: 100,
    response: () => ({
      code: 200,
      message: 'ok',
      data: [
        { value: 'active', label: '启用' },
        { value: 'inactive', label: '禁用' },
        { value: 'locked', label: '锁定' },
      ],
    }),
  },

  // 角色
  {
    url: '/api/dict/role',
    method: 'get',
    timeout: 100,
    response: () => ({
      code: 200,
      message: 'ok',
      data: [
        { value: 'admin', label: '管理员' },
        { value: 'user', label: '普通用户' },
        { value: 'guest', label: '访客' },
      ],
    }),
  },

  // 订单状态
  {
    url: '/api/dict/order_status',
    method: 'get',
    timeout: 100,
    response: () => ({
      code: 200,
      message: 'ok',
      data: [
        { value: 'pending', label: '待支付' },
        { value: 'paid', label: '已支付' },
        { value: 'shipped', label: '已发货' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    }),
  },
] as MockMethod[]
