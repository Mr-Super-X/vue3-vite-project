# Mock 数据使用规范

> **文档版本**：v1.0.0 | **最后更新**：2026-07-24
> **覆盖范围**：mock 文件组织、defineMock 用法、同步/异步/timeout 控制、与 Zod schema 集成、prod 防御层（mock-guard）、CI 验证
> **适用读者**：第一次给页面加 mock 数据的新人 + 联调真实后端前期的开发者
> **配套文档**：`docs/15-请求层缓存-合并-分页适配使用规范.md`（cache + merge + pageAdapter 三件套）、`docs/14-zod请求参数校验使用规范.md`（Zod schema）

---

## 1. 决策表：什么时候需要 mock

| 场景                         | 用 mock     | 直接调真接口 | 备注                               |
| ---------------------------- | ----------- | ------------ | ---------------------------------- |
| 后端接口尚未就绪             | ✅          | ❌           | 必须 mock，否则无法开发            |
| 后端接口已就绪但本地无法访问 | ✅          | ❌           | 演示、离线、出差场景               |
| 单元测试                     | ❌          | ❌           | 用 vi.mock，**不要**用 mock-server |
| 关键用户流程 E2E             | ⚠️          | ✅           | 真实环境跑                         |
| 生产构建                     | ❌ 自动剔除 | ✅           | vite-plugin-mock prod 自动不启用   |

**项目约定**：开发期所有未对接的接口都走 `mock/<feature>.ts`，**禁止**在组件里写死假数据。

---

## 2. 文件组织

```
mock/
├── auth.ts              # /api/auth/* 登录相关
├── user.ts              # /api/user/* 用户管理
├── menu.ts              # /api/menu 远程菜单
├── dict.ts              # /api/dict/* 字典
├── portal-overview.ts   # /api/portal/overview 首页数据
├── index.ts             # 聚合导出（vite-plugin-mock 自动扫描）
└── <feature>.ts         # 新业务模块的 mock
```

**约定**：

- 每个业务模块一个 mock 文件，文件名与 `src/api/modules/<feature>.ts` 对应
- `vite-plugin-mock` 自动扫描 `mock/**/*.ts`，无需手动注册
- 跨业务共享的 mock 抽到独立文件（如 `dict.ts`）

---

## 3. defineMock 基础用法

```ts
// mock/user.ts
import { defineMock } from 'vite-plugin-mock/utils'

export default defineMock([
  {
    url: '/api/user/list',
    method: 'get',
    timeout: 200, // 模拟网络延迟 200ms
    body: ({ query }) => ({
      // ← body 是函数，接收 query/params
      code: 200,
      message: 'ok',
      data: {
        list: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `用户 ${i + 1}`,
          email: `user${i + 1}@example.com`,
        })),
        total: 100,
      },
    }),
  },

  // 多个接口一起定义
  {
    url: '/api/user/:id',
    method: 'get',
    body: ({ params }) => ({
      code: 200,
      data: { id: Number(params.id), name: '用户 ' + params.id },
    }),
  },
])
```

### 3.1 body 函数签名

```ts
body: ({ query, params, headers, body }) => {
  /* ... */
}
```

| 参数      | 来源            | 示例                                                    |
| --------- | --------------- | ------------------------------------------------------- |
| `query`   | URL 查询字符串  | `?page=1&pageSize=20` → `{ page: '1', pageSize: '20' }` |
| `params`  | URL 动态参数    | `/user/:id` → `{ id: '123' }`                           |
| `headers` | HTTP 请求头     | `{ 'x-token': 'xxx' }`                                  |
| `body`    | POST/PUT 请求体 | `{ name: 'xxx' }`                                       |

> 注意：query/params 值都是**字符串**，需要手动转 number：`Number(params.id)`。

### 3.2 同步 / 异步

```ts
// ✅ 同步（vite-plugin-mock 推荐，性能更好）
{
  url: '/api/user/list',
  method: 'get',
  body: () => ({ code: 200, data: [] }),
}

// ⚠️ 异步（兼容，但 vite-plugin-mock 文档明确不推荐）
{
  url: '/api/user/list',
  method: 'get',
  async body() {
    await delay(200) // 模拟网络延迟
    return { code: 200, data: [] }
  },
}
```

> **延迟用 `timeout` 字段**而非 async body（vite-plugin-mock 文档明确说 mock 函数不能 async）。

### 3.3 timeout 字段

```ts
{
  url: '/api/user/list',
  method: 'get',
  timeout: 200,         // 单位 ms；模拟网络延迟
  body: () => ({ ... }),
}
```

---

## 4. 与 Zod schema 集成（推荐）

把 mock 数据走 Zod schema，**让 mock 与生产 schema 共享一份类型契约**。

```ts
// src/modules/user/types.ts
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  status: z.enum(['active', 'inactive']),
})

export type User = z.infer<typeof UserSchema>
```

```ts
// mock/user.ts
import { defineMock } from 'vite-plugin-mock/utils'
import { UserSchema, type User } from '@/modules/user/types'

export default defineMock([
  {
    url: '/api/user/list',
    method: 'get',
    timeout: 200,
    body: () => {
      const list: User[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `用户 ${i + 1}`,
        email: `user${i + 1}@example.com`,
        status: i % 2 ? 'active' : 'inactive',
      }))

      // 校验：确保 mock 数据也满足 schema（开发期拦截）
      return { code: 200, data: { list, total: 100 } }
    },
  },
])
```

**优势**：

- mock 与生产 schema 共享一份类型
- 后端字段变化时，mock 与生产同步更新
- TS 类型推导友好

---

## 5. 错误码模拟

```ts
export default defineMock([
  // 正常返回
  {
    url: '/api/user/list',
    method: 'get',
    body: () => ({ code: 200, data: [] }),
  },

  // 模拟 401（未登录）
  {
    url: '/api/auth/profile',
    method: 'get',
    body: () => ({
      code: 401,
      message: '未登录',
    }),
  },

  // 模拟 500（服务器错误）
  {
    url: '/api/user/list',
    method: 'get',
    status: 500, // ← HTTP 状态码
    body: () => ({ code: 500, message: '服务器异常' }),
  },
])
```

> `code` 是业务字段（前端拦截器识别），`status` 是 HTTP 状态码（浏览器识别）。

---

## 6. 动态响应（按 query/params 切换）

```ts
{
  url: '/api/user/detail/:id',
  method: 'get',
  body: ({ params }) => {
    const id = Number(params.id)
    if (id === 999) {
      return { code: 404, message: '用户不存在' }
    }
    return {
      code: 200,
      data: { id, name: `用户 ${id}`, email: `user${id}@example.com` },
    }
  },
}
```

---

## 7. vite-plugin-mock 配置（vite.config.ts）

```ts
// vite.config.ts
import { viteMockServe } from 'vite-plugin-mock'

plugins: [
  viteMockServe({
    mockPath: 'mock',                          // mock 文件目录
    enable: process.env.VITE_USE_MOCK !== 'false', // dev 默认开启（2026-07-27 切换）
    watchFiles: true,                          // mock 文件变更热更新
  }),
],
```

**注意**：

- `enable: VITE_USE_MOCK !== 'false'` 保证 prod 打包不包含 mock（vite build 不读 `.env.development`，自然落入"关闭"分支）
- `watchFiles: true` 让 mock 修改实时生效（无需重启 dev server）
- dev 默认开启：clone 后未建 `.env.development` 时 `VITE_USE_MOCK=undefined` → `!== 'false'` 判定为 true，mock 自动启用
- 联调真后端：在 `.env.development` 设 `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=<真实后端地址>`

---

## 8. prod 防御层（src/api/mock-guard.ts）

**问题**：vite-plugin-mock 仅在 dev 启用；如果代码里有 mock 数据残留，prod 会带入。

**项目方案**：`src/api/mock-guard.ts` 提供扩展点。

```ts
// src/main.ts
import { setupProdMockServer } from '@/api/mock-guard'

if (import.meta.env.PROD) {
  setupProdMockServer({
    // prod 模式下需要拦截的 URL（罕见，例如 MSW 切真实 mock）
    interceptUrls: [],
  })
}
```

**使用场景**：

- 需要在 prod 环境演示（不能连真后端）
- 用 MSW 等浏览器端 mock 替换 vite-plugin-mock
- 需要 prod 环境完整跑业务流程（演示部署）

**默认行为**：prod 环境不启用任何 mock，所有请求走真实接口（或返回网络错误）。

---

## 9. 远程菜单 mock

```ts
// mock/menu.ts（节选，详见 docs/07-路由模块设计.md）
export default defineMock([
  {
    url: '/api/menu',
    method: 'get',
    body: () => ({
      code: 200,
      data: [
        {
          name: 'Home',
          path: '/home',
          meta: { title: '首页', icon: 'odometer', requiresAuth: true },
        },
        {
          name: 'UserList',
          path: '/user/list',
          meta: { title: '用户管理', icon: 'user', permissions: ['user:view'] },
        },
        // ⚠️ 路由 name 必须与 RouteName 联合类型 + COMPONENT_REGISTRY 一致
      ],
    }),
  },
])
```

**注意**：路由 `name` 必须在 `src/router/types.ts` 与 `src/router/auto-register.ts` 同时注册。

---

## 10. 字典 mock（与 useDict 集成）

```ts
// mock/dict.ts（节选）
export default defineMock([
  {
    url: '/api/dict/user_status',
    method: 'get',
    body: () => ({
      code: 200,
      data: [
        { value: 'active', label: '启用' },
        { value: 'inactive', label: '禁用' },
      ],
    }),
  },
  // 业务侧用法详见 docs/11-字典使用规范.md
])
```

---

## 11. 测试与 mock 的关系

**核心原则**：

- **单元测试**：用 `vi.mock('@/api/http')`，**不要**启动 vite-plugin-mock
- **集成测试**：可短暂启用 vite-plugin-mock（用 MSW 等）
- **E2E**：禁用 mock，跑真实接口

```ts
// ✅ 正例：单测里直接 mock 模块
vi.mock('@/api/modules/user', () => ({
  userApi: { getList: vi.fn() },
}))
```

---

## 12. CI 验证

`pnpm check:routes` 会校验：

- 路由 `RouteName` 与 `auto-register.ts` 双向一致
- `mock/menu.ts` 返回的 `name` 必须在 `RouteName` 联合类型内
- `mock/<feature>.ts` 的 URL 路径必须在文档中声明（避免孤儿接口）

---

## 13. 评审 Checklist（PR 必过）

```
□ 1. mock 文件放在 mock/<feature>.ts，与 src/api/modules/<feature>.ts 对应？
□ 2. 使用 defineMock([...]) 数组形式（而非单个对象）？
□ 3. body 用同步函数 + timeout 字段（而非 async body）？
□ 4. mock 数据类型与 Zod schema 一致（避免字段漂移）？
□ 5. 错误码用业务字段 code 而非 HTTP status（除非要测 500）？
□ 6. 远程菜单 mock 的 name 在 RouteName 联合类型中？
□ 7. prod 模式不需要 mock 时已配置 setupProdMockServer？
□ 8. 单测用 vi.mock 而非 mock-server？
```

---

## 14. 常见坑

| 症状                                | 原因                                                        | 解法                                   |
| ----------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| mock 修改后没生效                   | dev server 未重启 + watchFiles 未开                         | `vite.config.ts` 加 `watchFiles: true` |
| prod 包包含 mock 残留               | 用了 vite-plugin-mock 但未 `NODE_ENV !== 'production'` 守卫 | 检查 `vite.config.ts`                  |
| async body 不生效                   | vite-plugin-mock 不支持 async                               | 改用同步 + `timeout: ms`               |
| params 是字符串                     | URL 动态参数永远是 string                                   | `Number(params.id)` 手动转             |
| 后端字段名改了但前端没改            | mock 与生产 schema 漂移                                     | 用 Zod schema 共享类型                 |
| 远程菜单 mock 报"未注册的路由 name" | name 不在 COMPONENT_REGISTRY                                | 先在 modules/<m>/routes/index.ts 声明  |

## 🔗 相关文档

| 文档                                          | 范围                       |
| --------------------------------------------- | -------------------------- |
| `docs/10-新手指引.md` §3.3                    | mock 写入示例              |
| `docs/14-zod请求参数校验使用规范.md`          | Zod schema + mock 共享类型 |
| `docs/15-请求层缓存-合并-分页适配使用规范.md` | mock 接口的 cache 配置     |
| `docs/11-字典使用规范.md`                     | dict mock 用法             |
| `docs/07-路由模块设计.md` §远程菜单 JSON      | 远程菜单 mock 协议         |
| `src/api/mock-guard.ts`                       | prod 防御层源码            |
| `vite.config.ts`                              | vite-plugin-mock 配置      |

---

_文档版本：v1.0.0 | 编写日期：2026-07-24 | 配套项目版本：gm-portal-fe 0.x_
