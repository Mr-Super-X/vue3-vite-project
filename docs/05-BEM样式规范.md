# BEM 样式规范

> **文档版本**：v1.0.0 | **最后更新**：2026-07-21
> **覆盖范围**：BEM 命名约定、样式隔离策略、SCSS mixin 使用、文件组织、代码评审清单

---

## 📋 为什么选 BEM

| 候选方案                            | 优点                                                                     | 缺点                                        | 结论        |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ----------- |
| **BEM（Block__Element--Modifier）** | 类名语义化、可读、跨团队无歧义、与 Element Plus 等主流 UI 库源码风格一致 | 类名较长                                    | ✅ **采纳** |
| CSS Modules                         | 隔离最强                                                                 | 背离 BEM 可读性目标、覆盖第三方样式成本高   | ❌          |
| OOCSS / SMACSS                      | 灵活                                                                     | 团队共识成本高、容易走向"自定义无规范"      | ❌          |
| Atomic CSS（UnoCSS 已用）           | 复用高                                                                   | 仅适合布局/工具类，业务组件样式仍需命名约定 | ⚠️ 互补     |

**核心立场**：UnoCSS 负责**布局/工具类**（flex、spacing、color），BEM 负责**业务组件作用域样式**。两者不冲突。

---

## 🎯 三大核心原则

1. **Block = 独立组件**：一个 Block 必须能独立"搬走"到任何项目而不破坏其他样式
2. **Element 只在 Block 内部有意义**：脱离 Block 的 Element 无意义，禁止跨 Block 复用 Element
3. **Modifier 不破坏结构**：Modifier 只调整外观/状态，不能重排 DOM 结构

---

## 🏷️ 命名规则（核心）

### 1. Block（块）

- **格式**：连字符式小写英文（`kebab-case`）
- **语义**：可独立复用的功能模块，对应一个 Vue 组件
- **示例**：`user-card`、`login-form`、`header-bar`、`sidebar-menu`

```scss
.user-card {
  /* ... */
}
```

### 2. Element（元素）

- **格式**：`block__element`（双下划线连接）
- **语义**：Block 的组成部件，离开 Block 无意义
- **示例**：`user-card__avatar`、`login-form__submit`、`header-bar__title`

```scss
.user-card__avatar {
  /* ... */
}
```

### 3. Modifier（修饰符）

- **格式**：`block--modifier`（双连字符）或 `block__element--modifier`
- **语义**：改变外观/状态/主题，不改变结构
- **示例**：`user-card--featured`、`login-form__submit--loading`、`header-bar--dark`

```scss
.user-card--featured {
  /* ... */
}
```

### 4. State（状态，BEM 扩展）

- **格式**：`is-{state}`（前缀 `is-`，避免与 Modifier 混淆）
- **语义**：运行时状态（active、disabled、loading、focused）
- **应用方式**：通过 Vue 的 `:class="{ 'is-active': isActive }"` 切换

```scss
.user-card.is-active {
  /* ... */
}
```

### 5. 命名禁区

| 反例                     | 原因                                     |
| ------------------------ | ---------------------------------------- |
| `.user-card__item__link` | Element 嵌套 Element，违反 BEM 结构      |
| `.btn`                   | Block 缩写无语义，不可独立复用           |
| `.userCard__avatar`      | Block 必须小写连字符，不能 camelCase     |
| `.card--primary__btn`    | Modifier 不能脱离 Block 单独修饰 Element |

---

## 🧰 SCSS mixin（推荐写法）

> 工具文件：`src/assets/styles/mixins/bem.scss`（已落地，约 90 行）
> 与手写 BEM 字符串 100% 等价，仅是更优雅的书写方式。

### mixin 一览

| mixin           | 用途                       | 生成示例                         |
| --------------- | -------------------------- | -------------------------------- |
| `b($block)`     | 注册 Block 并打开作用域    | `.user-card { ... }`             |
| `e($element)`   | 注册 Element               | `.user-card__avatar { ... }`     |
| `m($modifier)`  | 注册 Block 修饰符          | `.user-card--featured { ... }`   |
| `is($state)`    | 注册 State（BEM 扩展）     | `.user-card.is-active { ... }`   |
| `when($suffix)` | 注册主题/场景前缀          | `.user-card--when-light { ... }` |
| `reset-block`   | 重置块名作用域（仅测试用） | —                                |

### 完整使用示例

```vue
<!-- src/modules/user/components/UserCard.vue 或 src/components/common/UserCard.vue -->
<script setup lang="ts">
interface Props {
  featured?: boolean
  loading?: boolean
}
defineProps<Props>()
</script>

<template>
  <div class="user-card" :class="{ 'is-loading': loading, 'is-featured': featured }">
    <img class="user-card__avatar" :src="user.avatar" />
    <h3 class="user-card__name">{{ user.name }}</h3>
    <button class="user-card__action">关注</button>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins/bem' as *;

.user-card {
  @include b(user-card) {
    padding: var(--spacing-md);
    border: 1px solid #eee;
    border-radius: var(--radius-md);

    @include e(avatar) {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    @include e(name) {
      font-size: 16px;
      font-weight: 600;
    }

    @include e(action) {
      padding: 4px 12px;
      cursor: pointer;

      // Element 也可以挂 Modifier
      @include m(primary) {
        background: var(--color-primary);
        color: #fff;
      }
    }

    @include is(loading) {
      opacity: 0.6;
      pointer-events: none;
    }

    @include is(featured) {
      border-color: gold;
    }
  }
}
</style>
```

**编译产物（与手写 BEM 字符串完全一致）**：

```css
.user-card[data-v-xxx] {
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
}
.user-card__avatar[data-v-xxx] {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.user-card__name[data-v-xxx] {
  font-size: 16px;
  font-weight: 600;
}
.user-card__action[data-v-xxx] {
  padding: 4px 12px;
  cursor: pointer;
}
.user-card__action--primary[data-v-xxx] {
  background: #409eff;
  color: #fff;
}
.user-card.is-loading[data-v-xxx] {
  opacity: 0.6;
  pointer-events: none;
}
.user-card.is-featured[data-v-xxx] {
  border-color: gold;
}
```

---

## 🛡️ 样式隔离三层防线

> **目标**：任意位置使用，样式都不被污染。

| 防线                             | 机制                                             | 作用                           |
| -------------------------------- | ------------------------------------------------ | ------------------------------ |
| **第一层**：Vue `<style scoped>` | 编译器自动给选择器追加 `[data-v-xxx]` 属性选择器 | 阻止当前组件样式泄漏到其他组件 |
| **第二层**：SCSS `@use` 模块化   | 顶层样式用 `@use './reset.css'`，避免全局污染    | 阻止文件级全局变量泄漏         |
| **第三层**：BEM 命名             | 类名自带 Block 前缀，无冲突空间                  | 即使 scoped 失效，类名也不冲突 |

### 为什么需要三层

| 单一防线失败场景                                   | 三层防线的兜底                                    |
| -------------------------------------------------- | ------------------------------------------------- |
| `scoped` 不隔离子组件根元素（`<slot>` 透传根元素） | BEM 命名让父子组件类名不冲突                      |
| 全局 reset.css 修改了 `*` 选择器                   | BEM Block 名空间隔离了用户 reset 误伤             |
| 第三方组件库（如 Element Plus）类名冲突            | Element Plus 自身用 BEM，本项目也用 BEM，统一约定 |

### 何时不用 scoped

| 场景                  | 处理                                                 |
| --------------------- | ---------------------------------------------------- |
| 全局 reset / 工具类   | 放在 `src/assets/styles/`，**不写 scoped**           |
| Element Plus 主题覆盖 | 放在 `src/assets/styles/index.scss`，**不写 scoped** |
| 第三方组件样式穿透    | 用 `:deep(.el-button) { ... }`，仅限必要时           |

---

## 📁 文件组织

```
src/assets/styles/
├── index.scss              # 入口：按顺序 @use reset/variables/theme/transition/element-overwrite/custom
├── reset.css               # 浏览器基线重置（normalize.css 替代）+ 全局滚动条样式
├── variables.scss          # 主题无关变量（品牌色 / 间距 / 圆角 / 字号 / 字重 / 行高 / 阴影 / z-index / 动画时长 / 缓动）
├── theme.scss              # 主题感知变量（背景 / 文字 / 边框，light + dark 双主题）
├── transition.scss         # 全局过渡动画（5 个 @keyframes + 3 个过渡工具类 + reduced-motion 适配）
├── element-overwrite.scss  # Element Plus 5 个主色 × 5 个灯色阶 = 25 个 CSS 变量覆盖
├── custom.scss             # 复合场景工具类（.gm-flex-center / .gm-flex-between / .gm-ellipsis-* 等）
└── mixins/
    ├── bem.scss            # BEM 编程式 mixin（编译期拼接）
    ├── transitions.scss    # 过渡 mixin（3 个）
    └── responsive.scss     # 响应式断点 mixin（gm-responsive / gm-responsive-down）

src/components/
├── common/<Name>.vue       # 通用组件（自动注册为全局组件）
└── layout/<Name>.vue       # 路由级布局组件

components/*.vue 内 <style lang="scss" scoped>  # 组件作用域样式（@use bem/transitions 等 mixin）
```

### 规则

1. **全局样式只放在 `src/assets/styles/`**：禁止在组件中写"全局生效"的样式
2. **组件样式写在 SFC 内**：禁止拆出独立 `.scss` 文件（除非组件库对外发布）
3. **跨组件复用的样式 → 抽到全局 `variables.css`**：禁止在组件内 `:root { --xxx: ... }` 散落定义

---

## ✅ 评审 Checklist

> 代码评审时，对涉及样式的 PR 必须逐条过。

```
□ 1. 命名是否符合 BEM（Block__Element--Modifier / is-{state}）？
□ 2. Element 是否仅在所属 Block 内部使用？
□ 3. Modifier 是否仅调整外观（未改变 DOM 结构）？
□ 4. 是否滥用 Element 嵌套 Element（__a__b）？
□ 5. <style> 块是否加了 lang="scss" scoped？
□ 6. 是否使用了 @use 而非 @import？
□ 7. 跨组件复用的值是否抽到 variables.css？
□ 8. 是否避开了命名禁区（缩写 / camelCase / 单字母）？
□ 9. 是否避免了深层嵌套（>4 层需重构成多个 Block）？
□ 10. 是否避免了 .is-* 被硬编码到模板（应通过 :class 切换）？
```

---

## 🛠️ How to write a new component（端到端流程）

> 新人首次写业务组件的完整流程。从命名到评审，6 步可走完。

### Step 1：定 Block 名（kebab-case）

```
✅ user-card / order-list / data-table
❌ UserCard / userCard / usercard / card
```

Block 名就是组件的"作用域根"，**全局唯一**（不要用 `card` / `button` 这种通用名）。

### Step 2：创建组件文件

```
src/components/<block-name>/  （通用组件）
或
src/modules/<m>/components/<block-name>/  （模块私有组件）
├── index.vue
└── <block-name>.spec.ts  （可选，复杂组件才加）
```

> Vue 文件名用 kebab-case（如 `user-card.vue`），与 Block 名一致。

### Step 3：SFC 三段结构模板

```vue
<script setup lang="ts">
// 1. props/emits 用 interface（§五 TS 用法）
interface UserCardProps {
  user: { id: number; name: string; avatar?: string }
  variant?: 'default' | 'compact'
}
const props = withDefaults(defineProps<UserCardProps>(), { variant: 'default' })

// 2. 状态用 ref；不要在 computed 内改 ref
const collapsed = ref(false)

// 3. emit 用 defineEmits<T>()
const emit = defineEmits<{ select: [id: number] }>()
</script>

<template>
  <!-- 4. BEM 类名：block / element / modifier -->
  <div :class="[bem.b(), bem.m(`variant-${props.variant}`)]">
    <img :class="bem.e('avatar')" :src="user.avatar" />
    <h3 :class="bem.e('name')">{{ user.name }}</h3>
    <button
      :class="[bem.e('action'), bem.is('collapsed', collapsed)]"
      @click="emit('select', user.id)"
    >
      查看
    </button>
  </div>
</template>

<style lang="scss" scoped>
// 5. 编译期 mixin（嵌套多时推荐）
@use '@/assets/styles/mixins/bem' as *;

@include b('user-card') {
  display: flex;
  gap: 12px;

  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }

  &__name {
    margin: 0;
    font-size: var(--font-size-md);
  }

  &__action {
    padding: 4px 12px;
    border: 1px solid var(--border-base);
    background: var(--bg-primary);
    cursor: pointer;

    @include is('collapsed') {
      padding: 2px 8px;
      font-size: 12px;
    }
  }

  // 6. Modifier：仅调整外观，不改 DOM
  @include m('variant-compact') {
    gap: 8px;

    &__avatar {
      width: 32px;
      height: 32px;
    }
  }
}
</style>
```

### Step 4：3 个最常见反例

| #   | 反例                                                          | 正确做法                                                    |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | `class="user-card-avatar"`（混 kebab-case 和 BEM）            | `class="user-card__avatar"`（BEM 双下划线）                 |
| 2   | `<div class="user-card__header__title">`（3 层 Element 嵌套） | 拆为多个 Block（如 `user-card__header` + `header__title`）  |
| 3   | `<div :class="{ 'is-active': active }">`（直接写 is-）        | `:class="bem.is('active', active)"`（运行时由 `is()` 生成） |

### Step 5：跨组件复用 → 抽到 variables.css

```scss
// ❌ 在组件内散落
.user-card {
  --avatar-size: 48px;
}

// ✅ 抽到 src/assets/styles/variables.scss（§样式隔离三层防线）
$avatar-size-default: 48px;
```

### Step 6：跑 `pnpm check:routes` + ESLint + 单测

```bash
pnpm lint:fix        # ESLint 自动修复 + 检查 BEM 命名
pnpm test --run      # 若有 <block>.spec.ts 跑单测
pnpm check:routes    # 如果改了 routes/* 跑一致性
```

---

## ❓ FAQ

### Q1：为什么不用 Stylelint 强制 BEM？

**A**：项目先前决策不引入 Stylelint（详见 `docs/01-工具兼容性问题踩坑记录.md`）。本规范通过代码评审 + ESLint + 文档确保。

### Q2：Element Plus 的 BEM 怎么对齐？

**A**：Element Plus 类名是 `el-button`、`el-button--primary`、`el-button__content`，与本规范完全兼容。本项目自定义组件建议也使用类似的"短前缀"约定（如 `user-card` 而非 `gm-user-card`）。

### Q3：mixin 写法 vs 手写字符串，哪个好？

| 维度       | mixin            | 手写字符串  |
| ---------- | ---------------- | ----------- |
| 嵌套可读性 | ✅ 优秀          | ⚠️ 一般     |
| 调试类名   | ⚠️ 编译后才能看  | ✅ 直接看到 |
| 心智成本   | ⚠️ 需记 mixin 名 | ✅ 零成本   |

**建议**：新组件优先用 mixin（嵌套多时优势明显），简单组件（≤3 个选择器）手写字符串更轻量。

### Q4：什么时候用 `is()`，什么时候用 `m()`？

| 场景                                      | mixin    | 说明                  |
| ----------------------------------------- | -------- | --------------------- |
| 运行时状态切换（loading/active/disabled） | `is()`   | 通过 Vue 响应式切换   |
| 主题/场景（light/dark/compact）           | `when()` | 通过根类或属性切换    |
| 视觉变体（primary/success/warning）       | `m()`    | 通常由 props 静态决定 |

### Q5：UnoCSS 原子类与 BEM 冲突吗？

**A**：不冲突。UnoCSS 用于**布局/工具类**（`flex`、`p-4`、`text-center`），BEM 用于**业务组件作用域样式**。规则：

```vue
<!-- ✅ 正确：UnoCSS 布局 + BEM 业务样式 -->
<div class="user-card flex items-center justify-between">
  <img class="user-card__avatar" />
</div>

<!-- ❌ 反例：把 BEM 类名硬塞进 UnoCSS 工具类名 -->
<div class="user-card-flex">  <!-- 这不是 BEM，也不是 UnoCSS 工具类 -->
```

---

## 🔗 相关文档

- 工具链：`docs/04-构建与测试工具.md` §Sass 配置
- 代码评审：`docs/02-代码质量工具链.md` §ESLint flat config
- 设计规范：`docs/superpowers/specs/2026-07-17-vue3-vite-ts-scaffold-design.md`
- BEM 工具：`src/assets/styles/mixins/bem.scss`
- 示范组件：`src/components/layout/Header.vue`
