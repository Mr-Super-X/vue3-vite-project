# 选型决策指南：XForm vs element-plus 原生 vs FormRender

## TL;DR

- **简单表单（< 5 字段）** → 用 element-plus 原生
- **动态 schema（来自配置/后端）** → 用 XForm
- **复杂联动 + 校验复用** → 用 XForm
- **极简 + 性能关键** → 用 element-plus 原生

## 详细对比

| 维度        | element-plus 原生 | XForm（当前项目）   | FormRender（外部） |
| ----------- | ----------------- | ------------------- | ------------------ |
| 学习曲线    | ★★★ 低            | ★★★★ 中             | ★★★★ 中            |
| 配置复杂度  | 低                | 中                  | 中                 |
| 动态 schema | 需手写 template   | ✅ 一行 JS          | ✅ 一行 JS         |
| 校验复用    | ❌ 每处重写       | ✅ props.rules 引用 | ✅ 引用            |
| 字段联动    | ❌ 需手写 watch   | ✅ reaction 函数    | ✅ 表达式          |
| 类型安全    | ★★★ IDE 提示      | ★★ 基本             | ★★★ 推导           |
| 性能        | ★★★ 原生          | ★★ 略慢（h() 渲染） | ★★                 |
| 文档        | 完整              | 完整（本文）        | 完整               |

## 决策流程图

```
需要动态 schema（配置/后端）？
├─ 是 → XForm ✅
└─ 否 → 字段是否 < 5 且结构固定？
        ├─ 是 → element-plus 原生 ✅
        └─ 否 → 需要复杂联动 / 校验复用？
                ├─ 是 → XForm ✅
                └─ 否 → 看团队偏好
```

## 何时不用 XForm

- 表单结构极简且不会变（< 5 字段）→ 原生更轻
- 性能敏感的列表编辑（> 100 字段同时渲染）→ 原生更快
- 团队不熟悉 schema DSL 概念 → 原生上手快

## 何时必须 XForm

- 字段定义在 JSON / 配置文件 / 后端接口 → 必须 XForm
- 字段联动复杂（> 3 字段互相影响）→ XForm reaction 系统
- 校验规则需要跨表单复用 → XForm props.rules
- 字段按业务规则动态显示/隐藏 → XForm hidden + reaction
