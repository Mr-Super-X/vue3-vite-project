# Pinia Store 使用规范

> **文档版本**：v1.1.0 | **最后更新**：2026-09-04
> **覆盖范围**：什么时候用 store / 全局 vs 模块私有 / Setup Store 风格 / 持久化 / 跨 store 调用 / 单测模板
> **适用读者**：第一次接触项目状态管理的新人 + 需要扩展 store 的老成员
> **配套源码**：`src/store/modules/*.ts`（5 个在 `src/store/index.ts` 集中 re-export + 1 个 router store 按需 import）+ `src/composables/useAuth.ts` + `src/composables/useDict.ts`

> **本次更新要点**（v1.0.0 → v1.1.0）：
>
> - user store 案例整体改写，对齐 2026-08-12 httpOnly 改造（认证态从 `token` 转为 `authenticated`，不再持久化）
> - store 列表补充 router store 通过按需 import 引入（避免 user → router 循环依赖）
> - 持久化 namespace 章节澄清：`VITE_STORAGE_NAMESPACE` 仅作用于 `utils/storage.ts`，**不**作用于 pinia-plugin-persistedstate
> - 模块私有 store 案例从虚构的 `order` 模块改为"目前未维护"的现状说明
> - 跨标签页同步从虚构的 `syncTabsPlugin` 改为 `storage` 事件方案

---

## 1. 决策表：什么时候用 Pinia store

| 场景                          | 推荐方案                                         | 反例（错用）                                  |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------- |
| 仅当前组件用、表单临时态      | 组件内 `ref`                                     | 放 store 全局共享会被别的组件意外覆盖         |
| 组件首屏拉一次数据 + 三态渲染 | `useRequest` composable                          | 放 store + 手动管理 loading/error 重复造轮子  |
| 跨 ≥2 个组件共享业务状态      | **Pinia store**（全局或模块私有）                | 用 `utils/singleton.ts` + EventBus 失去响应式 |
| 跨 ≥2 个模块共享状态          | `src/store/modules/<feature>.ts`（全局）         | 放模块私有 store → 其他模块拿不到             |
| 仅本模块跨多组件共享          | `src/modules/<m>/store/<feature>.ts`（模块私有） | 放全局 store 污染命名空间                     |
| 跨标签页持久化（用户偏好）    | store + `pinia-plugin-persistedstate`            | 用 LocalStorage 直接读写失去响应式            |
| 跨标签页同步业务数据          | store + 持久化 + 监听 `storage` 事件             | 手写轮询 / BroadcastChannel 增加复杂度        |

---

## 2. 全局 store vs 模块私有 store 边界

### 全局（`src/store/modules/`）

**适用**：

- 跨 ≥2 个业务模块共享
- 与框架基础设施紧密耦合（user / theme / dict / app）
- 配置类（不依赖业务，可被任何模块 import）

**当前 6 个全局 store**（其中 `router` 通过按需 `import './router'` 使用，不在 `src/store/index.ts` 集中 re-export，以避免被 user.ts 反向依赖时引入循环）：

| 文件           | 职责                                                     | 持久化                                                                                               |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `app.ts`       | 侧边栏折叠 + 全局 loading + 语言（zh-CN/en-US）          | 否                                                                                                   |
| `user.ts`      | 登录标记（`authenticated`）+ profile + permissions       | 否（httpOnly：凭证 cookie 由后端 Set，前端不持有 token，sessionStorage `auth` 标记也仅用于守卫同步） |
| `theme.ts`     | 主题模式（light/dark/auto）                              | 是（pick: `mode`，key: `theme-mode`）                                                                |
| `router.ts`    | 路由 UI 状态（`isLoadingRemoteMenu` + `lastRouteError`） | 否                                                                                                   |
| `dict.ts`      | 字典（5min 业务层缓存 + 30s 网络层缓存）                 | 否                                                                                                   |
| `tags-view.ts` | 多页签状态（visitedViews + cachedViews）                 | 否（避免换账号残留上个账号的 tab）                                                                   |

### 模块私有（`src/modules/<m>/store/`）

**适用**：

- 仅本模块 ≥2 个组件共享
- 与特定业务强耦合
- 删除模块时随模块一起删

**实战定位**：项目当前内置模块（auth / home / orders / reports / user / demo / error）下**未维护模块私有 store**——业务跨组件共享都直接走全局 store（`useUserStore` / `useDictStore` / `useTagsViewStore`）。**新增模块私有 store 应优先评估能否合入全局 store**；只有"删除模块时随模块一起删 + 跨模块根本不会用"的强场景才落 `src/modules/<m>/store/`。

> 历史文档曾以 `src/modules/order/store/{cart,draft}.ts` 作为案例，但该模块目前未真实存在；若你的新模块需要，按 `src/modules/<m>/index.ts` 对外接口 + `defineStore` setup 风格落地即可。

---

## 3. Setup Store vs Options Store

**项目约定**：**统一使用 Setup Store 风格**（更接近 composables 心智，便于复用）。

```ts
// ✅ Setup Store（本项目风格）——以 todo 列表为例展示语法形态
// 注：实际 user store 受 httpOnly 凭证约束更复杂，完整示例见 §7 案例 1
export const useTodosStore = defineStore('todos', () => {
  const items = ref<TodoItem[]>([])
  const filter = ref<'all' | 'active' | 'done'>('all')

  const filteredItems = computed(() =>
    filter.value === 'all' ? items.value : items.value.filter((i) => i.status === filter.value)
  )

  async function load() {
    items.value = await fetchTodos()
  }

  function setFilter(value: 'all' | 'active' | 'done') {
    filter.value = value
  }

  return { items, filter, filteredItems, load, setFilter }
})
```

```ts
// ❌ Options Store（不推荐，容易与组合式 API 心智混淆）
export const useTodosStore = defineStore('todos', {
  state: () => ({ items: [], filter: 'all' as const }),
  getters: {
    filteredItems: (state) =>
      state.filter === 'all' ? state.items : state.items.filter((i) => i.status === state.filter),
  },
  actions: {
    async load() {
      /* ... */
    },
  },
})
```

**Setup Store 优势**：

- 状态声明与普通 `ref`/`computed` 一致，新人零心智负担
- 复用 composables（`useDict` / `useTheme`）作为 store 的一部分
- 类型推导更友好（无需显式标注 `state()` 返回类型）

---

## 4. 持久化（pinia-plugin-persistedstate）

### 4.1 注册位置

`src/store/index.ts` 已注册（默认导出 `pinia`，供 `main.ts` 一次性 `app.use()` 注入）：

```ts
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
export * from './modules/app'
export * from './modules/user'
export * from './modules/theme'
export * from './modules/tags-view'
export * from './modules/dict'
```

> 注意：router store（`./router`）**未在此处集中 re-export**——避免 router → remote-menu → user 反向循环。按需在调用处 `import { useRouterStore } from '@/store/modules/router'` 即可。

### 4.2 在 store 内启用（pick 字段）

```ts
// src/store/modules/theme.ts（实际 key 是 'theme-mode'，不带 namespace 前缀）
export const useThemeStore = defineStore(
  'theme',
  () => {
    const mode = ref<ThemeMode>('auto')
    const isDark = ref(false)

    function setMode(value: ThemeMode) {
      mode.value = value
    }

    return { mode, isDark, setMode }
  },
  {
    persist: {
      key: 'theme-mode', // pinia persist 直接写 localStorage，不拼接 VITE_STORAGE_NAMESPACE
      pick: ['mode'], // ← 仅持久化 mode，isDark 是派生 computed 不持久化
    },
  }
)
```

### 4.3 pick 字段选择原则

| 字段类型                         | 是否持久化 | 原因                          |
| -------------------------------- | ---------- | ----------------------------- |
| 用户偏好（主题/语言/侧边栏折叠） | ✅         | 刷新后保留体验                |
| 业务数据（订单列表/详情）        | ❌         | 重新拉取避免脏数据            |
| 派生状态（`computed`）           | ❌         | 计算属性不存                  |
| 临时态（loading/error）          | ❌         | 必须每次重新初始化            |
| 敏感数据（密码/refresh_token）   | ❌         | 走 HttpOnly cookie 不归前端管 |

### 4.4 namespace 与 pinia persist 的关系（重要）

`VITE_STORAGE_NAMESPACE` env 变量（默认 `'vue3-vite-project'`，见 `src/types/env.d.ts:19` + `src/utils/storage.ts:30`）**只影响 `utils/storage.ts` 的 `Local/Session` 工具类**，给业务手写的 `Local.set('foo', ...)` 自动拼接 `vue3-vite-project:foo` 前缀。

**不会自动应用到 pinia-plugin-persistedstate**——该插件直接用 `persist.key` 写 `localStorage[key]`，不会读取 `VITE_STORAGE_NAMESPACE`。如果需要命名空间隔离，写到 `localStorage` 的 key 上手动加前缀即可，例如：

```ts
persist: {
  key: 'vue3-vite-project:theme-mode', // 不推荐——更难排查冲突，storeId 已天然隔离
}
```

> 实际项目所有 store 的 `persist.key` 都是裸 key（`'theme-mode'` 等），靠 storeId 天然隔离多业务冲突；`VITE_STORAGE_NAMESPACE` 仅约束 utils/storage.ts 工具类。

### 4.5 手动清缓存

```ts
import { useDictStore } from '@/store/modules/dict'
const dictStore = useDictStore()
dictStore.clear() // 清空所有字典缓存（切换账号时调用）
```

---

## 5. 跨 store 调用

### 5.1 store 内调其他 store

```ts
// src/store/modules/user.ts（按需 import，避免循环依赖）
import { useDictStore } from './dict'

export const useUserStore = defineStore('user', () => {
  const dictStore = useDictStore()

  async function logout() {
    // store 不持有 router 实例，避免 user → router → remote-menu → user 的循环依赖
    // 跳转职责在调用方（useLogout composable / 守卫），详见 src/composables/useLogout.ts
    token.value = ''
    profile.value = null
    dictStore.clear() // ← 登出时清字典缓存（避免上一账号字典泄漏）
  }

  return { logout }
})
```

### 5.2 组件内同时调多个 store

```vue
<script setup lang="ts">
import { useUserStore } from '@/store/modules/user'
import { useDictStore } from '@/store/modules/dict'
import { useThemeStore } from '@/store/modules/theme'

const userStore = useUserStore()
const dictStore = useDictStore()
const themeStore = useThemeStore()

// 跨 store 组合逻辑
const userWithTheme = computed(() => ({
  name: userStore.profile?.name,
  darkMode: themeStore.mode === 'dark',
}))
</script>
```

### 5.3 不要直接 import 另一个 store 内部

```ts
// ❌ 反例：穿透到 store 内部实现
import { _internalDictCache } from '@/store/modules/dict/internal'

// ✅ 正例：通过对外接口
const dictStore = useDictStore()
await dictStore.fetchDict('user_status')
```

---

## 6. 单测模板

### 6.1 单文件 store 测试（Vitest）

```ts
// src/store/modules/theme.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from './theme'

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('默认 mode 是 auto', () => {
    const store = useThemeStore()
    expect(store.mode).toBe('auto')
  })

  it('setMode 切换主题', () => {
    const store = useThemeStore()
    store.setMode('dark')
    expect(store.mode).toBe('dark')
  })

  it('pick 字段持久化', () => {
    const store = useThemeStore()
    store.setMode('light')
    // 实际 key 是 'theme-mode'（不带 namespace 前缀）
    expect(localStorage.getItem('theme-mode')).toContain('light')
  })
})
```

---

## 7. 实战案例对比

### 案例 1：user store（跨模块，httpOnly 改造后无 token / 不持久化）

```ts
// src/store/modules/user.ts（2026-08-12 改造后实际形态）
// 凭证由后端 Set-Cookie 写入 httpOnly cookie，前端不可读；
// 前端只持 sessionStorage 'auth' 标记供守卫同步判断，profile / permissions 每次拉取
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginPayload, type UserProfile } from '@/api/modules/auth'
import { Session } from '@/utils/storage'
import { globalAbort } from '@/api/global-abort'
import { resetAuthGuardState } from '@/router/guards/auth'
import { useDictStore } from './dict'
import { useRouterStore } from './router'

export const useUserStore = defineStore('user', () => {
  // 状态：登录标记 + profile + 权限列表（httpOnly 模式下前端无 token）
  const authenticated = ref<boolean>(Session.get<boolean>('auth') ?? false)
  const profile = ref<UserProfile | null>(null)
  const permissions = ref<string[]>([])

  // 派生：守卫 / 组件判断登录态的唯一依据
  const isLoggedIn = computed(() => authenticated.value)

  // 登录：后端 Set-Cookie 后，前端只写 sessionStorage 标记 + 预加载字典
  async function login(credentials: LoginPayload) {
    await authApi.login(credentials)
    Session.set('auth', true)
    authenticated.value = true
    await fetchProfile()
    try {
      await useDictStore().preloadDict()
    } catch (err) {
      // 字典预加载失败不阻塞登录（5min TTL 兜底）
      console.warn('[user] 字典预加载失败（不阻塞登录流程）:', err)
    }
  }

  async function fetchProfile() {
    const p = await authApi.fetchProfile()
    profile.value = p
    permissions.value = p.permissions
  }

  /**
   * 清本地登录态（不动后端凭证 cookie）。
   * 供 logout 与守卫在凭证失效（fetchProfile 401）时调用。
   * 注意：最后 globalAbort.reset() 创建新 controller，避免重新登录的请求被旧 controller 立即取消
   */
  function resetLocalState(): void {
    Session.remove('auth')
    authenticated.value = false
    profile.value = null
    permissions.value = []
    globalAbort.abort('logout')
    resetAuthGuardState()
    const routerStore = useRouterStore()
    if (typeof routerStore.$reset === 'function') {
      routerStore.$reset()
    }
    globalAbort.reset()
  }

  /**
   * 乐观退出：先清本地登录态，后端 logout fire-and-forget。
   * 跳转职责不在 store（避免 user → router → remote-menu → user 循环依赖）；
   * 调用方（useLogout composable / 守卫）负责跳转。
   */
  async function logout(): Promise<void> {
    resetLocalState()
    try {
      await authApi.logout()
    } catch (err) {
      console.warn('[user] 后端 logout 请求失败（本地已退出，不影响）:', err)
    }
  }

  return {
    authenticated,
    profile,
    permissions,
    isLoggedIn,
    login,
    fetchProfile,
    logout,
    resetLocalState,
  }
})
// ⚠️ 无 persist 块：httpOnly 模式下凭证不在前端，前端也无 token 可持久化
```

关键变更点（对比旧版示例代码）：

| 旧（已废弃）                                   | 新（httpOnly 改造后）                                              | 原因                                         |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| `token` 字段 + `pick: ['token']` 持久化        | `authenticated` 字段（sessionStorage `auth` 标记），**无 persist** | 凭证 cookie 由后端 Set，前端不可读也不持久化 |
| `login()` 内 `Session.set('token', res.token)` | `Session.set('auth', true)` + `preloadDict()`                      | 不读 token，仅写登录标记 + 预热字典          |
| `logout()` 内调 `router.push('/login')`        | `logout()` 只调 `resetLocalState()` + 后端 logout                  | 跳转归调用方，store 不持有 router            |
| `import * as authApi from '@api/modules/auth'` | `import { authApi } from '@/api/modules/auth'`                     | 项目统一 named import + `@/...` 长路径       |

### 案例 2-3：theme / dict store

> 完整示例见对应专题文档：
>
> - theme store + useTheme composable：`docs/06-主题管理规范.md`
> - dict store + useDict composable：`docs/11-字典使用规范.md`

---

## 8. 常见坑

| 症状                                | 原因                                                      | 解法                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| store 修改后组件不刷新              | 直接改 `store.xxx = value` 但 xxx 是 ref 包装外层         | 用 `store.$patch({ xxx: value })` 或暴露 setter 函数                                                                                          |
| 持久化字段不生效                    | `pick` 字段名拼错或该字段在 Setup Store 中是 `computed`   | 只持久化 `ref`；computed 不持久化                                                                                                             |
| store 解构后失去响应式              | `const { authenticated } = useUserStore()` 解构后是普通值 | 用 `storeToRefs(store)` 解构 ref/computed                                                                                                     |
| 模块私有 store 跨模块访问           | 直接 import 另一个模块的 store 文件                       | 提升到全局 store 或通过 `modules/<m>/index.ts` 暴露                                                                                           |
| 切换账号后看到上个账号字典          | logout 没清 dict cache                                    | 业务方在 `userStore.logout()` 外显式调 `dictStore.clear()`（当前实现 `resetLocalState` 未含 dict 清理，若需严格隔离账号间字典，在调用方补调） |
| 主题持久化后刷新页面主题闪烁        | `<html>` 上的 `data-theme` 没在 createApp 之前应用        | main.ts 顶部读 localStorage 同步设置（见 docs/06）                                                                                            |
| `setActivePinia` 报错               | 测试未初始化 pinia 实例                                   | `beforeEach(() => setActivePinia(createPinia()))`                                                                                             |
| store 内部调用异步 API 没 try/catch | 异常冒泡到组件导致白屏                                    | store 内 try/catch + 上报 `errorHandler.report`                                                                                               |

---

## 9. 评审 Checklist（PR 必过）

```
□ 1. 新增 store 已判断放全局 vs 模块私有？
□ 2. 使用 Setup Store 风格（不是 Options Store）？
□ 3. 持久化 pick 字段已明确（不存 computed / 不存临时态 / 不存敏感凭证）？
□ 4. persist.key 无强制 namespace 前缀（裸 key 即可，靠 storeId 隔离）？
□ 5. 跨 store 调用通过对外接口（不 import 内部）？
□ 6. 含异步行为的 store 已 try/catch + errorHandler.report？
□ 7. logout / resetLocalState 类清理函数已按需清依赖缓存（dict / router UI / globalAbort）？
□ 8. 测试文件已用 setActivePinia(createPinia()) 初始化？
□ 9. 测试覆盖正常路径 + 失败路径（接口报错但本地态清理）？
□ 10. 命名 useXxxStore（驼峰 + Store 后缀）？
```

---

## 🔗 相关文档

| 文档                                         | 范围                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/18-代码组织决策表.md` §7               | 两层 store 边界速查                                                                                                                       |
| `docs/11-字典使用规范.md`                    | dict store 详细规范（TTL 缓存 + useDict composable）                                                                                      |
| `docs/06-主题管理规范.md`                    | theme store + useTheme composable                                                                                                         |
| `docs/16-token自动刷新与全局取消使用规范.md` | 凭证失效 → `useUserStore.resetLocalState()` 兜底，与 httpOnly cookie 协调（doc 文名沿用"token"但实际已是 sessionStorage `auth` 标记路径） |
| `docs/17-useRequest使用规范.md`              | useRequest vs Pinia store 决策表                                                                                                          |
| `docs/08-模块化架构总览.md` §3               | store 范式约束                                                                                                                            |

---

_文档版本：v1.1.0 | 编写日期：2026-09-04 | 配套项目版本：vue3-vite-project 1.0.0_
