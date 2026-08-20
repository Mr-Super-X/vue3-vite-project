# XForm 故障排查表

## 常见问题速查

### 输入无反应

| 原因                                            | 诊断方法                                         | 修复                   |
| ----------------------------------------------- | ------------------------------------------------ | ---------------------- |
| `model` 不是 reactive 包装                      | console.log(model) 看是否 Proxy                  | 用 `reactive({})` 包装 |
| 节点缺 `name` 字段                              | 浏览器 devtools 看渲染的 input 是否绑 modelValue | 添加 `name: 'fieldId'` |
| dev 模式 devtools 看 input 节点 modelValue 属性 | 看是否一直是初始值                               | 同上                   |
| `name` 含特殊字符（`.` / 中文）                 | 改用简单 name 测试                               | 改用 ASCII name        |

### 校验不触发

| 原因                                    | 诊断方法                              | 修复                    |
| --------------------------------------- | ------------------------------------- | ----------------------- |
| `rules` 是字符串但未在 props.rules 注册 | devtools 看 form-item 的 `rules` prop | 配置 props.rules        |
| 字符串 rules 拼写错误                   | 同上                                  | 检查字符串是否一致      |
| 异步 validator 返回了 rejected Promise  | 看 console                            | 用 `cb(err)` 不用 throw |
| trigger 配置错误                        | 验证规则只在 blur/change 时触发       | 添加 `trigger: 'blur'`  |

### 反应式不响应

| 原因                                       | 诊断方法                              | 修复                                                |
| ------------------------------------------ | ------------------------------------- | --------------------------------------------------- |
| reaction 函数体未引用 `model`              | 在 reaction 函数中 console.log(model) | `reaction: { disabled: (m) => ... }`                |
| 字段不在 model 中                          | 检查 model key                        | 确保 name 与 model key 一致                         |
| reaction 字段值未在 dgm-formschema spec 中 | 看 README schema 字段表               | 仅用 `rules / props / label / hidden / disabled` 等 |

### directive 不生效

| 原因                         | 修复                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| directive 名未注册到 vue app | `app.directive('pin', { mounted(el) { ... } })`                                          |
| schema.directives 数组格式错 | 正确格式：`[{ directive: 'pin', arg: 'top', modifiers: { animate: true }, value: 200 }]` |

### 栅格不生效

| 原因                                           | 修复                                      |
| ---------------------------------------------- | ----------------------------------------- |
| 顶层 schema 缺 `column` / `row`                | 添加 `{ column: 2, row: { gutter: 24 } }` |
| 子节点自定义 `col: { span: 24 }` 未生效        | XForm 支持 col 字段，确认 schema 写法     |
| 视觉容器（Card）的 row/column 会被内部栅格处理 | 检查 Card 节点 schema                     |

### 样式不对

| 原因                                        | 修复                                                        |
| ------------------------------------------- | ----------------------------------------------------------- |
| 直接 import 元素 plus 组件绕过 CSS 自动注入 | XForm 内部已 import `'element-plus/dist/index.css'`，勿重复 |
| 自定义组件未注册 el-form-item 样式          | 用 components prop 显式注册                                 |

### 性能问题

| 原因                          | 修复                          |
| ----------------------------- | ----------------------------- |
| schema 改变频繁触发整树重渲染 | 用 `markRaw` 包装 schema 引用 |
| 大量字段 (> 50) 同时渲染慢    | 用虚拟滚动或分组              |
| reaction watchEffect 太多     | 合并 reaction 字段            |

## dev 模式调试

XForm 在 dev 模式自动启动 **XFormDebugBanner**（右下角黄色浮窗）：

- **schema validation failed**：显示 keyPath + message
  - 例：`(root): 缺少 component 字段` / `on.change: 事件回调必须为函数或函数表达式`
- **[SECURITY] forbidden identifiers**：黑名单（window / eval / constructor / 等）

看到 banner 后点击对应 keyPath 找到 schema 节点修复。

## 仍未解决？

1. 看 CHANGELOG.md（项目级变更）
2. 跑 `pnpm test src/components/form-schema/` 看 XForm 自身测试
3. 看 `docs/superpowers/specs/2026-08-19-form-schema-design.md`（设计文档）
4. 在项目 issue 提单
