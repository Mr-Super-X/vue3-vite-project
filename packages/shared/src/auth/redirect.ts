/**
 * 跨应用统一登录协议（P4，Monorepo 多 app 收官）。
 *
 * 业务背景：auth 独立为 apps/auth 后，admin / portal 等 app 内不再有 /login 路由；
 * 跨 app 无共享 router 实例，登录跳转必须整页 `location.href`（非同源 SPA 内 push）。
 *
 * 消费点：
 * - `@vv/shared/router-guards/login.ts` checkLoginState（未登录 → 跳 auth 登录页）
 * - `@vv/shared/api/http.ts` performLogout（refresh 失败 → 跳 auth 登录页）
 * - `@vv/ui/composables/useLogout`（主动登出 → 跳 auth 登录页）
 * - apps/portal 顶栏 / Hero CTA（公开站登录入口）
 * - apps/auth 登录页成功回调（回跳原 app）
 *
 * `VITE_AUTH_ORIGIN` 由各 app env 注入（本包不硬编码 app 名/部署形态）：
 * dev 缺省 '/auth'（同源子路径语义）；生产按部署形态覆盖（如 gh-pages 子路径
 * '/vue3-vite-project/auth' 或独立域名 'https://auth.example.com'）。
 *
 * @group 跨应用登录协议
 */

/** 跨应用整页跳转（跨 app 无共享 router 实例，必须整页 location.href） */
export function redirectToAuthLogin(redirect: string): never {
  const authOrigin = import.meta.env.VITE_AUTH_ORIGIN ?? '/auth'
  const safe = redirect.startsWith('/') ? redirect : '/'
  window.location.href = `${authOrigin}/login?redirect=${encodeURIComponent(safe)}`
  throw new Error('AUTH_REDIRECTING') // 中断当前守卫链（整页已发起）
}

/** auth 登录成功后回跳（校验同源前缀，防开放重定向）。
 *
 * fallback 由调用方显式传入（登录后默认落地页）——本包不硬编码 app 名/部署形态
 * （见文件头注），默认值曾因写死 '/admin/' 致 app 特性泄漏进纯库包（架构审查项）。 */
export function resolvePostLoginRedirect(fallback: string): string {
  const raw = new URLSearchParams(window.location.search).get('redirect')
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return fallback
}
