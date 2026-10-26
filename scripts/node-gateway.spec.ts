/**
 * node-gateway 单测（node:test runner + node ≥22 内置 WebSocket client，零依赖）。
 *
 * 覆盖：路由表派生（buildGatewayRoutes）/ 前缀匹配（resolveRoute）纯函数表驱动，
 * 以及假上游集成 smoke——HTTP 转发 / GET / 302 / 未知前缀 404 / 上游不可达 502 / WS 双向 echo。
 *
 * 运行：pnpm test:gateway（node --test --experimental-strip-types --test-force-exit；
 * force-exit 是必要的——全局 fetch 的 keep-alive 连接池在测试结束后仍保活，
 * 事件循环不空导致 runner 进程挂起，node:test 官方开关在测试完成后强制退出）
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'

import {
  buildGatewayRoutes,
  createGatewayServer,
  resolveRoute,
  type GatewayRoute,
} from './node-gateway.ts'

// ── 纯函数：路由表派生 ──────────────────────────────────────────

test('buildGatewayRoutes：每 app 一条前缀路由，端口来自注册表', () => {
  const routes = buildGatewayRoutes([
    { name: 'admin', port: 5174 },
    { name: 'auth', port: 5179 },
  ])
  assert.deepEqual(routes, [
    { prefix: '/admin/', target: { host: '127.0.0.1', port: 5174 } },
    { prefix: '/auth/', target: { host: '127.0.0.1', port: 5179 } },
    // /api/ 统一反代 admin（mock 最全：auth/user/menu 三模块），端口不写死
    { prefix: '/api/', target: { host: '127.0.0.1', port: 5174 } },
  ])
})

test('buildGatewayRoutes：缺少 admin 条目时抛错（/api/ 反代目标无法确定）', () => {
  assert.throws(() => buildGatewayRoutes([{ name: 'portal', port: 5176 }]), /admin/)
})

test('resolveRoute：前缀命中、先命中先赢、无尾斜杠不命中', () => {
  const routes: GatewayRoute[] = [
    { prefix: '/admin/', target: { host: '127.0.0.1', port: 5174 } },
    { prefix: '/api/', target: { host: '127.0.0.1', port: 5174 } },
  ]
  assert.equal(resolveRoute('/admin/workbench', routes)?.prefix, '/admin/')
  // 对齐 nginx location /admin/：/admin（无尾斜杠）不命中
  assert.equal(resolveRoute('/admin', routes), undefined)
  assert.equal(resolveRoute('/api/auth/login', routes)?.prefix, '/api/')
  assert.equal(resolveRoute('/nope/', routes), undefined)
})

// ── 集成 smoke 辅助 ─────────────────────────────────────────────

/** 随机端口监听（0 = 内核分配），返回实际端口 */
async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as AddressInfo).port
}

/** 网关参数样板：单条 /fake/ 路由指向给定上游端口 */
function fakeGatewayOptions(upstreamPort: number) {
  return {
    rootRedirect: '/fake/',
    routes: [{ prefix: '/fake/', target: { host: '127.0.0.1' as const, port: upstreamPort } }],
  }
}

// ── 集成 smoke：假上游 echo 经网关 ──────────────────────────────

test('HTTP 转发：路径/query/方法/请求头/body 透传，响应状态与头回传', async () => {
  const upstream = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      res.writeHead(201, { 'x-upstream': 'yes', 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          auth: req.headers.authorization,
          fwdProto: req.headers['x-forwarded-proto'],
          body: Buffer.concat(chunks).toString(),
        })
      )
    })
  })
  const upstreamPort = await listen(upstream)

  const gateway = createGatewayServer(fakeGatewayOptions(upstreamPort))
  const gatewayPort = await listen(gateway)

  const res = await fetch(`http://127.0.0.1:${gatewayPort}/fake/echo?q=1`, {
    method: 'POST',
    headers: { authorization: 'Bearer tok' },
    body: 'hello',
  })
  assert.equal(res.status, 201)
  assert.equal(res.headers.get('x-upstream'), 'yes')
  const echoed = (await res.json()) as Record<string, unknown>
  assert.equal(echoed.method, 'POST')
  assert.equal(echoed.url, '/fake/echo?q=1')
  assert.equal(echoed.auth, 'Bearer tok')
  assert.equal(echoed.fwdProto, 'http')
  assert.equal(echoed.body, 'hello')

  gateway.close()
  upstream.close()
})

test('GET / 302 到 rootRedirect，Location 保留 Host 端口', async () => {
  const gateway = createGatewayServer(fakeGatewayOptions(1))
  const port = await listen(gateway)
  const res = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' })
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), `http://127.0.0.1:${port}/fake/`)
  gateway.close()
})

test('未知前缀 404', async () => {
  const gateway = createGatewayServer(fakeGatewayOptions(1))
  const port = await listen(gateway)
  const res = await fetch(`http://127.0.0.1:${port}/nope/`)
  assert.equal(res.status, 404)
  gateway.close()
})

test('上游不可达 502', async () => {
  // 端口 1（tcpmux）几乎必然无监听，且不受本机服务影响
  const gateway = createGatewayServer(fakeGatewayOptions(1))
  const port = await listen(gateway)
  const res = await fetch(`http://127.0.0.1:${port}/fake/x`)
  assert.equal(res.status, 502)
  gateway.close()
})

test('WS 升级透传：双向 echo（HMR 场景最小复现）', async () => {
  // 假上游 WS echo：按 RFC 6455 回 101（Sec-WebSocket-Accept = base64(sha1(key+GUID))，
  // undici WebSocket client 严格校验该头，缺了直接 failWebsocketConnection）后回发每帧
  const upstream = createServer()
  upstream.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'] ?? ''
    const accept = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64')
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`
    )
    // 收到帧后回固定合法文本帧 "ping"（0x81=文本帧 0x04=长度4）——不能字节 echo：
    // 客户端帧按 RFC 6455 必须 masked，masked 帧出现在服务端→客户端方向会被
    // undici 判 "Frame cannot be masked" 而断连，字节级 echo 因此不可用
    socket.on('data', () => socket.write(Buffer.from([0x81, 0x04, 0x70, 0x69, 0x6e, 0x67])))
  })
  const upstreamPort = await listen(upstream)

  const gateway = createGatewayServer(fakeGatewayOptions(upstreamPort))
  const gatewayPort = await listen(gateway)

  const ws = new WebSocket(`ws://127.0.0.1:${gatewayPort}/fake/__vite_hmr`)
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error('WS 握手失败'))
  })
  const echoed = await new Promise<string>((resolve, reject) => {
    ws.onmessage = (event) => resolve(String(event.data))
    ws.onerror = () => reject(new Error('WS 帧传输失败'))
    ws.send('ping')
  })
  assert.equal(echoed, 'ping')
  ws.close()
  gateway.close()
  upstream.close()
})
