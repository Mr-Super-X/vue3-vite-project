/** vite dev server 默认配置 */
export const SERVER_DEFAULTS = {
  port: 5174,
  strictPort: true, // 端口占用时直接报错而非自动切换
  // 显式绑 IPv4 0.0.0.0（非默认 localhost）——供 docker 网关容器反代可达。
  // 背景：docker 同域网关（dev:gateway + docker compose up）容器经 host.docker.internal
  // 访问宿主机 dev server；vite 默认绑 localhost（[::1] IPv6 loopback），容器到宿主机
  // IPv4 的入站连接被拒（实测 connection refused）。绑 0.0.0.0 让容器可路由到达。
  // 安全：dev-only，且仅同域网关（localhost:8080）消费，不暴露公网。
  host: '0.0.0.0',
} as const
