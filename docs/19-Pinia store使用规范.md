# Pinia Store 使用规范

> **文档版本**：v1.0.0 | **最后更新**：2026-07-24
> **覆盖范围**：什么时候用 store / 全局 vs 模块私有 / Setup Store 风格 / 持久化 / 跨 store 调用 / 单测模板
> **适用读者**：第一次接触项目状态管理的新人 + 需要扩展 store 的老成员
> **配套源码**：`src/store/modules/*.ts`（6 个内置 store）+ `src/composables/useAuth.ts` + `src/composables/useDict.ts`

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
| 跨标签页同步业务数据          | store + 持久化 + `syncTabsPlugin`（自研）        | 用 `storage` 事件手动同步容易漏               |

---

## 2. 全局 store vs 模块私有 store 边界

### 全局（`src/store/modules/`）

**适用**：

- 跨 ≥2 个业务模块共享
- 与框架基础设施紧密耦合（user / theme / dict / app）
- 配置类（不依赖业务，可被任何模块 import）

**当前 6 个全局 store**：

| 文件           | 职责                                     | 持久化            |
| -------------- | ---------------------------------------- | ----------------- |
| `app.ts`       | 侧边栏、语言、全局 loading               | 否                |
| `user.ts`      | token / profile / 权限                   | 是（pick: token） |
| `theme.ts`     | 主题模式（light/dark/auto）              | 是（pick: mode）  |
| `router.ts`    | 路由 UI 状态（dynamicLoaded）            | 否                |
| `dict.ts`      | 字典（5min 业务层缓存 + 30s 网络层缓存） | 否                |
| `tags-view.ts` | 多页签状态                               | 否                |

### 模块私有（`src/modules/<m>/store/`）

**适用**：

- 仅本模块 ≥2 个组件共享
- 与特定业务强耦合
- 删除模块时随模块一起删

**实战案例**：

```
src/modules/order/
├── store/
│   ├── cart.ts          # 购物车（list + detail 共用）
│   └── draft.ts         # 表单临时态（多个弹窗共享）
```

---

## 3. Setup Store vs Options Store

**项目约定**：**统一使用 Setup Store 风格**（更接近 composables 心智，便于复用）。

```ts
// ✅ Setup Store（本项目风格）
export const useUserStore = defineStore('user', () => {
  const token = ref<string>(Session.get<string>('token') ?? '')
  const profile = ref<UserProfile | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  async function login(credentials: LoginPayload) {
    const res = await authApi.login(credentials)
    token.value = res.token
    Session.set('token', res.token)
  }

  function logout() {
    token.value = ''
    profile.value = null
    Session.remove('token')
  }

  return { token, profile, isLoggedIn, login, logout }
})
```

```ts
// ❌ Options Store（不推荐，容易与组合式 API 心智混淆）
export const useUserStore = defineStore('user', {
  state: () => ({ token: '', profile: null }),
  getters: { isLoggedIn: (state) => !!state.token },
  actions: {
    async login(creds) {
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

`src/store/index.ts` 已注册：

```ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
```

### 4.2 在 store 内启用（pick 字段）

```ts
// src/store/modules/theme.ts
export const useThemeStore = defineStore(
  'theme',
  () => {
    const mode = ref<ThemeMode>('auto')

    function setMode(value: ThemeMode) {
      mode.value = value
    }

    return { mode, setMode }
  },
  {
    persist: {
      key: 'gm-portal-fe:theme-mode',
      pick: ['mode'], // ← 仅持久化 mode，isDark/computed 不存
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

### 4.4 命名空间

```ts
// key 前缀隔离多项目共用 localStorage
persist: {
  key: (storeId) => `gm-portal-fe:${storeId}`,
}
```

> 命名空间由 `VITE_STORAGE_NAMESPACE` env 变量控制，详见 README §部署。

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
// src/store/modules/user.ts
import { useDictStore } from './dict'

export const useUserStore = defineStore('user', () => {
  const dictStore = useDictStore()

  async function logout() {
    token.value = ''
    profile.value = null
    dictStore.clear() // ← 登出时清字典缓存（避免上一账号字典泄漏）
    await router.push('/login')
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
    // localStorage 应包含 'gm-portal-fe:theme-mode'
    expect(localStorage.getItem('gm-portal-fe:theme-mode')).toContain('light')
  })
})
```

---

## 7. 实战案例对比

### 案例 1：user store（跨模块 + 持久化）

```ts
// src/store/modules/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Session } from '@utils/storage'
import * as authApi from '@api/modules/auth'

export interface UserProfile {
  id: number
  name: string
  permissions: string[]
}

export const useUserStore = defineStore(
  'user',
  () => {
    // 状态
    const token = ref<string>(Session.get<string>('token') ?? '')
    const profile = ref<UserProfile | null>(null)

    // 派生
    const isLoggedIn = computed(() => !!token.value)
    const permissions = computed(() => profile.value?.permissions ?? [])

    // 行为
    async function login(credentials: { username: string; password: string }) {
      const res = await authApi.authApi.login(credentials)
      token.value = res.token
      Session.set('token', res.token)
      await fetchProfile()
    }

    async function fetchProfile() {
      profile.value = await authApi.authApi.getProfile()
    }

    async function logout() {
      try {
        await authApi.authApi.logout()
      } catch (err) {
        // 即便接口失败，token 也要清
        console.warn('[user/logout] 接口失败但清本地态', err)
      }
      token.value = ''
      profile.value = null
      Session.remove('token')
    }

    return {
      token,
      profile,
      isLoggedIn,
      permissions,
      login,
      fetchProfile,
      logout,
    }
  },
  {
    persist: {
      key: 'gm-portal-fe:user-token',
      pick: ['token'], // ← 只持久化 token；profile 每次重新拉
    },
  }
)
```

### 案例 2-3：theme / dict store

> 完整示例见对应专题文档：
>
> - theme store + useTheme composable：`docs/06-主题管理规范.md`
> - dict store + useDict composable：`docs/11-字典使用规范.md`

---

## 8. 常见坑

| 症状                                | 原因                                                     | 解法                                                 |
| ----------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| store 修改后组件不刷新              | 直接改 `store.xxx = value` 但 xxx 是 ref 包装外层        | 用 `store.$patch({ xxx: value })` 或暴露 setter 函数 |
| 持久化字段不生效                    | `pick` 字段名拼错或该字段在 Setup Store 中是 `computed`  | 只持久化 `ref`；computed 不持久化                    |
| store 解构后失去响应式              | `const { token } = useUserStore()` 解构后 token 是普通值 | 用 `storeToRefs(store)` 解构 ref/computed            |
| 模块私有 store 跨模块访问           | 直接 import 另一个模块的 store 文件                      | 提升到全局 store 或通过 `modules/<m>/index.ts` 暴露  |
| 切换账号后看到上个账号字典          | logout 没清 dict cache                                   | `userStore.logout()` 内调 `dictStore.clear()`        |
| 主题持久化后刷新页面主题闪烁        | `<html>` 上的 `data-theme` 没在 createApp 之前应用       | main.ts 顶部读 localStorage 同步设置（见 docs/06）   |
| `setActivePinia` 报错               | 测试未初始化 pinia 实例                                  | `beforeEach(() => setActivePinia(createPinia()))`    |
| store 内部调用异步 API 没 try/catch | 异常冒泡到组件导致白屏                                   | store 内 try/catch + 上报 `errorHandler.report`      |

---

## 9. 评审 Checklist（PR 必过）

```
□ 1. 新增 store 已判断放全局 vs 模块私有？
□ 2. 使用 Setup Store 风格（不是 Options Store）？
□ 3. 持久化 pick 字段已明确（不存 computed / 不存临时态）？
□ 4. 命名空间已加（gm-portal-fe:<key>）？
□ 5. 跨 store 调用通过对外接口（不 import 内部）？
□ 6. 含异步行为的 store 已 try/catch + errorHandler.report？
□ 7. logout 类清理函数已调 dictStore.clear() 等清理？
□ 8. 测试文件已用 setActivePinia(createPinia()) 初始化？
□ 9. 测试覆盖正常路径 + 失败路径（接口报错但本地态清理）？
□ 10. 命名 useXxxStore（驼峰 + Store 后缀）？
```

---

## 🔗 相关文档

| 文档                                         | 范围                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| `docs/18-代码组织决策表.md` §7               | 两层 store 边界速查                                  |
| `docs/11-字典使用规范.md`                    | dict store 详细规范（TTL 缓存 + useDict composable） |
| `docs/06-主题管理规范.md`                    | theme store + useTheme composable                    |
| `docs/16-token自动刷新与全局取消使用规范.md` | user token 自动 refresh 机制                         |
| `docs/17-useRequest使用规范.md`              | useRequest vs Pinia store 决策表                     |
| `docs/08-模块化架构总览.md` §3               | store 范式约束                                       |

---

_文档版本：v1.0.0 | 编写日期：2026-07-24 | 配套项目版本：gm-portal-fe 0.x_
