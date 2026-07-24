# 流式请求使用规范

> **文档版本**：v1.0.0 | **最后更新**：2026-07-24
> **能力来源**：`src/api/stream.ts`（CHANGELOG 未记录，2026-07-24 审计补齐文档）

---

## 📋 概述

`requestStream<T>()` 是项目内置的流式请求工具，基于 `fetch` + `ReadableStream`，**不走 axios**（axios 不支持 SSE / NDJSON 流的精细控制）。

适用场景：

- **AI chat 流式输出**：每收到一段 token 立即渲染
- **日志流**：服务端按行推送日志（NDJSON）
- **实时通知**：SSE 长连接

---

## 🎯 三种流格式

| 格式           | 触发                 | 数据形态                        | 典型用途                 |
| -------------- | -------------------- | ------------------------------- | ------------------------ |
| `sse`（默认）  | 每行以 `data:` 开头  | 字符串 JSON + `[DONE]` 结束标记 | OpenAI / Claude 风格 SSE |
| `ndjson`       | 每行一个 JSON        | 纯 JSON（无前缀）               | 日志流 / 事件流          |
| `auto`（默认） | 自动检测首行 `data:` | 自适应                          | 不确定后端格式时         |

---

## 🚀 基础用法

### SSE 流（AI chat）

```ts
import { requestStream } from '@/api/stream'

const handle = requestStream<ChatChunk>({
  url: '/ai/chat/stream',
  method: 'POST',
  data: { prompt: '写一首诗' },
  format: 'sse', // 显式指定；不写则默认 auto
  onMessage: (chunk) => {
    console.log('收到 chunk:', chunk.content)
    // 业务侧维护累积响应：responseText += chunk.content
  },
  onError: (err) => console.error('流错误:', err),
})

// 主动终止（如用户点"停止生成"）
button.onClick = () => handle.cancel()

// 等流结束
await handle.done
```

### NDJSON 流（日志）

```ts
const handle = requestStream<LogEvent>({
  url: '/logs/stream?service=auth',
  format: 'ndjson',
  onMessage: (event) => logStore.push(event),
})
```

### 取消外部 signal 联动

```ts
import { createAbort, linkAbort } from '@/api/cancel'

const localCtrl = createAbort()
const handle = requestStream({
  url: '/ai/stream',
  signal: localCtrl.signal, // 外部信号：与 handle.cancel 任一触发都会终止
  onMessage: (chunk) => {
    /* ... */
  },
})

// 路由切换 + 组件卸载双触发：useLinkAbort 把组件 unmount 联动进来
onUnmounted(() => localCtrl.abort('component-unmounted'))
```

---

## ⚠️ 注意事项

### 1. 失败语义：onError + done 双通道

```ts
const handle = requestStream({
  url: '/ai/stream',
  onMessage: (chunk) => {
    /* ... */
  },
  onError: (err) => {
    // 网络错误 / 解析失败 / 流中断都会触发
    showToast('流连接异常')
  },
})

await handle.done // done 永远 resolve（不 reject）；错误通过 onError 回调
```

`done` 不抛异常——错误**只在 onError 回调中传递**。这是与 axios `request()` 的关键区别。

### 2. Auth 自动注入

`requestStream` 内部自动读 `Session.get('token')` 并加 `Authorization: Bearer <token>` 头（与 `http.ts` 一致），业务侧无需手动传。

### 3. 解析容错

单行 JSON 解析失败时 `onError` 触发，**流不中断**（容忍单条脏数据）。如果后端偶尔推一行非 JSON 也不会让整个流崩溃。

### 4. dev 模式 / prod 模式

dev 模式下 Vite 代理可转发 SSE；prod 部署需 nginx 配置：

```nginx
location /api/ai/ {
  proxy_pass http://backend;
  proxy_buffering off;  # SSE 必须关闭缓冲
  proxy_set_header Connection '';
  proxy_http_version 1.1;
}
```

---

## 🆚 vs `request<T>()`

| 维度     | `request<T>()`            | `requestStream<T>()`            |
| -------- | ------------------------- | ------------------------------- |
| 通信模式 | 一问一答                  | 服务器主动推                    |
| 错误处理 | `try/catch` 捕获 ApiError | `onError` 回调 + `done` Promise |
| 数据形态 | 单个 T                    | 多个 T（按消息）                |
| 底层     | axios                     | fetch + ReadableStream          |
| Auth 头  | 自动注入                  | 自动注入                        |
| 取消     | AbortController           | `handle.cancel()`               |

---

## 📚 速查

```ts
// 最小可运行 SSE 示例
const handle = requestStream<{ content: string }>({
  url: '/chat',
  method: 'POST',
  data: { q: 'hi' },
  onMessage: ({ content }) => (responseText += content),
})
await handle.done
```

---

_相关源码：`src/api/stream.ts`（160 行）+ `src/api/stream.spec.ts`_
_相关能力：`@/api/cancel`（AbortController 工具）_
