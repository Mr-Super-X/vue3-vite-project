/**
 * 浏览器样式基线三件套（@vv/shared）。
 *
 * 原 6 app main.ts 逐字重复的三行样式 import（2026-10-23 重复性审查收敛单源）。
 * 三行内部顺序即语义契约：
 *   1. normalize.css        —— 跨浏览器默认值统一（必须在最前）
 *   2. virtual:uno.css      —— UnoCSS 按需原子类
 *   3. @assets/styles/index.scss —— 项目 SCSS 入口（物理位置在 @vv/ui 包）
 *
 * 为什么独立成模块而不并入 app-bootstrap：本模块含 `virtual:uno.css` 虚拟模块，
 * vitest 的 vite-node 对虚拟 CSS id 解析与 dev server 不同（会按文件路径解析炸
 * ERR_INVALID_ARG_VALUE）；app-bootstrap 在 barrel 里会被一切 `import '@vv/shared'`
 * 的 spec 间接加载，而本模块只被各 app main.ts 显式副作用 import（spec 从不 import
 * main），零测试暴露面。
 *
 * 消费方式（唯一合法）：各 app `main.ts` 顶部 `import '@vv/shared/app-styles'`。
 *
 * @group 应用入口：启动装配
 */
import 'normalize.css'
import 'virtual:uno.css'
import '@assets/styles/index.scss'
