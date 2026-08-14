# Token 自动刷新与全局取消 使用规范

> **文档版本**：v2.0.0 | **最后更新**：2026-08-12
> **能力来源**：`src/api/token-refresh.ts` + `src/api/global-abort.ts` + `src/api/cancel.ts`
> **v2.0 变更（httpOnly 认证改造）**：凭证 token 改由后端 `Set-Cookie: HttpOnly` 下发，
> 前端 JS 不再读取/存储 token；refresh 契约从 `getValidToken(): Promise<string>`
> 变为 `refreshSession(): Promise<void>`（续期成功后重发请求自动携带新 cookie）。

---

## 📋 三件套速览

| 能力                     | 文件               | 触发场景            | 业务侧感知                 |
| ------------------------ | ------------------ | ------------------- | -------------------------- |
| **Token 自动 refresh**   | `token-refresh.ts` | 401 业务码          | 完全无感（自动重发原请求） |
| **Global Abort**         | `global-abort.ts`  | logout 时统一取消   | 完全无感                   |
| **AbortController 工具** | `cancel.ts`        | 路由切换 / 组件卸载 | 按需使用 `createAbort()`   |

---

## 1. Token 自动刷新（httpOnly 模式）

### 认证模型

```
登录：POST /auth/login → 后端 Set-Cookie: token=...; HttpOnly; SameSite=Lax
       前端仅写 sessionStorage 登录标记（key: auth，无敏感信息）供守卫同步判断
请求：axios withCredentials → 浏览器自动携带 cookie，前端不经手 token
刷新：401 → refreshSession()（并发去重）→ 后端 Set-Cookie 新 token → 原请求重发
登出：乐观退出——先清本地标记/状态，后端 logout（Set-Cookie: Max-Age=0）fire-and-forget
```

**后端接入要求**：跨域部署时 CORS 必须配置 `Access-Control-Allow-Credentials: true`，
且 `Access-Control-Allow-Origin` 不能用 `*`（需明确 origin）。

### 默认配置

```ts
// token-refresh.ts 默认行为
url: '/auth/refresh' // 相对 baseURL
refresh: () => axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
```

业务侧**零感知**：`request<T>()` 检测到 401 时自动 `refreshSession()` 一次（`_retried` 标记防循环），
成功后重发原请求（cookie 自动携带新凭证，无需更新 header）；refresh 失败则走
`performLogout()`（toast + 清登录标记 + 动态 import router 跳 /login）。

### 自定义 refresh 端点

```ts
// src/main.ts（应用启动时调一次）
import { configureTokenRefresh } from '@/api/token-refresh'

configureTokenRefresh({
  url: '/v2/auth/refresh-token',
  refresh: async () => {
    // 自定义请求逻辑；成功（不抛错）即视为凭证已续期
    await fetch('/api/v2/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
    })
  },
})
```

### 并发去重

同一时刻只发一个 refresh 请求：多个 401 同时触发时共享 Promise。refresh 失败时清空状态，下次重试可重新发起。

### ⚠️ 注意

- **当前默认实现是占位**（CHANGELOG 注释："后端契约确定后调整"）—— 后端实际 `/auth/refresh` 契约可能不同，需要调 `configureTokenRefresh` 配置
- **循环防护**：refresh 端点本身 401 不会再次触发 refresh（`isRefreshRequestUrl` 判定）
- **失败传播**：refresh 失败抛原 ApiError，业务侧 try/catch 即可拿到

---

## 2. Global Abort（Logout 统一取消）

### 工作流

```ts
// http.ts 请求拦截器
applyAbortSignal(config) // chainSignals(config.signal, globalAbort.signal)

// userStore.logout() 触发
async function logout() {
  // ...
  globalAbort.abort('logout') // 所有在途请求立即取消
  // ...
  globalAbort.reset() // 为下次登录创建新 controller
}
```

### ⚠️ 业务侧使用

**业务侧通常不需要直接用**——`http.ts` 自动给每个请求注入 `globalAbort.signal`。

但如需"路由切换时取消本页未完成请求"，应配合下一节的 `createAbort()` / `linkAbort()`。

---

## 3. AbortController 工具

### 基础用法

```ts
import { createAbort, withAbort, linkAbort } from '@/api/cancel'

const ctrl = createAbort()
const result = await request({ url: '/slow', method: 'get', ...withAbort(ctrl) })

// 主动取消（带 reason 便于排查）
ctrl.abort('user-cancelled')
```

### 路由切换 + 组件卸载双触发

```ts
import { useRoute } from 'vue-router'
import { onBeforeRouteLeave, onUnmounted } from 'vue-router'
import { createAbort, linkAbort } from '@/api/cancel'

export default {
  setup() {
    const localCtrl = createAbort()
    const route = useRoute()

    // 路由切换：取消当前页未完成请求
    onBeforeRouteLeave(() => {
      localCtrl.abort('route-leaving')
    })

    // 组件卸载：保险（onBeforeRouteLeave 不触发场景）
    onUnmounted(() => {
      localCtrl.abort('component-unmounted')
    })

    // 业务侧调用：传入本地 signal
    async function fetchData() {
      return request({ url: '/data', signal: localCtrl.signal })
    }

    return { fetchData }
  },
}
```

### 流式请求的 signal 联动

```ts
import { requestStream } from '@/api/stream'
import { createAbort, linkAbort } from '@/api/cancel'

const localCtrl = createAbort()
const handle = requestStream({
  url: '/ai/stream',
  signal: localCtrl.signal, // 任一 abort 都会终止流
  onMessage: (chunk) => {
    /* ... */
  },
})

onUnmounted(() => localCtrl.abort())
```

---

## 🆚 决策表

| 需求                 | 用什么                                    |
| -------------------- | ----------------------------------------- |
| 401 自动重试         | 无需任何代码（默认开）                    |
| 自定义 refresh 端点  | `configureTokenRefresh({...})` 在 main.ts |
| Logout 取消在途请求  | 无需任何代码（userStore.logout 自动）     |
| 单次请求主动取消     | `createAbort()` + `withAbort()`           |
| 路由切换取消         | `createAbort()` + `onBeforeRouteLeave`    |
| 组件卸载取消         | `createAbort()` + `onUnmounted`           |
| 外部 signal 联动本地 | `linkAbort(external, local)`              |

---

## 📚 速查

```ts
// 最小可运行：组件级 cancel
const ctrl = createAbort()
onUnmounted(() => ctrl.abort())
const data = await request({ url: '/x', signal: ctrl.signal })
```

---

_相关源码：`src/api/token-refresh.ts` + `src/api/global-abort.ts` + `src/api/cancel.ts`_
_相关测试：3 个 .spec.ts 共 23 用例_
_当前限制：默认 refresh 端点是占位（`/auth/refresh`），后端契约确定后需调 `configureTokenRefresh()`_
