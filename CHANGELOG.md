# Changelog

## Unreleased

### Added

- 新增 `docs/01-工具兼容性问题踩坑记录.md`：项目级工具兼容性知识库，记录 npm vs pnpm 符号链接不兼容等问题的根因、复现步骤与解决方案

## v1.0.0 - 2026-07-17

### Added
- 初始化 Vue 3 + Vite 8 + TS 6 脚手架（基于 create-vue 改造）
- Feature-Sliced 风格目录结构
- Element Plus 2.14 + UnoCSS 66 + Vue I18n 11
- Pinia 3 全局状态（仅跨模块共享）+ 模块私有 store
- Vue Router 5 + 路由守卫 + 模块懒加载
- Axios 实例 + 拦截器 + 错误归一化
- vite-plugin-mock + auth/user/dashboard 模块
- Vitest 4 + 单测（utils/useRequest/AsyncState 共 6 文件）
- 三态异步组件 AsyncState
- ErrorBoundary 全局错误兜底
- 模块边界铁律（spec §5）

### Tech
- Node.js >= 22.18 或 >= 24.12
- pnpm >= 11.x
- TypeScript strict 模式