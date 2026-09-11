# ProDialog 高级弹窗使用指南

> **文档版本**：v1.0.0 | **最后更新**：2026-09-11
> **覆盖范围**：声明式组件 `<ProDialog>` + 命令式 Hook `useDialog()` + 拖拽指令 `v-draggable`
> **源码位置**：`src/components/common/ProDialog/`、`src/composables/useDialog.ts`、`src/directives/draggable.ts`

---

## 📋 概述

`ProDialog` 是 Element Plus `ElDialog` 的工程化封装，**围绕三个核心痛点** 高频弹窗场景做了扩展：

| 痛点                                    | 解决方案                                                |
| --------------------------------------- | ------------------------------------------------------- |
| 拖拽弹窗出视口外无法找回                | `v-draggable` 指令 + 视口边界钳制                       |
| 业务方频繁写「全屏切换按钮」            | 内置 `fullScreen` 切换 + `showFullScreenButton`         |
| 业务方既要模板 `v-model` 又要 `JS` 回调 | **双入口**：声明式 `<ProDialog>` + 命令式 `useDialog()` |

完整 demo 站：`/demo/pro-dialog-overview`（声明式）+ `/demo/pro-dialog-use-dialog`（命令式）+ `/demo/pro-dialog-resizable`（调整宽高）。

---

## 1. 三种入口对比

| 入口                     | 适用场景                                     | 返回值                                                 |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------ |
| `<ProDialog v-model>`    | 模板里已声明、可控显隐                       | `update:modelValue` 事件                               |
| `useDialog(Comp).open()` | 按钮回调 / 请求回调中动态唤起                | `Promise<true>`（确定）/ reject `DialogCancelledError` |
| `v-draggable`            | 需要拖拽边界钳制的弹窗（ProDialog 默认启用） | —                                                      |

---

## 2. 声明式 `<ProDialog>`

### 2.1 Props

> 原生 ElDialog Props 通过 `$attrs` 透传（详见 §2.4）。下表仅列 ProDialog 自有 Props。

| Prop                   | 类型      | 默认值  | 说明                                                             |
| ---------------------- | --------- | ------- | ---------------------------------------------------------------- |
| `modelValue`           | `boolean` | `false` | 显隐（`v-model:modelValue`）                                     |
| `title`                | `string`  | `''`    | 弹窗标题（透传 EP `title`；传入 `header` 插槽时插槽优先）        |
| `draggable`            | `boolean` | `true`  | 是否允许按住头部拖拽（**全屏态自动禁用**）                       |
| `fullScreen`           | `boolean` | `false` | 初始是否全屏（头部自带切换按钮）                                 |
| `showFullScreenButton` | `boolean` | `true`  | 是否显示头部全屏切换按钮                                         |
| `resizable`            | `boolean` | `false` | 是否允许右下角拖拉调整宽高（启用后右下角出现 12×12 px 三角手柄） |

### 2.2 Events

| Event               | 参数                              | 说明                                                              |
| ------------------- | --------------------------------- | ----------------------------------------------------------------- |
| `update:modelValue` | `(value: boolean)`                | `v-model` 双向绑定                                                |
| `open`              | —                                 | 弹窗打开（进入动画开始）                                          |
| `close`             | —                                 | 弹窗关闭（**所有**关闭途径的兜底：X / ESC / 遮罩 / `confirm` 后） |
| `confirm`           | —                                 | 仅点击内置「确定」按钮触发                                        |
| `fullScreenChange`  | `(value: boolean)`                | 全屏状态切换                                                      |
| `resizeChange`      | `(width: number, height: number)` | 拖拉调整结束（**mouseup 触发**，避免 mousemove 高频抛事件）       |

### 2.3 Slots

| Slot      | 说明                                                                  |
| --------- | --------------------------------------------------------------------- |
| `default` | 弹窗正文（ProDialog 内置「取消 / 确定」footer 时也可省略）            |
| `header`  | 自定义头部（传入则完全取代默认 title + 全屏 + 关闭按钮）              |
| `footer`  | 自定义底部（传入则完全取代内置的「取消 / 确定」；关闭由用户自行处理） |

### 2.4 与 ElDialog 的关系

ProDialog 是 ElDialog 的**扩展**而非替换：

- 显式声明的 Props 仅为 6 项（见 §2.1），其余 ElDialog Props（`width` / `top` / `modal` / `showClose` / `beforeClose` / `closeOnClickModal` / `closeOnPressEscape` / `destroyOnClose` / `center` / `alignCenter` / `appendToBody` 等）经 `$attrs` 原样透传到内部 `el-dialog`
- Events（除 §2.2 列出的 6 个扩展事件外）同样透传：`open` / `opened` / `close` / `closed` 等
- 关闭逻辑：ProDialog 内部 header 的自绘关闭按钮会把 `show-close` 从 `$attrs` 剥离（kebab / camel 都识别），避免 EP 重复渲染原生 X；语义保持对齐原生 X（`beforeClose` 存在时交由它决定）

**为什么不全量继承 ElDialog Props**：Vue 3.6 SFC 编译器无法对 `Partial<InstanceType<typeof ElDialog>['$props']>` 做编译期类型展开，强行写会丢失类型。`$attrs` 透传是当前最佳平衡（详见 `src/components/common/ProDialog/ProDialog.vue` 文件头 JSDoc）。

### 2.5 基础示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// ProDialog 由 @/components/index.ts 自动扫描注册为全局组件，无需 import
const visible = ref(false)

function onConfirm() {
  ElMessage.success('已确认')
  visible.value = false
}
</script>

<template>
  <el-button @click="visible = true">打开弹窗</el-button>
  <ProDialog v-model="visible" title="编辑用户" width="600px" draggable @confirm="onConfirm">
    <p>弹窗正文（可写任意内容）</p>
  </ProDialog>
</template>
```

### 2.6 全屏 + 拖拽交叉

`fullScreen=true` 时，弹窗贴满视口，**拖拽自动禁用**（拖拽无意义且会破坏布局）。用户可点击头部全屏按钮切换：

```vue
<ProDialog
  v-model="visible"
  title="报告预览"
  :full-screen="isFull"
  @full-screen-change="(v) => (isFull = v)"
>
  <ReportContent />
</ProDialog>
```

### 2.7 resizable 调整宽高

启用 `resizable` 后，右下角出现 12×12 px 三角手柄：

```vue
<ProDialog v-model="visible" title="可调整" resizable @resize-change="onResize">
  <p>拖右下角三角调整宽高</p>
</ProDialog>
```

```ts
function onResize(width: number, height: number) {
  console.log(`新尺寸：${width}×${height}px`)
}
```

**钳制规则**（硬编码常量）：

| 维度   | 最小 | 最大          |
| ------ | ---- | ------------- |
| width  | 320  | viewport - 16 |
| height | 200  | viewport - 16 |

**与 `draggable` / `fullScreen` 互斥**：全屏态 resizable 自动禁用（缩放到 0）；resize 后切全屏退出，会清除内联 `width/height`，回到 EP 默认 480，避免残留尺寸。

### 2.8 自定义 header / footer

```vue
<ProDialog v-model="visible" title="默认">
  <template #header>
    <div class="my-header">
      <el-icon><Aim /></el-icon>
      <span>完全自定义头部</span>
    </div>
  </template>
  <p>正文</p>
  <template #footer>
    <el-button @click="visible = false">关闭</el-button>
  </template>
</ProDialog>
```

> **注意**：自定义 footer 时，ProDialog 不再内置「取消 / 确定」按钮，`confirm` 事件不会触发，关闭逻辑由用户自行处理。

---

## 3. 命令式 `useDialog()`

### 3.1 适用场景

- 按钮回调中需要唤起弹窗（不必预先在模板埋组件节点）
- 请求回调（如「提交成功，弹出确认弹窗」）
- 业务组件多次复用同一弹窗配置，希望拿到 Promise 句柄

### 3.2 三个关键机制

| 机制                      | 说明                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **动态挂载**              | `open()` 时创建容器 `<div data-pro-dialog-container>` 挂到 `body`，用 `render()` 渲染包装组件；EP `closed` 事件后 `render(null) + remove()` 销毁，无 DOM 残留    |
| **appContext 双保险继承** | setup 内调用时捕获 `getCurrentInstance().appContext`；纯 JS 调用回退到 `main.ts` 通过 `setDialogAppContext(app)` 注册的全局 app                                  |
| **Promise 语义**          | `open()` 返回 `Promise<true>`：点「确定」resolve；取消 / 关闭 / X / ESC / 遮罩 reject `DialogCancelledError`（`instanceof` 可识别，对齐 `ElMessageBox.confirm`） |

### 3.3 main.ts 必备接入

**必须在 `app.use(...)` 全部完成之后**调用 `setDialogAppContext(app)`，否则 `_context.provides` 不完整（Pinia / Router / i18n 是各插件 install 时写入的）：

```ts
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
// ... 其他 app.use(...)
import { setDialogAppContext } from '@/composables/useDialog'

const app = createApp(App)
app.use(Pinia)
app.use(Router)
app.use(I18n)
app.use(GlobalComponents)
app.use(Directives)
app.use(Plugins)

// ↓↓↓ 必须在所有 app.use 之后 ↓↓↓
setDialogAppContext(app)

app.mount('#app')
```

### 3.4 基础示例

```ts
// src/views/UserList.vue
<script setup lang="ts">
import { useDialog } from '@/composables/useDialog' // AutoImport 也可省略
import { ElMessage } from 'element-plus'
import EditUserForm from './EditUserForm.vue'

const editDialog = useDialog(EditUserForm, { title: '编辑用户', width: '600px' })

async function handleEdit(userId: number) {
  try {
    await editDialog.open({ userId }) // 点「确定」resolve
    ElMessage.success('保存成功')
  } catch (e) {
    if (e instanceof DialogCancelledError) return // 取消/关闭/X/ESC/遮罩
    ElMessage.error(`异常：${String(e)}`)
  }
}
</script>

<template>
  <el-button @click="handleEdit(123)">编辑</el-button>
</template>
```

### 3.5 contentProps 透传

```ts
await editDialog.open({ userId: 1, readonly: false })
// → 渲染 <EditUserForm :user-id="1" :readonly="false" />
```

### 3.6 setProps 运行时更新

```ts
const loading = ref(false)
const dlg = useDialog(DetailPanel, { title: '详情' })

dlg.open()
// 后续异步加载到数据后：
dlg.setProps({ title: '详情（已加载）', width: '800px' })
```

### 3.7 错误识别

```ts
import { DialogCancelledError } from '@/composables/useDialog' // class 名不走 AutoImport

try {
  await dlg.open()
} catch (e) {
  if (e instanceof DialogCancelledError) {
    // 用户主动取消（点取消 / X / ESC / 遮罩），静默
  } else {
    // 真正的业务异常
    console.error(e)
  }
}
```

`DialogCancelledError` 还带 `code === 'DIALOG_CANCELLED'` 常量，可不依赖 instanceof：

```ts
if ((e as { code?: string })?.code === 'DIALOG_CANCELLED') return
```

### 3.8 句柄复用 vs 重复 open

```ts
const dlg = useDialog(MyComponent, { title: '弹窗' })
await dlg.open() // 第一次
// 关闭后
await dlg.open() // 复用同一句柄，open() 内部清理旧 Promise
```

**重复 open（不关旧弹窗直接 open）**：旧 Promise 按「取消」语义结算（reject `DialogCancelledError`），新 Promise 挂起，弹窗内容切换。

---

## 4. `v-draggable` 拖拽指令

### 4.1 用法

```vue
<template>
  <!-- 绑定元素即手柄 -->
  <div v-draggable>标题区域（按住可拖）</div>
</template>

<script setup lang="ts">
// 接受 boolean 参数显式控制启用（默认 true）
const enabled = ref(true)
</script>

<template>
  <div v-draggable="enabled">标题区域</div>
</template>
```

### 4.2 与 ElDialog 原生 draggable 差异

| 维度         | EP 原生 `draggable`  | `v-draggable`（本项目）                       |
| ------------ | -------------------- | --------------------------------------------- |
| 边界限制     | **无**，可拖出视口外 | 钳制在视口内（视口 - 弹窗尺寸）               |
| 找回机制     | 不可找回             | 全弹窗保留在视口内，必可见                    |
| 手柄         | 整个 header          | 绑定元素即手柄（更精准）                      |
| 状态切换兼容 | 全屏切换可能失灵     | 每次 mousedown 重读位置 + 内联 style 状态判断 |

### 4.3 关键设计决策（防止被「善意重构」破坏）

| 决策                                           | 为什么                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| 绑定元素即手柄（`el.closest('.el-dialog')`）   | 防止内容区选择 / 滚动被误触发拖拽                                            |
| 每次 mousedown 重读 `getBoundingClientRect()`  | 否则第二次拖拽以初始位置为基准 → 弹窗瞬间跳回偏移前位置                      |
| 用内联 style 实际状态判断定位切换              | ProDialog 全屏切换会清除内联定位，flag 模式会在 flag=true 但定位已失效时失灵 |
| 钳制到「视口 - 弹窗尺寸」而非「视口 - 手柄高」 | 后者会让弹窗底部超出视口 → 触发 EP `.el-overlay { overflow: auto }` 的滚动条 |
| 状态存 `WeakMap` 而非 `el` 自定义属性          | 不污染 DOM 类型声明，元素回收自动释放                                        |

### 4.4 已知限制

- **仅鼠标事件**：中后台桌面端场景；如需平板触摸支持需改 Pointer Events
- **不触发 mousemove 抛事件**：ProDialog 的 `resizeChange` 只在 `mouseup` 抛，避免父组件高频重渲染

---

## 5. 组合实战

### 5.1 表单编辑弹窗（声明式）

```vue
<template>
  <el-button @click="visible = true">新增用户</el-button>
  <ProDialog v-model="visible" title="新增用户" width="540px" @confirm="handleSubmit">
    <el-form ref="formRef" :model="form" :rules="rules">
      <el-form-item label="账号" prop="username">
        <el-input v-model="form.username" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" />
      </el-form-item>
    </el-form>
  </ProDialog>
</template>
```

> 复杂校验建议用 `@/components/form-schema/XForm`（schema 驱动），见 `docs/24-XForm使用指南.md`。

### 5.2 确认弹窗（命令式）

```ts
import { NormalConfirm } from '@/components/common/NormalConfirm'
// 或自己定义
const ConfirmDialog = defineComponent({
  props: { message: { type: String, required: true } },
  emits: ['confirm'],
  setup(props, { emit }) {
    return () => h('p', props.message)
  },
})

const confirmDlg = useDialog(ConfirmDialog)

async function handleDelete() {
  try {
    await confirmDlg.open({ message: '确认删除？' })
    // 真正删除
    await userApi.delete(id)
    ElMessage.success('已删除')
  } catch (e) {
    if (e instanceof DialogCancelledError) return
  }
}
```

### 5.3 自适应 resizable 弹窗

```vue
<ProDialog v-model="visible" title="代码预览" resizable :style="{ minWidth: '320px' }">
  <pre><code>{{ code }}</code></pre>
</ProDialog>
```

适合代码对比、长报告预览等场景——用户可拖大看清细节，拖小不挡视野。

---

## 6. 决策表

| 场景                                 | 推荐                             |
| ------------------------------------ | -------------------------------- |
| 模板里已声明、可控显隐               | 声明式 `<ProDialog v-model>`     |
| 按钮回调中动态唤起                   | 命令式 `useDialog(Comp).open()`  |
| 同一弹窗配置需多次复用               | 命令式（句柄化，复用 open）      |
| 需拿到「确定 / 取消」结果走业务逻辑  | 命令式（Promise 语义）           |
| 弹窗内表单字段多、需联动校验         | 声明式（模板直观）+ XForm schema |
| 弹窗需动态调整大小（详情/审批/报告） | 声明式 + `resizable`             |

---

## 7. 已知限制与边界

| #   | 限制                                                                                 | 影响范围                             |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| 1   | 关闭逻辑兜底事件为 `close`，但 confirm 后也会触发 `close`——区分应基于 `confirm` 事件 | 业务方需注意事件顺序                 |
| 2   | 全屏态 draggable / resizable 自动禁用（弹窗贴满视口，拖拽无意义）                    | 全屏模式下不会失灵，但也不能拖       |
| 3   | `v-draggable` 仅支持鼠标事件（桌面端）                                               | 平板 / 触屏需改 Pointer Events       |
| 4   | 透传 ElDialog Props 时类型不会出现在 IDE hover 里                                    | 需对照 ElDialog 文档                 |
| 5   | 同一句柄重复 open 时，旧 Promise 按「取消」语义结算                                  | 调用方需自行处理旧 Promise 的 reject |

---

## 8. 测试覆盖

| 文件                                                | 用例数 | 覆盖范围                                                                                                     |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `src/components/common/ProDialog/ProDialog.spec.ts` | 13     | resizable / beforeClose / show-close / 全屏×resize 交叉 / 内联清理                                           |
| `src/composables/useDialog.spec.ts`                 | 6      | 确认 resolve + 容器销毁 / 取消 reject / X 关闭 reject / setProps 实时更新 / contentProps 透传 / close() 语义 |
| `src/directives/draggable.spec.ts`                  | 4      | 拖拽位移 / 边界钳制 / 禁用 / 动态恢复（clampPosition 边界数学覆盖）                                          |
| demo（手动验证）                                    | 4 个   | ProDialogOverview / ProDialogUseDialog / ProDialogResizable / DemoField 4 区                                 |

---

## 9. 速查

```vue
<!-- 最小声明式 -->
<ProDialog v-model="visible" title="标题">正文</ProDialog>
```

```ts
// 最小命令式
const dlg = useDialog(MyComp, { title: '标题' })
try {
  await dlg.open(props)
} catch (e) {
  if (e instanceof DialogCancelledError) return
}
```

```vue
<!-- 最小拖拽 -->
<div v-draggable>标题</div>
```

---

## 10. 相关文档

- 组件源码：`src/components/common/ProDialog/ProDialog.vue`
- 命令式 Hook：`src/composables/useDialog.ts`
- 拖拽指令：`src/directives/draggable.ts`
- 类型导出：`src/components/common/ProDialog/types.ts`
- Demo 站：`src/modules/demo/examples/ProDialog/`
- Element Plus 文档：https://element-plus.org/zh-CN/component/dialog.html
