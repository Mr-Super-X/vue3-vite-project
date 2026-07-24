# Zod 请求校验使用规范

> **文档版本**：v1.0.0 | **最后更新**：2026-07-24
> **能力来源**：`src/api/validator.ts`（CHANGELOG 未记录，2026-07-24 审计补齐文档）

---

## 📋 概述

`requestValidated(schema, config)` 在 `request<T>()` 之上叠加 **Zod schema 运行时校验**。后端接口返回的 JSON 与 TS 类型不一致时**启动期/首次请求即失败**，而不是等用户操作时崩。

---

## 🎯 何时使用

| 场景                               | 用 `request<T>()` | 用 `requestValidated(schema, config)` |
| ---------------------------------- | ----------------- | ------------------------------------- |
| 内部已知接口、稳定契约             | ✓                 | —                                     |
| 后端契约可能漂移 / 新接口          | —                 | ✓                                     |
| 关键数据（用户信息、权限码、配置） | —                 | ✓                                     |
| 列表分页（量大、字段多）           | ✓（fail-soft）    | 可选（fail-hard）                     |
| 流式响应（stream）                 | ✗（不支持）       | ✗（不支持）                           |

---

## 🚀 基础用法

### 单 endpoint 校验

```ts
import { z } from 'zod'
import { requestValidated } from '@/api/validator'

const EquipmentSchema = z.object({
  id: z.number(),
  deviceName: z.string(),
  status: z.enum(['online', 'offline', 'maintenance']),
  createdAt: z.string().datetime(),
})

const item = await requestValidated(EquipmentSchema, {
  url: '/equipment/1',
  method: 'get',
})
// item 类型：z.infer<typeof EquipmentSchema> = { id: number; deviceName: string; ... }
```

### 列表校验（嵌套 Pagination）

```ts
const EquipmentListSchema = z.object({
  list: z.array(EquipmentSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

const page = await requestValidated(EquipmentListSchema, {
  url: '/equipment/list',
  method: 'get',
  params: { page: 1, pageSize: 20 },
  usePageAdapter: true,
})
```

### 复用 schema

```ts
// src/modules/equipment/types.ts
export const EquipmentSchema = z.object({/* ... */})
export type Equipment = z.infer<typeof EquipmentSchema>

// 业务组件
import { requestValidated } from '@/api/validator'
import { EquipmentSchema, type Equipment } from '@/modules/equipment/types'

const data: Equipment = await requestValidated(EquipmentSchema, { url: '/equipment/1' })
```

---

## ⚠️ 失败行为

校验失败时**抛 ApiError**（`code: 500, message: "数据格式异常：<details>"`），**不 toast**（避免吓到用户）。

`http.ts` 响应拦截器会拦截到 console.error，详情在 dev 模式可见：

```
[validator] schema 验证失败: id: expected number, received string; status: invalid enum value
```

业务侧 try/catch 即可拿到 ApiError：

```ts
try {
  const data = await requestValidated(EquipmentSchema, { url: '/equipment/1' })
} catch (err) {
  // err instanceof ApiError && err.code === 500
  // 推荐：上报到 errorHandler.report(err, { source: 'equipment-detail' })
}
```

---

## 🧩 高级用法

### 1. zod 内置 transformer（类型转换）

```ts
const QuerySchema = z.object({
  page: z.coerce.number(), // "1" → 1
  keyword: z.string().optional(), // undefined 也合法
  createdAt: z.string().datetime().nullable(), // null 合法
})
```

### 2. 字段扩展（后端多返回字段）

```ts
const EquipmentSchema = z
  .object({
    id: z.number(),
    deviceName: z.string(),
  })
  .passthrough() // 后端多返回的字段保留，不抛错
```

### 3. 与 useRequest 组合

```ts
import { useRequest } from '@/composables/useRequest'
import { requestValidated } from '@/api/validator'

const { data, error, loading } = useRequest(() =>
  requestValidated(EquipmentSchema, { url: '/equipment/list' })
)
```

---

## 📚 速查

```ts
// 最小可运行示例
import { z } from 'zod'
import { requestValidated } from '@/api/validator'

const UserSchema = z.object({ id: z.number(), name: z.string() })
const user = await requestValidated(UserSchema, { url: '/user/1' })
```

---

## 🆚 vs `request<T>()` vs `validator()`

| 维度     | `request<T>`      | `requestValidated`             | `validator()`    |
| -------- | ----------------- | ------------------------------ | ---------------- |
| 校验时机 | 编译期（TS 类型） | 运行时（HTTP 响应后）          | 任意             |
| 校验工具 | TS 类型（静态）   | Zod schema                     | Zod schema       |
| 失败行为 | 编译错误          | 抛 ApiError + console.error    | 抛 ApiError      |
| 业务场景 | 日常调用          | 关键接口 / 新接口 / 不稳定契约 | 已有数据二次校验 |

---

_相关源码：`src/api/validator.ts`（64 行）+ `src/api/validator.spec.ts`_
_相关依赖：[Zod](https://zod.dev) v4_
