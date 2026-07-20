# Git 工作流工具链配置详解

> **文档版本**：v1.0.0 | **最后更新**：2026-07-20
> **覆盖工具**：husky 9 + commitlint 21 + commitizen 4 + cz-customizable 7 + only-allow 1

---

## 📋 工具一览

| 工具                | 版本    | 作用                       | 触发时机          |
| ------------------- | ------- | -------------------------- | ----------------- |
| **only-allow**      | ^1.2.2  | 强制只使用 pnpm            | `preinstall` 钩子 |
| **husky**           | ^9.1.7  | Git hooks 管理             | git 操作触发      |
| **lint-staged**     | ^17.0.8 | 暂存区文件检查/格式化      | pre-commit        |
| **commitlint**      | ^21.2.1 | 校验 commit message 格式   | commit-msg        |
| **commitizen**      | ^4.3.2  | 交互式生成规范 commit      | `pnpm commit`     |
| **cz-customizable** | ^7.5.4  | 自定义 commitizen 提问流程 | commitizen 调用   |

---

## 🔄 完整 Git 工作流

```
$ npm install   ← ❌ 被拦截（红色框："Use pnpm install"）
$ pnpm install  ← ✅ 通过
   ↓
git add .
   ↓
git commit -m "..."      ← 传统方式
   或
pnpm commit              ← 交互式（cz-customizable 启动问答）
   ↓
[husky pre-commit 触发]
   ├── pnpm lint-staged     ← 对暂存文件跑 eslint --fix + prettier --write
   └── pnpm type-check      ← 全项目类型检查
   ↓
[husky commit-msg 触发]
   └── pnpm exec commitlint --edit "$1"  ← 校验 Angular 规范
       ├── 拒绝：无 type 前缀、空 subject、错误 type
       └── 通过：feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert
   ↓
✅ commit 完成
```

---

## ⚙️ 配置文件

### `package.json` 关键字段

```jsonc
{
  "scripts": {
    "preinstall": "npx only-allow pnpm", // ← 拦截非 pnpm 安装
    "commit": "git add . && cz", // ← 交互式提交
    "commitlint": "commitlint --edit",
    "prepare": "husky", // ← git hooks 自动启用
  },
  "config": {
    "commitizen": {
      "path": "cz-customizable", // ← commitizen 用 cz-customizable 作 adapter
    },
  },
}
```

### `.husky/pre-commit`

```sh
# 暂存区文件先自动格式化 + ESLint fix（lint-staged 仅处理变更文件，不全库扫描）
pnpm lint-staged
# 全局类型检查（防止 lint-staged 漏掉的文件引入类型错误）
pnpm type-check
```

### `.husky/commit-msg`

```sh
pnpm exec commitlint --edit "$1"
```

> **注意**：必须用 `pnpm exec`（不要直接 `commitlint`），否则 pnpm 11 不 hoist 的 bin 找不到。

### `.husky/pre-push`

```sh
pnpm test
```

### `.commitlintrc.cjs`（commitlint 21）

```js
// commitlint 配置：基于 @commitlint/config-conventional（Angular 规范）
// type 必须在 types 列表中，subject 不超过 72 字符
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 关键：不允许空 type（commitlint 默认放过"无 type 前缀"消息，加这条才严格）
    'type-empty': [2, 'never'],
    // subject 长度限制（不含 type 前缀）
    'header-max-length': [2, 'always', 72],
    // 不强制 scope（保持灵活）
    'scope-empty': [0],
  },
}
```

**type 列表**（11 种，Angular 规范）：
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### `.cz-config.json`（commitizen 4 + cz-customizable 7）

> 📋 **配置详解**：见本文档下方「commitizen 配置详解」章节

**文件名必须是 `.cz-config.js` 或 `.cz-config.json`**（cz-customizable 默认查找名，不识别 `.czrc` 或 `.cz-config.cjs`）

### `.npmrc`（pnpm 配置）

```ini
onlyBuiltDependencies[]=esbuild
onlyBuiltDependencies[]=@parcel/watcher
shamefully-hoist=true
```

---

## 🎮 常用命令

| 命令                           | 作用                                |
| ------------------------------ | ----------------------------------- |
| `pnpm install`                 | 安装依赖（被 only-allow 强制）      |
| `git commit -m "feat: 新功能"` | 传统提交（被 commitlint 校验）      |
| `pnpm commit`                  | 交互式提交（cz-customizable 启动）  |
| `git cz`                       | commitizen 别名（同 `pnpm commit`） |
| `pnpm commitlint`              | 手动校验（默认读 COMMIT_EDITMSG）   |

---

## 🐛 故障排查

### 1. `pnpm commit` 报 "Unable to find a configuration file"

**根因**：`.cz-config.cjs` / `.czrc` 文件名不被 cz-customizable 识别

**解决**：文件名改为 `.cz-config.js` 或 `.cz-config.json`（默认查找名）

### 2. `.cz-config.js` 报 "module is not defined in ES module scope"

**根因**：`package.json` 有 `"type": "module"`，`.js` 文件强制 ESM，不能用 `module.exports`

**解决**：

- 选项 A：用 `.cz-config.json`（JSON 无此问题）
- 选项 B：移除 `"type": "module"`（破坏其他配置）
- 选项 C：fork cz-customizable 支持 ESM

**当前选择**：选项 A（`.cz-config.json`）

### 3. `pnpm exec commitlint` 报 "Command not found"

**根因**：pnpm 11 默认不 hoist `@commitlint/cli` 的 bin 到 `.bin/`

**解决**：

```bash
# .npmrc 加 shamefully-hoist=true
echo 'shamefully-hoist=true' >> .npmrc
# 重新安装
pnpm install
```

### 4. `npm install` 报 "Cannot read properties of null (reading 'matches')"

**根因**：npm 10/11 把 `package.json` 中的 `lint-staged` 等顶层字段当作依赖列表解析，arborist 解析崩溃

**解决**：把 `lint-staged` 配置移到独立文件 `.lintstagedrc.json`

### 5. only-allow 拦截提示框没出现

**检查清单**：

1. `package.json` 有 `"preinstall": "npx only-allow pnpm"` 吗？
2. 跑 `npm run preinstall` 能看到红色框吗？
3. 如果跑 `npm install` 先崩在 dependency resolution（看不到红色框），先解决 npm 解析问题（见 #4）

---

## 📝 commitizen 配置详解（`.cz-config.json`）

### 11 种 type 选项

| value      | emoji | 中文描述                       |
| ---------- | ----- | ------------------------------ |
| `feat`     | ✨    | 新功能                         |
| `fix`      | 🐛    | 修复 bug                       |
| `docs`     | 📝    | 文档变更                       |
| `chore`    | 🚀    | 对构建过程或辅助工具和库的更改 |
| `style`    | 💄    | 代码格式（不影响功能）         |
| `refactor` | ♻️    | 代码重构                       |
| `perf`     | ⚡    | 性能优化                       |
| `test`     | 🚨    | 添加、修改测试用例             |
| `build`    | 📦️    | 构建流程、外部依赖变更         |
| `ci`       | 👷    | 修改 CI 配置、脚本             |
| `revert`   | ⏪️    | 回滚 commit                    |

### 25 种 scope 选项

合并自：项目特定（api、auth、dashboard 等）+ 通用前端（views、router、components 等）+ 兜底（other、custom）

每个 scope 格式：`{ value, name: "value       (描述)" }`

完整列表见 `.cz-config.json` 文件。

### 关键配置字段

| 字段                   | 值                                    | 作用                                         |
| ---------------------- | ------------------------------------- | -------------------------------------------- |
| `allowCustomScopes`    | `true`                                | 允许自定义填写 scope                         |
| `allowBreakingChanges` | `['feat', 'fix', 'refactor', 'perf']` | 这 4 种类型会询问 breaking change            |
| `subjectLimit`         | `72`                                  | subject 字符数限制（与 commitlint 对齐）     |
| `breaklineChar`        | `"\|"`                                | body/footer 换行符                           |
| `footerPrefix`         | `"ISSUES CLOSED:"`                    | footer 前缀                                  |
| `allowTicketNumber`    | `false`                               | 不询问 ticket 编号                           |
| `messages`             | 完整中文 8 条                         | 自定义交互提示（type/scope/subject/body 等） |

---

## 🔗 相关文档

- 设计：`docs/superpowers/specs/2026-07-17-vue3-vite-tscaffold-design.md` §3.2 决策记录
- 计划：`docs/superpowers/plans/2026-07-17-vue3-vite-tscaffold.md`
- 代码质量：`docs/02-代码质量工具链.md`
- 工具兼容性踩坑：`docs/01-工具兼容性问题踩坑记录.md`
- commitlint 官方：https://github.com/conventional-changelog/commitlint
- cz-customizable 官方：https://github.com/leonardoanalista/cz-customizable
