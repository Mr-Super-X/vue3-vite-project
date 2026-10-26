/**
 * 本地同域网关（node 原生实现，零依赖）——替代原 docker-compose + nginx 方案
 * （设计稿 docs/superpowers/specs/2026-10-26-node-gateway-design.md）。
 *
 * 角色：dev:gateway 的内置反向代理。监听 :8080，按路径前缀把请求原样转发到
 * 6 个 vite dev server（上游 127.0.0.1:5174-5179），保留原始路径前缀是
 * 各 app 以 VITE_BASE=/<app>/ 启动的 vite dev 的生命线（改写前缀即 404）。
 *
 * 路由表由 buildGatewayRoutes(apps-registry) 单源代码派生——消灭原
 * nginx.dev.conf「静态配置无法 import 注册表」的双写漂移面（check-gateway-conf
 * 校验随之删除；端口双写锁死 validatePortWiring 迁入 scripts/check-routes.ts）。
 *
 * 关键语义（与原 nginx.dev.conf 逐条对齐）：
 *   - GET /        → 302 Location: http://{Host}/portal/（Host 含端口，对齐 $http_host）
 *   - /<app>/ 前缀 → 原样路径转发（含 query string），Host 头保留浏览器原值
 *   - /api/        → admin 端口（mock 最全）
 *   - WS upgrade   → 101 回写 + socket 双向 pipe（vite HMR 经网关可用；@vv/config
 *                    server.hmr 已把 clientPort 固定到各 app 端口，HMR 流量多直连，
 *                    本透传保证任何 ws 场景经 8080 均可用）
 *   - 上游不可达   → 502（对齐 nginx Bad Gateway）
 *   - 不设超时     → SSE 流式（docs/13）与 HMR 长连接友好
 *
 * @see ./dev-gateway.ts 消费方（一体化单命令：网关 + 6 dev server）
 */

import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { Duplex } from 'node:stream'

/** 上游目标（vite dev server） */
export interface GatewayTarget {
  host: string
  port: number
}

/** 一条前缀路由：prefix 前缀的请求原样转发到 target */
export interface GatewayRoute {
  prefix: string
  target: GatewayTarget
}

/** app 注册表条目（结构对齐 scripts/apps-registry.mjs 的 APPS 元素） */
export interface GatewayApp {
  name: string
  port: number
}

export interface GatewayOptions {
  /** 根路径 302 目标（如 '/portal/'） */
  rootRedirect: string
  /** 前缀路由表（buildGatewayRoutes 派生；先命中先赢） */
  routes: GatewayRoute[]
}

/**
 * 从 app 注册表派生网关路由表：每 app 一条 /<name>/ 前缀路由 + /api/ 特殊路由。
 *
 * @param apps 注册表（scripts/apps-registry.mjs 的 APPS）
 * @throws 注册表缺少 admin 时抛错——/api/ 反代目标无法确定，静默兜底会埋 404
 */
export function buildGatewayRoutes(apps: GatewayApp[]): GatewayRoute[] {
  const routes = apps.map((app) => ({
    prefix: `/${app.name}/`,
    target: { host: '127.0.0.1', port: app.port },
  }))
  const admin = apps.find((app) => app.name === 'admin')
  if (!admin) {
    throw new Error('apps-registry 缺少 admin 条目：/api/ 反代目标无法确定')
  }
  routes.push({ prefix: '/api/', target: { host: '127.0.0.1', port: admin.port } })
  // /mock/ 与 /api/ 同目标（admin mock 最全）：mock 统一前缀方案（2026-10-26）——
  // 前端 VITE_API_BASE_URL=/mock 时请求经此路由到 admin 的 mock 中间件，
  // Network 面板以 /mock 前缀一眼区分 mock 响应与真实后端 /api 响应
  routes.push({ prefix: '/mock/', target: { host: '127.0.0.1', port: admin.port } })
  return routes
}

/** 前缀匹配（先命中先赢）；无尾斜杠路径（/admin）不命中，对齐 nginx location /admin/ */
export function resolveRoute(pathname: string, routes: GatewayRoute[]): GatewayRoute | undefined {
  return routes.find((route) => pathname.startsWith(route.prefix))
}

/** 追加式 X-Forwarded-For（对齐 nginx proxy_add_x_forwarded_for） */
function forwardedFor(req: IncomingMessage): string {
  const existing = req.headers['x-forwarded-for']
  const client = req.socket.remoteAddress ?? ''
  return existing ? `${existing}, ${client}` : client
}

/**
 * 创建网关 server（不自动 listen——调用方决定监听地址，测试可随机端口）。
 * HTTP 转发 + WS upgrade + GET / 302 + 未知前缀 404 + 上游 502。
 */
export function createGatewayServer(options: GatewayOptions): Server {
  const { routes, rootRedirect } = options

  const server = createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname

    // 根路径 302：Location 用原始 Host 头（含端口，对齐 nginx $http_host 防丢端口坑）
    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(302, { Location: `http://${req.headers.host ?? 'localhost'}${rootRedirect}` })
      res.end()
      return
    }

    const route = resolveRoute(pathname, routes)
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`网关未匹配前缀：${pathname}`)
      return
    }
    proxyHttp(req, res, route.target)
  })

  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
    const route = resolveRoute(pathname, routes)
    if (!route) {
      socket.destroy()
      return
    }
    proxyWebSocket(req, socket, head, route.target)
  })

  return server
}

/** HTTP 转发：原样路径（含 query）+ 转发头组；上游不可达 502 */
function proxyHttp(req: IncomingMessage, res: ServerResponse, target: GatewayTarget): void {
  const proxyReq = httpRequest(
    {
      host: target.host,
      port: target.port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        // 保留浏览器原始 Host（spread 已含 host，此处注明语义即可）
        'x-real-ip': req.socket.remoteAddress ?? '',
        'x-forwarded-for': forwardedFor(req),
        'x-forwarded-proto': 'http',
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )
  proxyReq.on('error', (err) => {
    // 响应头已发出（上游断在中途）只能掐断；否则回 502 页
    if (res.headersSent) {
      res.destroy()
      return
    }
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`502 Bad Gateway（上游 ${target.host}:${target.port} 不可达：${err.message}）`)
  })
  req.pipe(proxyReq)
}

/**
 * WS 升级转发：向上游发 upgrade 请求，101 响应手工回写客户端 socket 后双向 pipe。
 * 非 101 响应（上游拒绝升级）同样手工回写，保证 client 拿到可读响应。
 */
function proxyWebSocket(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  target: GatewayTarget
): void {
  const proxyReq = httpRequest({
    host: target.host,
    port: target.port,
    path: req.url,
    method: req.method,
    headers: req.headers,
  })

  /** 向原始 socket 手工写 HTTP 状态行 + 响应头（101 或拒绝响应共用） */
  const writeRawResponse = (res: IncomingMessage): void => {
    socket.write(`HTTP/1.1 ${res.statusCode} ${res.statusMessage ?? ''}\r\n`)
    for (const [key, value] of Object.entries(res.headers)) {
      if (value === undefined) continue
      socket.write(`${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`)
    }
    socket.write('\r\n')
  }

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    writeRawResponse(proxyRes)
    // 握手响应后可能携带的首帧数据先落客户端
    if (proxyHead?.length) socket.write(proxyHead)
    // 双向 pipe；任一侧出错互拆，避免半开连接挂死
    socket.pipe(proxySocket)
    proxySocket.pipe(socket)
    socket.on('error', () => proxySocket.destroy())
    proxySocket.on('error', () => socket.destroy())
  })

  // 上游拒绝升级（非 101）：把响应透传给客户端，而不是静默断连
  proxyReq.on('response', (proxyRes) => {
    writeRawResponse(proxyRes)
    proxyRes.pipe(socket)
  })

  proxyReq.on('error', () => socket.destroy())
  socket.on('error', () => proxyReq.destroy())

  // upgrade 请求的 head（握手后的首帧数据）随请求体发往上游
  if (head?.length) {
    proxyReq.end(head)
  } else {
    proxyReq.end()
  }
}
